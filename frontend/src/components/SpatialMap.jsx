import { useCallback, useEffect, useState } from "react";

import maplibregl from "maplibre-gl";
import Map, { Marker, Popup, NavigationControl, Source, Layer } from "react-map-gl/maplibre";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { Crosshair, MapPin, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { getMetricColor } from "../utils/colorScale";
import { formatMetricValue } from "../constants/metrics";
import { findNearestSample, isWithinKisumuCoverage } from "../utils/geoUtils";

const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";

// Continuous "weather-map-style" soil health interpolation overlay —
// a pre-computed PMTiles archive (see backend/scripts/
// generate_soil_grid.py + tippecanoe, served statically with HTTP
// Range Request support by FastAPI — backend/app/main.py) rather than
// the 92 discrete sample markers rendered elsewhere in this component.
// Falls back to the backend's own static /tiles mount when no
// dedicated override is configured.
const SOIL_HEALTH_PMTILES_URL =
  import.meta.env.VITE_SOIL_HEALTH_PMTILES_URL ||
  `${import.meta.env.VITE_API_BASE_URL || ""}/tiles/soil-health.pmtiles`;

// The vector tile "source-layer" name baked into the archive by the
// `-l soil_health` tippecanoe flag — must match exactly.
const SOIL_HEALTH_SOURCE_LAYER = "soil_health";

// Registering MapLibre's "pmtiles://" protocol handler must happen once,
// at module scope, before any Map instance is constructed — mirrors the
// canonical pmtiles + MapLibre GL JS integration pattern.
const pmtilesProtocol = new Protocol();
maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);

// Data-driven fill-color gradient for the interpolated soil_health_score
// property (0-100), matching the same red -> amber -> green semantics as
// the discrete marker palette in ../utils/colorScale.js (deficient/poor
// -> moderate -> optimal/excellent).
const SOIL_HEALTH_FILL_COLOR = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "soil_health_score"], 0],
  0, "#B91C1C", // poor — deficient/alert red
  45, "#B45309", // moderate — amber
  70, "#65A30D", // improving — olive-green transition
  100, "#15803D", // excellent — soil-health green
];

/**
 * applyPremiumLightStyling
 * Best-effort paint-property overrides applied once the MapLibre
 * style has finished loading, nudging the free OpenFreeMap vector
 * basemap toward Mapbox's signature `light-v11` palette: soft slate
 * water, near-white landmass, and thin muted road/border linework.
 * Wrapped defensively per-layer since exact layer IDs vary across
 * vector style sources — any unsupported layer is silently skipped.
 */
function applyPremiumLightStyling(map) {
  try {
    const layers = map.getStyle()?.layers || [];

    layers.forEach((layer) => {
      const id = layer.id.toLowerCase();
      try {
        if (layer.type === "background") {
          map.setPaintProperty(layer.id, "background-color", "#F8FAFC");
        } else if (layer.type === "fill" && id.includes("water")) {
          map.setPaintProperty(layer.id, "fill-color", "#E2E8F0");
        } else if (
          layer.type === "fill" &&
          (id.includes("land") || id.includes("park") || id.includes("landuse") || id.includes("landcover"))
        ) {
          map.setPaintProperty(layer.id, "fill-color", "#F8FAFC");
        } else if (
          layer.type === "line" &&
          (id.includes("road") || id.includes("highway") || id.includes("street") || id.includes("transportation"))
        ) {
          map.setPaintProperty(layer.id, "line-color", "#CBD5E1");
          map.setPaintProperty(layer.id, "line-opacity", 0.9);
        } else if (layer.type === "line" && (id.includes("boundary") || id.includes("border"))) {
          map.setPaintProperty(layer.id, "line-color", "#CBD5E1");
        } else if (layer.type === "symbol" && layer.layout && layer.layout["text-field"]) {
          map.setPaintProperty(layer.id, "text-color", "#334155");
          map.setPaintProperty(layer.id, "text-halo-color", "#FFFFFF");
          map.setPaintProperty(layer.id, "text-halo-width", 1.2);
        }
      } catch {
        // Layer does not support this paint property — skip silently.
      }
    });
  } catch {
    // Style not yet introspectable; skip premium overrides for this load.
  }
}

