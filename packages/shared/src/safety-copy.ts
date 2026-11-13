/**
 * CampusRide – Safety copy (legal-reviewed strings).
 * ALL safety UI copy must come from this file — never inline.
 * Changes to this file require human review (see AGENTS.md §5).
 */

export const SAFETY_COPY = {
  /** SOS button label */
  SOS_BUTTON_LABEL: 'SOS',

  /** SOS activation instruction */
  SOS_HOLD_INSTRUCTION: 'Hold for 2 seconds to send emergency alert',

  /** SOS confirmation slide instruction */
  SOS_SLIDE_INSTRUCTION: 'Slide to confirm emergency',

  /**
   * MANDATORY disclaimer — must appear on every SOS screen.
   * This text has been reviewed; do not shorten or reword without human gate.
   */
  SOS_DISCLAIMER:
    'Alerts depend on your device permissions, network, and our configured services. ' +
    'This does not replace calling emergency services.',

  /** Shown below alert delivery status */
  SOS_STATUS_ADVICE: 'Call 112 now if you are in immediate danger.',

  /** Label for calling police emergency */
  CALL_112_LABEL: 'Call 112 (Police)',

  /** Label for women's helpline */
  CALL_1091_LABEL: "Call 1091 (Women's Helpline)",

  /** Cancel SOS label */
  SOS_CANCEL_LABEL: "I'm safe — cancel alert",

  /** Confirmation prompt before cancel */
  SOS_CANCEL_CONFIRM:
    'Are you sure you want to cancel this alert? Only do this if you are genuinely safe.',

  /** Women-only ride explainer */
  WOMEN_ONLY_EXPLAINER:
    'Women-only rides are offered by admin-verified female drivers and are visible and bookable ' +
    'only by admin-verified female passengers. Eligibility is set by our team after reviewing your ID.',

  /** Uncomfortable cancel: no reason shown to driver */
  UNCOMFORTABLE_CANCEL_LABEL: 'I feel uncomfortable',

  /** After uncomfortable cancel */
  UNCOMFORTABLE_CANCEL_CONFIRMATION:
    'Your booking has been cancelled. No reason will be shared with the driver. ' +
    'Would you like to file a private report?',

  /** Helmet warning for two-wheelers */
  HELMET_WARNING:
    'Pillion riding requires a helmet. Ensure you wear one before boarding a bike or scooter.',

  /** Cost-share copy — never use "fare", "earning", or "profit" */
  CONTRIBUTION_LABEL: 'Contribution',
  CONTRIBUTION_SUBLABEL: 'Share of fuel & toll',
  SAVINGS_LABEL: 'Your estimated saving',
  DRIVER_EARNING_FORBIDDEN: '', // intentionally empty — never rendered

  /** Share trip link description (shown to recipient) */
  SHARE_TRIP_DESCRIPTION:
    'Someone is sharing their trip with you. This link shows their route and estimated arrival. ' +
    'No passenger details are included.',
} as const;

export type SafetyCopy = typeof SAFETY_COPY;
