import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Loader2, MapPin, MapPinOff, Sprout } from "lucide-react";


import DashboardToolbar from "../components/DashboardToolbar";
import KpiSummaryStrip from "../components/KpiSummaryStrip";
import FilterControls from "../components/FilterControls";
import AgronomicAnalytics from "../components/AgronomicAnalytics";
import SpatialMap from "../components/SpatialMap";
import DataTable from "../components/DataTable";
import RehabRecommendationModal from "../components/RehabRecommendationModal";
import MobileNavigation, { MOBILE_VIEWS } from "../components/MobileNavigation";
import { Button } from "../components/ui/button";
import Toast from "../components/ui/toast";

import { fetchSoilRecords } from "../api/client";
import { METRICS, buildDefaultFilters, getMetricConfig } from "../constants/metrics";
import {
  generateAgronomicRecommendations,
  computeSoilHealthScore,
  getHealthScoreBand,
} from "../utils/agronomicRules";
import { formatDistance } from "../utils/geoUtils";
import { formatMetricValue } from "../constants/metrics";

const DEFAULT_VIEW_STATE = {
  longitude: 34.72,
  latitude: -0.07,
  zoom: 10.2,
};

/**
 * DiagnosticInlinePanel
 * Persistent (non-dismissible) rendering of the agronomic diagnostic
 * used exclusively for the mobile "Soil Diagnostic" tab, so the
 * report stays visible while the user scrolls, rather than living
 * only inside the transient overlay drawer.
 */
