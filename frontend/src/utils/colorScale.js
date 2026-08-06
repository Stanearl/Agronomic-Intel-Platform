// Converts a raw metric reading into a crisp, light-mode institutional
// color reflecting how far the value sits from its agronomically
// optimal band. Optimal band renders soil-health green (#15803D).
// Values that drift away from the band interpolate toward the
// deficient/alert red (#B91C1C), passing through amber for
// moderate deviation.

const RED = [185, 28, 28]; // #B91C1C
const AMBER = [180, 83, 9]; // #B45309
const GREEN = [21, 128, 61]; // #15803D
const NEUTRAL = [148, 163, 184]; // slate-400 fallback for missing data

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function mixChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function mixColor(colorA, colorB, t) {
  return colorA.map((channel, index) => mixChannel(channel, colorB[index], t));
}

function toHex(rgb) {
  return (
    "#" +
    rgb
      .map((channel) => clamp(channel, 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function getMetricColor(metricConfig, value) {
  if (!metricConfig || value === null || value === undefined || Number.isNaN(value)) {
    return toHex(NEUTRAL);
  }

  const { min, max, optimalMin, optimalMax } = metricConfig;

  if (value >= optimalMin && value <= optimalMax) {
    return toHex(GREEN);
  }

  if (value < optimalMin) {
    const span = optimalMin - min || 1;
    const t = clamp((optimalMin - value) / span, 0, 1);
    return t < 0.5
      ? toHex(mixColor(GREEN, AMBER, t * 2))
      : toHex(mixColor(AMBER, RED, (t - 0.5) * 2));
  }

  const span = max - optimalMax || 1;
  const t = clamp((value - optimalMax) / span, 0, 1);
  return t < 0.5
    ? toHex(mixColor(GREEN, AMBER, t * 2))
    : toHex(mixColor(AMBER, RED, (t - 0.5) * 2));
}

export function getLegendGradientCss() {
  return `linear-gradient(to right, ${toHex(RED)} 0%, ${toHex(AMBER)} 50%, ${toHex(GREEN)} 100%)`;
}
