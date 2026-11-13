import { describe, it, expect } from 'vitest';
import {
  computeCostCap,
  computeSavings,
  computeCO2Savings,
  DEFAULT_RATE_PAISE_PER_KM,
} from '../cost.js';

describe('computeCostCap', () => {
  it('calculates cap correctly for car with 3 seats, 10km, no toll', () => {
    // base = 10 * 800 = 8000; cap = ceil(8000 / (3+1)) = ceil(2000) = 2000
    const result = computeCostCap({
      distanceM: 10_000,
      vehicleType: 'car',
      seatsTotal: 3,
      tollPaise: 0,
    });
    expect(result.basePaise).toBe(8000);
    expect(result.capPerSeatPaise).toBe(2000);
    expect(result.soloCostPaise).toBe(8000);
  });

  it('adds toll to base', () => {
    const result = computeCostCap({
      distanceM: 10_000,
      vehicleType: 'car',
      seatsTotal: 1,
      tollPaise: 5000,
    });
    // base = 8000 + 5000 = 13000; cap = ceil(13000 / 2) = 6500
    expect(result.basePaise).toBe(13000);
    expect(result.capPerSeatPaise).toBe(6500);
  });

  it('uses bike rate for bike', () => {
    const result = computeCostCap({
      distanceM: 5_000,
      vehicleType: 'bike',
      seatsTotal: 1,
      tollPaise: 0,
    });
    // base = 5 * 250 = 1250; cap = ceil(1250 / 2) = 625
    expect(result.basePaise).toBe(1250);
    expect(result.capPerSeatPaise).toBe(625);
  });

  it('applies cap multiplier', () => {
    const result = computeCostCap({
      distanceM: 10_000,
      vehicleType: 'car',
      seatsTotal: 3,
      tollPaise: 0,
      capMultiplier: 0.8,
    });
    // base = 8000; cap = ceil(8000/4 * 0.8) = ceil(1600) = 1600
    expect(result.capPerSeatPaise).toBe(1600);
  });

  it('uses custom rate override', () => {
    const result = computeCostCap({
      distanceM: 10_000,
      vehicleType: 'car',
      seatsTotal: 3,
      tollPaise: 0,
      ratePaisePerKm: 1000,
    });
    // base = 10 * 1000 = 10000; cap = ceil(10000/4) = 2500
    expect(result.basePaise).toBe(10000);
    expect(result.capPerSeatPaise).toBe(2500);
  });

  it('never returns negative cap', () => {
    const result = computeCostCap({
      distanceM: 0,
      vehicleType: 'car',
      seatsTotal: 3,
      tollPaise: 0,
    });
    expect(result.capPerSeatPaise).toBeGreaterThanOrEqual(0);
  });
});

describe('computeSavings', () => {
  it('returns positive saving', () => {
    expect(computeSavings({ soloCostPaise: 8000, contributionPaise: 2000 })).toBe(6000);
  });

  it('returns 0 when contribution equals solo cost', () => {
    expect(computeSavings({ soloCostPaise: 2000, contributionPaise: 2000 })).toBe(0);
  });

  it('never returns negative (contribution > solo cost edge case)', () => {
    expect(computeSavings({ soloCostPaise: 1000, contributionPaise: 1500 })).toBe(0);
  });
});

describe('computeCO2Savings', () => {
  it('calculates CO2 savings correctly', () => {
    // 10km × 0.17 kg/km × 3 passengers = 5.1 kg
    const result = computeCO2Savings({ distanceM: 10_000, passengers: 3 });
    expect(result).toBeCloseTo(5.1);
  });

  it('uses custom emission factor', () => {
    const result = computeCO2Savings({
      distanceM: 10_000,
      passengers: 2,
      emissionKgPerKmCar: 0.2,
    });
    // 10 × 0.2 × 2 = 4.0
    expect(result).toBeCloseTo(4.0);
  });
});

describe('DEFAULT_RATE_PAISE_PER_KM', () => {
  it('has rates for all vehicle types', () => {
    const types = ['car', 'bike', 'scooter', 'auto', 'other'] as const;
    for (const t of types) {
      expect(DEFAULT_RATE_PAISE_PER_KM[t]).toBeGreaterThan(0);
    }
  });
});
