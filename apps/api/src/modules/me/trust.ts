import { TrustTier, type Gender } from '@campusride/shared';

export interface UserTrustContext {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  adultConfirmedAt: Date | null;
  phoneVerifiedAt: Date | null;
  collegeVerifiedAt: Date | null;
  gender: Gender;
  genderVerifiedAt: Date | null;
  hasTosConsent: boolean;
  hasGovtIdVerified?: boolean;
  hasDrivingLicenceApproved?: boolean;
  hasVehicleRcApproved?: boolean;
  hasInsuranceValid?: boolean;
}

export interface ComputedTrustProfile {
  tier: TrustTier;
  badges: string[];
  steps: Array<{
    tier: TrustTier;
    step: string;
    description: string;
    completed: boolean;
  }>;
}

/**
 * Computes a user's trust tier (T0–T3) and verification badges strictly server-side.
 * Never trust tier from the client.
 */
export function computeTrustProfile(ctx: UserTrustContext): ComputedTrustProfile {
  const emailVerified = !!ctx.emailVerifiedAt;
  const adultAndTos = !!ctx.adultConfirmedAt && ctx.hasTosConsent;
  const isT0 = emailVerified && adultAndTos;

  const phoneVerified = !!ctx.phoneVerifiedAt;
  const isT1 = isT0 && phoneVerified;

  const idVerified = !!ctx.collegeVerifiedAt || !!ctx.hasGovtIdVerified;
  const isT2 = isT1 && idVerified;

  const vehicleVerified =
    !!ctx.hasDrivingLicenceApproved &&
    !!ctx.hasVehicleRcApproved &&
    !!ctx.hasInsuranceValid;
  const isT3 = isT2 && vehicleVerified;

  let tier: TrustTier = TrustTier.T0;
  if (isT3) {
    tier = TrustTier.T3;
  } else if (isT2) {
    tier = TrustTier.T2;
  } else if (isT1) {
    tier = TrustTier.T1;
  } else {
    tier = TrustTier.T0;
  }

  const badges: string[] = [];
  if (ctx.collegeVerifiedAt) {
    badges.push('campus_verified');
  }
  if (idVerified) {
    badges.push('id_verified');
  }
  if (isT3) {
    badges.push('driver_verified');
  }
  if (ctx.gender === 'female' && ctx.genderVerifiedAt) {
    badges.push('women_verified');
  }

  const steps = [
    {
      tier: TrustTier.T0,
      step: 'email_verification',
      description: 'Verify your email address via OTP',
      completed: emailVerified,
    },
    {
      tier: TrustTier.T0,
      step: 'adult_and_tos',
      description: 'Confirm you are 18+ and accept Terms of Service',
      completed: adultAndTos,
    },
    {
      tier: TrustTier.T1,
      step: 'phone_verification',
      description: 'Verify your contact phone number',
      completed: phoneVerified,
    },
    {
      tier: TrustTier.T2,
      step: 'identity_verification',
      description: 'Verify campus affiliation or submit government photo ID',
      completed: idVerified,
    },
    {
      tier: TrustTier.T3,
      step: 'driver_documents',
      description: 'Submit approved driving licence, vehicle RC, and valid insurance',
      completed: vehicleVerified,
    },
  ];

  return { tier, badges, steps };
}
