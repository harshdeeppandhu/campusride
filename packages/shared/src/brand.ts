/**
 * CampusRide – Brand configuration.
 * All UI copy that references the product name must use these values.
 * Override APP_NAME via environment (server-side only).
 */

export const BRAND = {
  /** Product name — overridable via APP_NAME env on server */
  name: 'CampusRide',
  /** Tagline shown on landing page */
  tagline: 'Shared rides, trusted community.',
  /** Short description */
  description:
    'CampusRide connects verified campus members and community residents to share the cost of private vehicle trips — safely.',
  /** Support email (placeholder — human must fill) */
  supportEmail: 'support@campusride.example.com',
  /** Grievance officer email (placeholder — human must fill per DPDP) */
  grievanceEmail: 'grievance@campusride.example.com',
  /** App scheme for deep links */
  scheme: 'campusride',
  /** iOS bundle ID placeholder */
  bundleId: 'com.campusride.app',
  /** Android package name placeholder */
  androidPackage: 'com.campusride.app',
} as const;

export type Brand = typeof BRAND;