/**
 * SpatialMap
 * Interactive, high-contrast light-mode spatial map powered by MapLibre GL JS
 * and the free OpenFreeMap "Positron" vector style (zero API keys, no
 * per-request billing — safe for large-scale public sector deployments),
 * with paint-property overrides applied on load to approximate Mapbox's
 * `light-v11` aesthetic (soft slate water, near-white landmass, thin muted
 * roads/borders, clean sans-serif labels).
 * Marker rings are crisp and color-coded to the selected soil health metric
 * (green = optimal, amber = moderate deviation, red = deficient/excess).
 * Clicking a marker instantly synchronizes the selected sample with the data
 * table and analytics (no debounce, no layout shift).
 *
 * Also supports two field-diagnostic workflows, both constrained to the
 * Kisumu County Data Coverage envelope (bounding box + 45km centroid
 * radius cap defined in geoUtils.js):
 *  - "Use My Location" — resolves the device GPS position via
 *    navigator.geolocation and runs a nearest-neighbor lookup against
 *    the regional dataset if within coverage.
 *  - "Drop Location Pin" — arms a click-to-place mode; the next click
 *    anywhere on the MapLibre canvas drops a pin at that arbitrary
 *    coordinate and runs the same coverage check + nearest-neighbor lookup.
 * Coordinates outside the coverage envelope render an orange "out of
 * coverage" pin and surface an OUT_OF_BOUNDS diagnostic payload so the
 * parent view can present the Rehabilitation Drawer in its restricted state.
 *
 * A dedicated Fullscreen Toggle expands the map container to
 * `fixed inset-0 z-50 w-screen h-screen`, independent of MapLibre's
 * native FullscreenControl, to guarantee consistent light-mode chrome
 * and 44px+ tap targets across desktop and mobile.
 */
