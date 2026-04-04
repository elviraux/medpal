import type { MedicationType, DeliveryType, Frequency, MedicationLog } from '@/store/types';

// ---------------------------------------------------------------------------
// Pharmacokinetic parameters by medication
// ---------------------------------------------------------------------------

interface PkParams {
  /** Elimination half-life in hours */
  halfLifeHours: number;
  /** Time to peak concentration in hours */
  tmaxHours: number;
}

/** Look up PK parameters for a given medication and delivery type */
export function getPkParams(
  medication?: MedicationType,
  deliveryType?: DeliveryType
): PkParams {
  // Oral semaglutide (Rybelsus) has different bioavailability
  if (deliveryType === 'pill') {
    return { halfLifeHours: 168, tmaxHours: 1 };
  }

  switch (medication) {
    case 'Mounjaro':
    case 'Zepbound':
    case 'Tirzepatide':
      return { halfLifeHours: 120, tmaxHours: 48 };

    case 'Ozempic':
    case 'Wegovy':
    case 'Semaglutide':
    default:
      // Default/unknown: use semaglutide parameters
      return { halfLifeHours: 168, tmaxHours: 72 };
  }
}

// ---------------------------------------------------------------------------
// One-compartment PK model with first-order absorption & elimination
// ---------------------------------------------------------------------------
// C(t) = (F · Dose · Ka) / (Vd · (Ka - Ke)) · (e^(-Ke·t) - e^(-Ka·t))
//
// We normalize so that F·Dose/Vd = 1 (we only care about relative %).
// Ka = ln(2) * Ka_factor / Tmax  (absorption rate constant)
// Ke = ln(2) / halfLife           (elimination rate constant)
// ---------------------------------------------------------------------------

const LN2 = Math.LN2;

/**
 * Compute the absorption rate constant Ka from Tmax and Ke.
 * At Tmax, dC/dt = 0  →  Ka = Ke · e^((Ka-Ke)·Tmax) ... solved numerically
 * Approximation: Ka ≈ ln(2) / (Tmax × 0.4) gives a good shape.
 * We use the analytical relationship: Tmax = ln(Ka/Ke) / (Ka - Ke)
 * and solve iteratively.
 */
function computeKa(ke: number, tmaxHours: number): number {
  // Newton's method: find Ka such that Tmax = ln(Ka/Ke)/(Ka-Ke)
  let ka = 3 * ke; // initial guess
  for (let i = 0; i < 20; i++) {
    const diff = ka - ke;
    if (Math.abs(diff) < 1e-12) {
      ka = ke + 0.001;
      continue;
    }
    const f = Math.log(ka / ke) / diff - tmaxHours;
    // derivative of f w.r.t. ka
    const df = (1 / (ka * diff) - Math.log(ka / ke) / (diff * diff));
    const step = f / df;
    ka = ka - step;
    if (ka <= ke) ka = ke + 0.001; // keep Ka > Ke
    if (Math.abs(step) < 1e-10) break;
  }
  return ka;
}

/** Single-dose concentration at time t hours after dose (normalized, unitless) */
function singleDoseConcentration(tHours: number, ka: number, ke: number): number {
  if (tHours <= 0) return 0;
  const denom = ka - ke;
  if (Math.abs(denom) < 1e-12) return 0;
  return (ka / denom) * (Math.exp(-ke * tHours) - Math.exp(-ka * tHours));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PkCurvePoint {
  /** Hours since the start of the current dosing cycle */
  hourInCycle: number;
  /** Normalized concentration 0–1 (where 1 = peak steady-state) */
  level: number;
}

export interface PkResult {
  /** Smooth curve points for the current dosing cycle */
  curve: PkCurvePoint[];
  /** Current estimated level 0–100 */
  currentLevelPct: number;
  /** Hours into the current cycle the user is right now */
  currentHourInCycle: number;
  /** Total cycle length in hours */
  cycleLengthHours: number;
  /** Days since last dose */
  daysSinceLastDose: number;
  /** Days until next dose (can be negative if overdue) */
  daysUntilNextDose: number;
}

/**
 * Parse a MedicationLog entry into a timestamp (ms since epoch).
 * Combines the log's date (YYYY-MM-DD) and time (HH:MM).
 */
function logToTimestamp(log: MedicationLog): number {
  const [y, mo, d] = log.date.split('-').map(Number);
  const [h, mi] = log.time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi).getTime();
}