function DiagnosticInlinePanel({ diagnostic, onGoToMap }) {
  if (!diagnostic) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-sm border border-border bg-surface px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sprout className="h-6 w-6" />
        </div>
        <h3 className="text-[13px] font-semibold text-foreground">No Diagnostic Yet</h3>
        <p className="max-w-[240px] text-[11px] text-muted-foreground">
          Switch to Map View and use "Use My Location" or "Drop Location Pin" to generate an
          agronomic rehabilitation report for any coordinate.
        </p>
        <Button size="sm" onClick={onGoToMap}>
          <MapPin className="h-3.5 w-3.5" />
          Go to Map View
        </Button>
      </div>
    );
  }

  const { coordinates, nearestSample, distanceKm, outOfBounds } = diagnostic;

  if (outOfBounds) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-sm border border-orange-200 bg-orange-50 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <MapPinOff className="h-6 w-6" />
        </div>
        <h3 className="text-[14px] font-semibold text-foreground">Out of Regional Data Coverage</h3>
        <p className="max-w-[300px] text-[12px] leading-relaxed text-muted-foreground">
          The selected location is outside the Kisumu regional pilot area. Agronomic
          recommendations and nearest-neighbor calculations are restricted to available regional
          soil datasets.
        </p>
        <Button size="sm" onClick={onGoToMap}>
          <MapPin className="h-3.5 w-3.5" />
          Reset Pin to Kisumu Region
        </Button>
      </div>
    );
  }

  const recommendations = generateAgronomicRecommendations(nearestSample);
  const healthScore = computeSoilHealthScore(nearestSample);
  const scoreBand = getHealthScoreBand(healthScore);

  const scoreToneClasses = {
    good: "text-primary bg-primary/10 border-primary/20",
    medium: "text-warning bg-warning/10 border-warning/20",
    high: "text-destructive bg-destructive/10 border-destructive/20",
    neutral: "text-muted-foreground bg-slate-100 border-border",
  };

  return (

    <div className="flex flex-col gap-3 pb-4">
      <div className="rounded-sm border border-border bg-slate-50 px-3.5 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Selected Coordinates
        </span>
        <p className="text-[13px] font-semibold text-foreground">
          {coordinates ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}` : "—"}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3.5 py-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Nearest Verified Sample
          </span>
          <span className="text-[13px] font-semibold text-foreground">
            {nearestSample ? nearestSample.lab_id : "No sample found"}
          </span>
        </div>
        <span className="rounded-sm border border-border bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-foreground">
          {formatDistance(distanceKm)}
        </span>
      </div>

      <div
        className={`flex items-center justify-between rounded-sm border px-3.5 py-3 ${scoreToneClasses[scoreBand.tone]}`}
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            Soil Health Score
          </span>
          <span className="text-[11px] font-medium">{scoreBand.label}</span>
        </div>
        <span className="tabular text-2xl font-bold leading-none">
          {healthScore !== null ? healthScore : "—"}
          <span className="ml-1 text-xs font-normal opacity-70">/100</span>
        </span>
      </div>

      <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-foreground">
        Agronomic Rehabilitation Recommendations
      </h3>
      <div className="flex flex-col gap-2.5">
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className="relative overflow-hidden rounded-sm border border-border bg-surface pl-3"
            >
              <span
                className={`absolute left-0 top-0 h-full w-1 ${
                  rec.severity === "high"
                    ? "bg-destructive"
                    : rec.severity === "medium"
                    ? "bg-warning"
                    : "bg-primary"
                }`}
              />
              <div className="py-3 pr-3">
                <h4 className="text-[12px] font-semibold text-foreground">
                  {rec.title}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({rec.label}: {formatMetricValue(rec.value, 2)})
                  </span>
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{rec.message}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-sm border border-border bg-slate-50 px-3 py-4 text-center text-[11px] text-muted-foreground">
            No verified sample data available for this location.
          </p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const mapRef = useRef(null);

  const [allRecords, setAllRecords] = useState([]);
  const [filters, setFilters] = useState(buildDefaultFilters());
  const [selectedSample, setSelectedSample] = useState(null);
  const [colorMetricKey] = useState("ph");
  const [activeToggle, setActiveToggle] = useState(null);
  const [loadState, setLoadState] = useState({ loading: true, error: null });
  const [viewState, setViewState] = useState(DEFAULT_VIEW_STATE);

  // Mobile bottom-navigation active view (Map / Analytics & Grid / Soil Diagnostic).
  const [mobileView, setMobileView] = useState(MOBILE_VIEWS.MAP);

  // Location Diagnostic & Rehabilitation Drawer state — populated by
  // SpatialMap's "Use My Location" / "Drop Location Pin" workflows.
  const [diagnostic, setDiagnostic] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Incremented whenever the user resets an out-of-coverage pin back
  // to the Kisumu region — SpatialMap watches this to clear its
  // dropped-pin marker in sync with the view state recentering.
  const [resetPinToken, setResetPinToken] = useState(0);

  // Transient "Location out of range" toast — surfaced whenever the
  // backend's /api/v1/soil-score endpoint rejects a dropped-pin/GPS
  // coordinate as falling in Lake Victoria or outside the Kisumu
  // supported region (see SpatialMap's onOutOfBoundsError callback).
  const [outOfBoundsToast, setOutOfBoundsToast] = useState(null);

  const handleOutOfBoundsError = useCallback((message) => {
    setOutOfBoundsToast(message || "Location out of range.");
  }, []);

  useEffect(() => {
    if (!outOfBoundsToast) return;
    const timer = setTimeout(() => setOutOfBoundsToast(null), 5000);
    return () => clearTimeout(timer);
  }, [outOfBoundsToast]);


  useEffect(() => {
    let isMounted = true;
    setLoadState({ loading: true, error: null });

    fetchSoilRecords()
      .then((records) => {
        if (isMounted) {
          setAllRecords(records);
          setLoadState({ loading: false, error: null });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadState({ loading: false, error: error.message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFilterChange = useCallback((metricKey, range) => {
    setActiveToggle(null);
    setFilters((prev) => ({ ...prev, [metricKey]: range }));
  }, []);

  const handleQuickToggle = useCallback(
    (toggle) => {
      const isActive = activeToggle === toggle.key;
      const metric = getMetricConfig(toggle.metric);

      setActiveToggle(isActive ? null : toggle.key);
      setFilters((prev) => ({
        ...prev,
        [toggle.metric]: isActive ? { min: metric.min, max: metric.max } : toggle.range,
      }));
    },
    [activeToggle]
  );

  const handleResetFilters = useCallback(() => {
    setFilters(buildDefaultFilters());
    setSelectedSample(null);
    setActiveToggle(null);
  }, []);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) =>
      METRICS.every((metric) => {
        const bound = filters[metric.key];
        const value = record[metric.key];
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
          return true;
        }
        return Number(value) >= bound.min && Number(value) <= bound.max;
      })
    );
  }, [allRecords, filters]);

  const validSamples = useMemo(
    () =>
      filteredRecords.filter(
        (row) =>
          row.latitude !== null &&
          row.latitude !== undefined &&
          !Number.isNaN(Number(row.latitude)) &&
          row.longitude !== null &&
          row.longitude !== undefined &&
          !Number.isNaN(Number(row.longitude))
      ),
    [filteredRecords]
  );

  const colorMetricConfig = useMemo(() => getMetricConfig(colorMetricKey), [colorMetricKey]);
  const selectedLabId = selectedSample ? selectedSample.lab_id : null;

  const handleRowSelect = useCallback((row) => {
    setSelectedSample((prev) => (prev && prev.lab_id === row.lab_id ? null : row));
    if (row.longitude && row.latitude) {
      setViewState((prev) => ({
        ...prev,
        longitude: Number(row.longitude),
        latitude: Number(row.latitude),
        zoom: Math.max(prev.zoom, 13),
      }));
    }
  }, []);

  const handleLocationDiagnostic = useCallback((payload) => {
    setDiagnostic(payload);
    setIsDrawerOpen(true);
  }, []);

  const handleResetToKisumu = useCallback(() => {
    setViewState(DEFAULT_VIEW_STATE);
    setResetPinToken((prev) => prev + 1);
    setIsDrawerOpen(false);
    setDiagnostic(null);
  }, []);


  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <DashboardToolbar
        onResetFilters={handleResetFilters}
        recordCount={filteredRecords.length}
        totalCount={allRecords.length}
      />

      <KpiSummaryStrip records={filteredRecords} />

      {/* ============ DESKTOP / TABLET LARGE (>=1024px): split-screen ============ */}
      <div className="hidden flex-1 gap-3 overflow-hidden p-3 lg:flex lg:p-4">
        {/* Left Panel — 40% width: filters + breakdown analytics */}
        <div className="flex w-full max-w-[40%] flex-col gap-3 overflow-y-auto">
          <div style={{ height: 320 }} className="shrink-0">
            <FilterControls
              filters={filters}
              onFilterChange={handleFilterChange}
              onQuickToggle={handleQuickToggle}
              activeToggle={activeToggle}
            />
          </div>
          <AgronomicAnalytics records={filteredRecords} />
        </div>

        {/* Right Panel — 60% width: spatial map + synchronized table */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex-1 overflow-hidden" style={{ minHeight: 260 }}>
            <SpatialMap
              mapRef={mapRef}
              viewState={viewState}
              onViewStateChange={setViewState}
              samples={validSamples}
              selectedSample={selectedSample}
              selectedLabId={selectedLabId}
              onSelectSample={setSelectedSample}
              colorMetricKey={colorMetricKey}
              colorMetricConfig={colorMetricConfig}
              onLocationDiagnostic={handleLocationDiagnostic}
              resetPinSignal={resetPinToken}
              onOutOfBoundsError={handleOutOfBoundsError}
            />
          </div>
          <div style={{ height: 260 }} className="shrink-0 overflow-hidden">

            <DataTable
              records={filteredRecords}
              selectedLabId={selectedLabId}
              onRowSelect={handleRowSelect}
            />
          </div>
        </div>
      </div>

      {/* ============ MOBILE / TABLET (<1024px): single tab view + bottom nav ============ */}
      <div className="flex flex-1 flex-col overflow-hidden pb-[60px] lg:hidden">
        {mobileView === MOBILE_VIEWS.MAP ? (
          <div className="flex-1 overflow-hidden p-2.5">
            <SpatialMap
              mapRef={mapRef}
              viewState={viewState}
              onViewStateChange={setViewState}
              samples={validSamples}
              selectedSample={selectedSample}
              selectedLabId={selectedLabId}
              onSelectSample={setSelectedSample}
              colorMetricKey={colorMetricKey}
              colorMetricConfig={colorMetricConfig}
              onLocationDiagnostic={handleLocationDiagnostic}
              resetPinSignal={resetPinToken}
              onOutOfBoundsError={handleOutOfBoundsError}
            />
          </div>
        ) : null}

        {mobileView === MOBILE_VIEWS.ANALYTICS ? (

          <div className="flex-1 overflow-y-auto p-2.5">
            <div className="flex flex-col gap-3">
              <div style={{ height: 340 }} className="shrink-0">
                <FilterControls
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onQuickToggle={handleQuickToggle}
                  activeToggle={activeToggle}
                />
              </div>
              <AgronomicAnalytics records={filteredRecords} />
              <div style={{ height: 300 }} className="shrink-0 overflow-hidden">
                <DataTable
                  records={filteredRecords}
                  selectedLabId={selectedLabId}
                  onRowSelect={handleRowSelect}
                />
              </div>
            </div>
          </div>
        ) : null}

        {mobileView === MOBILE_VIEWS.DIAGNOSTIC ? (
          <div className="flex-1 overflow-y-auto p-2.5">
            <DiagnosticInlinePanel
              diagnostic={diagnostic}
              onGoToMap={() => setMobileView(MOBILE_VIEWS.MAP)}
            />
          </div>
        ) : null}
      </div>

      <MobileNavigation activeView={mobileView} onChangeView={setMobileView} />

      <RehabRecommendationModal
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        coordinates={diagnostic?.coordinates}
        nearestSample={diagnostic?.nearestSample}
        distanceKm={diagnostic?.distanceKm}
        outOfBounds={Boolean(diagnostic?.outOfBounds)}
        onResetToKisumu={handleResetToKisumu}
      />

      <Toast message={outOfBoundsToast} onDismiss={() => setOutOfBoundsToast(null)} />

      {loadState.loading ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80">
          <div className="flex items-center gap-3 rounded-sm border border-border bg-surface px-6 py-4 shadow-card">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Loading soil sample records
            </span>
          </div>
        </div>
      ) : null}

      {loadState.error ? (
        <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-sm border border-destructive/30 bg-red-50 px-4 py-2.5 text-xs text-destructive">
          Failed to load soil records: {loadState.error}
        </div>
      ) : null}
    </div>
  );
}
