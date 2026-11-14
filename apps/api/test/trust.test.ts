import { describe, it, expect } from 'vitest';
import { TrustTier } from '@campusride/shared';
import { computeTrustProfile, type UserTrustContext } from '../src/modules/me/trust.js';

describe('Trust Tier & Badges Computation', () => {
  const baseUser: UserTrustContext = {
    id: '018f3a2c-1234-7000-8000-000000000001',
    email: 'test@example.com',
    emailVerifiedAt: null,
    adultConfirmedAt: null,
    phoneVerifiedAt: null,
    collegeVerifiedAt: null,
    gender: 'undisclosed',
    genderVerifiedAt: null,
    hasTosConsent: false,
  };

  it('assigns T0 when email is verified and 18+ ToS consent is granted', () => {
    const user: UserTrustContext = {
      ...baseUser,
      emailVerifiedAt: new Date(),
      adultConfirmedAt: new Date(),
      hasTosConsent: true,
    };

    const profile = computeTrustProfile(user);
    expect(profile.tier).toBe(TrustTier.T0);
    expect(profile.badges).toEqual([]);
    expect(profile.steps.find((s) => s.step === 'email_verification')?.completed).toBe(true);
    expect(profile.steps.find((s) => s.step === 'adult_and_tos')?.completed).toBe(true);
    expect(profile.steps.find((s) => s.step === 'phone_verification')?.completed).toBe(false);
  });

  it('assigns T1 when T0 requirements plus phone is verified', () => {
    const user: UserTrustContext = {
      ...baseUser,
      emailVerifiedAt: new Date(),
      adultConfirmedAt: new Date(),
      hasTosConsent: true,
      phoneVerifiedAt: new Date(),
    };

    const profile = computeTrustProfile(user);
    expect(profile.tier).toBe(TrustTier.T1);
    expect(profile.steps.find((s) => s.step === 'phone_verification')?.completed).toBe(true);
    expect(profile.steps.find((s) => s.step === 'identity_verification')?.completed).toBe(false);
  });

  it('assigns T2 when T1 requirements plus college is verified', () => {
    const user: UserTrustContext = {
      ...baseUser,
      emailVerifiedAt: new Date(),
      adultConfirmedAt: new Date(),
      hasTosConsent: true,
      phoneVerifiedAt: new Date(),
      collegeVerifiedAt: new Date(),
    };

    const profile = computeTrustProfile(user);
    expect(profile.tier).toBe(TrustTier.T2);
    expect(profile.badges).toContain('campus_verified');
    expect(profile.badges).toContain('id_verified');
  });

  it('assigns T2 when T1 requirements plus government ID is verified', () => {
    const user: UserTrustContext = {
      ...baseUser,
      emailVerifiedAt: new Date(),
      adultConfirmedAt: new Date(),
      hasTosConsent: true,
      phoneVerifiedAt: new Date(),
      hasGovtIdVerified: true,
    };

    const profile = computeTrustProfile(user);
    expect(profile.tier).toBe(TrustTier.T2);
    expect(profile.badges).toContain('id_verified');
    expect(profile.badges).not.toContain('campus_verified');
  });

  it('assigns T3 when T2 requirements plus driver DL, RC and insurance are valid', () => {
    const user: UserTrustContext = {
      ...baseUser,
      emailVerifiedAt: new Date(),
      adultConfirmedAt: new Date(),
      hasTosConsent: true,
      phoneVerifiedAt: new Date(),
      collegeVerifiedAt: new Date(),
      hasDrivingLicenceApproved: true,
      hasVehicleRcApproved: true,
      hasInsuranceValid: true,
    };

    const profile = computeTrustProfile(user);
    expect(profile.tier).toBe(TrustTier.T3);
    expect(profile.badges).toContain('driver_verified');
    expect(profile.steps.every((s) => s.completed)).toBe(true);
  });

  it('grants women_verified badge ONLY when gender is female AND admin verified', () => {
    // Female but unverified
    const unverifiedFemale: UserTrustContext = {
      ...baseUser,
      emailVerifiedAt: new Date(),
      adultConfirmedAt: new Date(),
      hasTosConsent: true,
      gender: 'female',
      genderVerifiedAt: null,
    };
    expect(computeTrustProfile(unverifiedFemale).badges).not.toContain('women_verified');

    // Male even if has genderVerifiedAt
    const verifiedMale: UserTrustContext = {
      ...baseUser,
      emailVerifiedAt: new Date(),
      adultConfirmedAt: new Date(),
      hasTosConsent: true,
      gender: 'male',
      genderVerifiedAt: new Date(),
    };
    expect(computeTrustProfile(verifiedMale).badges).not.toContain('women_verified');

    // Female with admin verification
    const verifiedFemale: UserTrustContext = {
      ...baseUser,
      emailVerifiedAt: new Date(),
      adultConfirmedAt: new Date(),
      hasTosConsent: true,
      gender: 'female',
      genderVerifiedAt: new Date(),
    };
    expect(computeTrustProfile(verifiedFemale).badges).toContain('women_verified');
  });
});
