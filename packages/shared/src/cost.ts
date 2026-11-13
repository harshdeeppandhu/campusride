/**
 * CampusRide – Cost-share cap calculation.
 * Pure functions — no side effects, no network calls, fully unit-tested.
 *
 * Rules (docs/03 §3):
 * - base = distance_km × rate_paise_per_km[vehicle_type] + toll_paise
 * - cap_per_seat = ceil(base / (seats_total + 1) × cap_multiplier)
 * - driver's contribution_paise must be ≤ cap_per_seat
 * - Never show total driver "earnings"
 */

import type { VehicleType } from './enums.js';

/** Default cost rates in paise/km (admin-editable via app_config) */
export const DEFAULT_RATE_PAISE_PER_KM: Record<VehicleType, number> = {
  car: 800,
  bike: 250,
  scooter: 200,
  auto: 500,
  other: 500,
};

/** Default cap multiplier (admin-editable) */
export const DEFAULT_CAP_MULTIPLIER = 1.0;

export interface CostCapInput {
  distanceM: number;
  vehicleType: VehicleType;
  seatsTotal: number;
  tollPaise: number;
  /** Rate override from app_config; falls back to DEFAULT_RATE_PAISE_PER_KM */
  ratePaisePerKm?: number;
  /** Cap multiplier override; falls back to DEFAULT_CAP_MULTIPLIER */
  capMultiplier?: number;
}

export interface CostCapResult {
  /** Base cost in paise (distance × rate + toll) */
  basePaise: number;
  /** Maximum allowed contribution per seat in paise */
  capPerSeatPaise: number;
  /** Estimated solo cost (base / 1 person) for savings calculation */
  soloCostPaise: number;
}

/**
 * Compute the per-seat cost cap and solo cost for savings display.
 * This is the single source of truth — used by API and UI.
 */
export function computeCostCap(input: CostCapInput): CostCapResult {
  const distanceKm = input.distanceM / 1000;
  const rate =
    input.ratePaisePerKm ?? DEFAULT_RATE_PAISE_PER_KM[input.vehicleType];
  const multiplier = input.capMultiplier ?? DEFAULT_CAP_MULTIPLIER;

  const basePaise = Math.round(distanceKm * rate) + input.tollPaise;
  const soloCostPaise = basePaise;
  // +1 accounts for the driver's share; passengers split the rest
  const capPerSeatPaise = Math.ceil(
    (basePaise / (input.seatsTotal + 1)) * multiplier,
  );

  return { basePaise, capPerSeatPaise, soloCostPaise };
}

export interface SavingsInput {
  soloCostPaise: number;
  contributionPaise: number;
}

/**
 * Estimated saving per passenger (solo cost - contribution).
 * Always non-negative — capped at 0 if contribution exceeds solo cost.
 */
export function computeSavings(input: SavingsInput): number {
  return Math.max(0, input.soloCostPaise - input.contributionPaise);
}

export interface CO2SavingsInput {
  /** Distance driven in metres */
  distanceM: number;
  /** Number of passengers (not including driver) */
  passengers: number;
  /** kg CO2 per km for a car (configurable; default 0.17) */
  emissionKgPerKmCar?: number;
}

/**
 * Estimated CO₂ avoided by ride-sharing vs everyone driving separately.
 * Formula: shared_km × emission_factor × passengers
 * Assumption: driver would travel anyway; passengers are the saving.
 */
export function computeCO2Savings(input: CO2SavingsInput): number {
  const distanceKm = input.distanceM / 1000;
  const factor = input.emissionKgPerKmCar ?? 0.17;
  return distanceKm * factor * input.passengers;
}
