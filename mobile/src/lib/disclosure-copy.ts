// Shared verbatim between the onboarding consent screen (app/consent.tsx) and the
// always-accessible disclosures screen (app/disclosures.tsx), per §13.10's requirement that the
// blanket disclosure "remains accessible afterward in settings/about too" — the acknowledged
// wording and the wording shown later must never drift apart.
//
// FLAGGED FOR PRE-LAUNCH LEGAL REVIEW (§13.10): not yet checked against current FTC (US) or
// UCPD/Omnibus (EU/UK) guidance.

export const BLANKET_DISCLOSURE_TEXT =
  'LooksMax may earn a commission when you buy products we recommend, through our affiliate ' +
  "partners. This never changes what we recommend — a product is only ever suggested because " +
  "it's a genuine fit for you, whether or not we earn anything from it. Some recommendations " +
  'are also part of paid partnerships; those are always marked "Promoted" right where they ' +
  'appear.';

export const BIOMETRIC_CONSENT_TEXT =
  'To generate your scan, we analyze the selfie you take or upload using AI. Your photo is ' +
  'stored so you can see it again in your scan history alongside its results — it is never ' +
  'shared or sold. You can delete any single scan and its photo at any time, or delete your ' +
  'whole account and everything in it, from your history and settings.';