/** Get the dosing interval in hours from a Frequency type */
function frequencyToHours(freq?: Frequency): number {
  switch (freq) {
    case 'daily': return 24;
    case 'every_14_days': return 14 * 24;
    case 'every_7_days':
    default: return 7 * 24;
  }
}

/**
 * Compute the real PK model result for the dashboard chart.
 *
 * Sums contributions from ALL logged doses (steady-state accumulation)
 * and generates a smooth curve for the current dosing cycle.
 */
export function computePkModel(
  medicationLogs: MedicationLog[],
  medication?: MedicationType,
  deliveryType?: DeliveryType,
  frequency?: Frequency,
): PkResult {
  const params = getPkParams(medication, deliveryType);
  const ke = LN2 / params.halfLifeHours;
  const ka = computeKa(ke, params.tmaxHours);
  const cycleHours = frequencyToHours(frequency);
  const now = Date.now();

  // Sort logs oldest-first for accumulation
  const sortedLogs = [...medicationLogs]
    .map((l) => ({ ...l, ts: logToTimestamp(l) }))
    .sort((a, b) => a.ts - b.ts);

  if (sortedLogs.length === 0) {
    return {
      curve: [],
      currentLevelPct: 0,
      currentHourInCycle: 0,
      cycleLengthHours: cycleHours,
      daysSinceLastDose: 0,
      daysUntilNextDose: 0,
    };
  }

  const lastDoseTs = sortedLogs[sortedLogs.length - 1].ts;
  const hoursSinceLastDose = (now - lastDoseTs) / (1000 * 60 * 60);
  const daysSinceLastDose = hoursSinceLastDose / 24;
  const daysUntilNextDose = (cycleHours - hoursSinceLastDose) / 24;

  // --- Compute superimposed concentration at an arbitrary absolute time ---
  function concentrationAtTime(absTimeMs: number): number {
    let total = 0;
    for (const log of sortedLogs) {
      const tHours = (absTimeMs - log.ts) / (1000 * 60 * 60);
      if (tHours > 0) {
        total += singleDoseConcentration(tHours, ka, ke);
      }
    }
    return total;
  }

  // --- Find peak steady-state for normalization ---
  // Simulate the curve at fine resolution over the last few cycles
  // to find the maximum concentration value
  const simStartMs = lastDoseTs;
  const simEndMs = lastDoseTs + cycleHours * 1000 * 60 * 60;
  const numSteps = 200;
  let peakConc = 0;

  // Also check peaks from ALL past cycles to get the true max
  for (const log of sortedLogs) {
    // Check around Tmax after each dose
    const checkTime = log.ts + params.tmaxHours * 1000 * 60 * 60;
    const c = concentrationAtTime(checkTime);
    if (c > peakConc) peakConc = c;
  }

  // Scan the current cycle finely
  for (let i = 0; i <= numSteps; i++) {
    const t = simStartMs + (i / numSteps) * (simEndMs - simStartMs);
    const c = concentrationAtTime(t);
    if (c > peakConc) peakConc = c;
  }

  if (peakConc === 0) peakConc = 1; // avoid division by zero

  // --- Generate normalized curve points for the current dosing cycle ---
  const curvePoints: PkCurvePoint[] = [];
  const curveSteps = 100;
  for (let i = 0; i <= curveSteps; i++) {
    const hourInCycle = (i / curveSteps) * cycleHours;
    const absTimeMs = lastDoseTs + hourInCycle * 1000 * 60 * 60;
    const rawConc = concentrationAtTime(absTimeMs);
    curvePoints.push({
      hourInCycle,
      level: Math.min(1, rawConc / peakConc),
    });
  }

  // --- Current level ---
  const currentConc = concentrationAtTime(now);
  const currentLevelPct = Math.round(Math.min(100, (currentConc / peakConc) * 100));

  return {
    curve: curvePoints,
    currentLevelPct,
    currentHourInCycle: Math.max(0, hoursSinceLastDose),
    cycleLengthHours: cycleHours,
    daysSinceLastDose: Math.max(0, daysSinceLastDose),
    daysUntilNextDose,
  };
}