export default function SpatialMap({
  viewState,
  onViewStateChange,
  samples,
  selectedSample,
  selectedLabId,
  onSelectSample,
  colorMetricKey,
  colorMetricConfig,
  mapRef,
  onLocationDiagnostic,
  resetPinSignal,
}) {
  const [pinMode, setPinMode] = useState(false);
  const [droppedPin, setDroppedPin] = useState(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // First label/symbol layer id in the active basemap style — the
  // soil health fill overlay is inserted immediately before it via
  // `beforeId` so city names/road labels always render cleanly on top
  // of the continuous "weather-map-style" interpolation surface.
  const [firstSymbolLayerId, setFirstSymbolLayerId] = useState(undefined);

  const runDiagnostic = useCallback(
    (lat, lng) => {
      const withinCoverage = isWithinKisumuCoverage(lat, lng);
      setDroppedPin({ lat, lng, outOfBounds: !withinCoverage });

      if (!onLocationDiagnostic) return;

      if (!withinCoverage) {
        onLocationDiagnostic({
          coordinates: { lat, lng },
          nearestSample: null,
          distanceKm: null,
          outOfBounds: true,
        });
        return;
      }

      const result = findNearestSample(samples, lat, lng);
      onLocationDiagnostic({
        coordinates: { lat, lng },
        nearestSample: result ? result.sample : null,
        distanceKm: result ? result.distanceKm : null,
        outOfBounds: false,
      });
    },
    [samples, onLocationDiagnostic]
  );

  const handleMapClick = useCallback(
    (event) => {
      if (!pinMode) return;
      const { lat, lng } = event.lngLat;
      runDiagnostic(lat, lng);
      setPinMode(false);
    },
    [pinMode, runDiagnostic]
  );

  const handleUseMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported on this device.");
      return;
    }

    setLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onViewStateChange({
          ...viewState,
          longitude,
          latitude,
          zoom: Math.max(viewState.zoom, 13),
        });
        runDiagnostic(latitude, longitude);
        setLocating(false);
      },
      () => {
        setGeoError("Unable to resolve your location. Check location permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [viewState, onViewStateChange, runDiagnostic]);

  const handleMapLoad = useCallback((event) => {
    const map = event.target;
    applyPremiumLightStyling(map);

    // Locate the first symbol (label) layer in the loaded style so the
    // soil health overlay can be inserted directly beneath it — this
    // keeps road/place-name labels crisply legible above the fill,
    // exactly like a professional weather-radar overlay.
    const symbolLayer = (map.getStyle()?.layers || []).find((layer) => layer.type === "symbol");
    setFirstSymbolLayerId(symbolLayer?.id);
  }, []);

  // Clears the dropped pin whenever the parent issues a reset signal
  // (e.g. the "Reset Pin to Kisumu Region" action in the out-of-bounds
  // Rehabilitation Drawer state).
  useEffect(() => {
    if (resetPinSignal === undefined || resetPinSignal === null) return;
    setDroppedPin(null);
    setGeoError(null);
  }, [resetPinSignal]);


  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-surface"
          : "relative h-full w-full overflow-hidden rounded-sm border border-border"
      }
    >
      {/* Field-diagnostic action bar */}
      <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1.5 sm:flex-row">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="flex h-11 min-w-[44px] items-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-[11px] font-medium text-foreground shadow-card transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Crosshair className="h-4 w-4 text-primary" />
          )}
          <span className="hidden sm:inline">Use My Location</span>
        </button>

        <button
          type="button"
          onClick={() => setPinMode((prev) => !prev)}
          className={`flex h-11 min-w-[44px] items-center gap-1.5 rounded-sm border px-3 text-[11px] font-medium shadow-card transition-colors ${
            pinMode
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-foreground hover:bg-slate-50"
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline">{pinMode ? "Click Map to Drop Pin…" : "Drop Location Pin"}</span>
        </button>
      </div>

      {/* Fullscreen toggle — liquid glass pill, cleanly offset from
          MapLibre's built-in NavigationControl (top-right zoom +/-)
          to prevent overlay collision. */}
      <div className="absolute right-14 top-3 z-10">
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          aria-label={isFullscreen ? "Exit fullscreen map" : "Expand map to fullscreen"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur-md transition-all duration-150 hover:bg-white/95 hover:shadow-md active:scale-95"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>


      {geoError ? (
        <div className="absolute left-2.5 top-[62px] z-10 max-w-[260px] rounded-sm border border-destructive/30 bg-red-50 px-3 py-2 text-[11px] text-destructive shadow-card sm:top-16">
          {geoError}
        </div>
      ) : null}

      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => onViewStateChange(evt.viewState)}
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        mapStyle={MAP_STYLE_URL}
        style={{ width: "100%", height: "100%", cursor: pinMode ? "crosshair" : undefined }}
        cursor={pinMode ? "crosshair" : "grab"}
      >
        <NavigationControl position="top-right" />

        {/* Continuous "weather-map-style" soil health interpolation
            overlay — a pre-computed PMTiles archive rendered as a
            translucent, data-driven fill so the estimated soil
            condition between the 92 discrete sample points is visible
            at a glance, without hiding the underlying OpenFreeMap
            roads/terrain. `beforeId` pins this fill directly below the
            basemap's first label layer so text/road labels stay
            legible on top. */}
        <Source id="soil-health" type="vector" url={`pmtiles://${SOIL_HEALTH_PMTILES_URL}`}>
          <Layer
            id="soil-health-fill"
            type="fill"
            source-layer={SOIL_HEALTH_SOURCE_LAYER}
            beforeId={firstSymbolLayerId}
            paint={{
              "fill-color": SOIL_HEALTH_FILL_COLOR,
              "fill-opacity": 0.55,
              "fill-antialias": true,
            }}
          />
        </Source>

        {samples.map((sample) => {
          const isSelected = String(sample.lab_id) === String(selectedLabId);
          const value = sample[colorMetricKey];
          const color = getMetricColor(colorMetricConfig, value);

          return (
            <Marker
              key={sample.lab_id}
              longitude={Number(sample.longitude)}
              latitude={Number(sample.latitude)}
              anchor="center"
              onClick={(event) => {
                event.originalEvent.stopPropagation();
                onSelectSample(sample);
              }}
            >
              <div
                className="cursor-pointer rounded-full transition-all duration-150"
                style={{
                  width: isSelected ? 16 : 10,
                  height: isSelected ? 16 : 10,
                  backgroundColor: color,
                  border: isSelected ? "2.5px solid #0F172A" : "1.5px solid #FFFFFF",
                  boxShadow: isSelected
                    ? "0 0 0 3px rgba(15,23,42,0.12)"
                    : "0 1px 3px rgba(15,23,42,0.25)",
                }}
              />
            </Marker>
          );
        })}

        {droppedPin ? (
          <Marker longitude={droppedPin.lng} latitude={droppedPin.lat} anchor="bottom">
            <MapPin
              className={`h-8 w-8 drop-shadow-md ${
                droppedPin.outOfBounds ? "text-orange-500" : "text-primary"
              }`}
              fill={droppedPin.outOfBounds ? "#FFEDD5" : "#ECFDF5"}
              strokeWidth={2}
            />
          </Marker>
        ) : null}

        {selectedSample ? (
          <Popup
            longitude={Number(selectedSample.longitude)}
            latitude={Number(selectedSample.latitude)}
            anchor="top"
            onClose={() => onSelectSample(null)}
            closeOnClick={false}
          >
            <div className="min-w-[160px] text-xs text-foreground">
              <p className="mb-1 border-b border-border pb-1 font-semibold text-foreground">
                {selectedSample.field_ref}
              </p>
              <p className="text-muted-foreground">
                Lab ID: <span className="font-medium text-foreground">{selectedSample.lab_id}</span>
              </p>
              <p className="text-muted-foreground">
                {colorMetricConfig.label}:{" "}
                <span className="font-medium text-foreground">
                  {formatMetricValue(selectedSample[colorMetricKey], colorMetricConfig.precision)}{" "}
                  {colorMetricConfig.unit}
                </span>
              </p>
            </div>
          </Popup>
        ) : null}
      </Map>
    </div>
  );
}