// ---------------------------------------------------------------------------
// Onboarding: generate a demo multi-cycle PK curve (no real dose data)
// ---------------------------------------------------------------------------

export interface OnboardingPkPoint {
  x: number;
  y: number;
}

export interface OnboardingPkResult {
  /** SVG path string for the curve */
  path: string;
  /** Area fill path (closed to baseline) */
  areaPath: string;
  /** Peak annotation points */
  peakPoints: OnboardingPkPoint[];
  /** Trough annotation points */
  troughPoints: OnboardingPkPoint[];
  /** X-axis labels */
  doseLabels: string[];
}

/**
 * Generate a multi-cycle PK curve for the onboarding educational chart.
 * Uses real PK math (not hand-drawn beziers) so it matches the dashboard model.
 */
export function computeOnboardingPkCurve(
  medication: MedicationType | undefined,
  deliveryType: DeliveryType | undefined,
  frequency: Frequency | undefined,
  chartW: number,
  chartH: number,
  padX: number,
  padY: number,
): OnboardingPkResult {
  const params = getPkParams(medication, deliveryType);
  const ke = LN2 / params.halfLifeHours;
  const ka = computeKa(ke, params.tmaxHours);
  const cycleHours = frequencyToHours(frequency);

  // Number of cycles and labels
  let numCycles: number;
  let doseLabels: string[];
  if (frequency === 'every_14_days') {
    numCycles = 2;
    doseLabels = ['Day 1', 'Day 14', 'Day 28'];
  } else if (frequency === 'daily') {
    numCycles = 5;
    doseLabels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
  } else {
    numCycles = 3;
    doseLabels = ['Wk 1', 'Wk 2', 'Wk 3'];
  }

  const totalHours = numCycles * cycleHours;
  const w = chartW - padX * 2;
  const h = chartH - padY * 2;
  const baseY = padY + h;

  // Simulate doses at the start of each cycle
  const doseTimes: number[] = [];
  for (let c = 0; c < numCycles; c++) {
    doseTimes.push(c * cycleHours);
  }

  // Compute superimposed concentration
  function concAtT(tHours: number): number {
    let total = 0;
    for (const dt of doseTimes) {
      const elapsed = tHours - dt;
      if (elapsed > 0) {
        total += singleDoseConcentration(elapsed, ka, ke);
      }
    }
    return total;
  }

  // Find peak for normalization
  const steps = 500;
  let peak = 0;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalHours;
    const c = concAtT(t);
    if (c > peak) peak = c;
  }
  if (peak === 0) peak = 1;

  // Generate path points
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalHours;
    const c = concAtT(t) / peak;
    const x = padX + (t / totalHours) * w;
    const y = baseY - c * h * 0.92; // leave a little headroom
    points.push({ x, y });
  }

  // Build SVG path
  let path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x.toFixed(1)},${points[i].y.toFixed(1)}`;
  }

  // Area fill path (close to baseline)
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)},${baseY} L ${points[0].x.toFixed(1)},${baseY} Z`;

  // Find peak & trough points per cycle
  const peakPoints: OnboardingPkPoint[] = [];
  const troughPoints: OnboardingPkPoint[] = [];

  for (let c = 0; c < numCycles; c++) {
    const cycleStart = c * cycleHours;
    const cycleEnd = (c + 1) * cycleHours;

    // Find peak in this cycle
    let maxC = 0;
    let maxT = cycleStart;
    for (let i = 0; i <= 100; i++) {
      const t = cycleStart + (i / 100) * cycleHours;
      const cv = concAtT(t);
      if (cv > maxC) { maxC = cv; maxT = t; }
    }
    peakPoints.push({
      x: padX + (maxT / totalHours) * w,
      y: baseY - (maxC / peak) * h * 0.92,
    });

    // Trough = concentration at cycle end
    const troughC = concAtT(cycleEnd);
    troughPoints.push({
      x: padX + (cycleEnd / totalHours) * w,
      y: baseY - (troughC / peak) * h * 0.92,
    });
  }

  return { path, areaPath, peakPoints, troughPoints, doseLabels };
}
