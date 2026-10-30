/**
 * Guideline thresholds in ONE place, so a clinician can review and change them
 * without touching logic. Every value names its source and verification status.
 *
 * A value of `null` means "not configured — the app will NOT make an automatic
 * recommendation and will ask for clinician judgment instead".
 */
export const GUIDELINE = Object.freeze({
  version: '2026-dyslipidemia-draft-1',

  // PREVENT-ASCVD 10-year tiers (fractions). Source: DYSLIPIDEMIA_2026 (secondary-source).
  riskTiers: [
    { id: 'low', label: 'Low', min: 0, max: 0.03 },
    { id: 'borderline', label: 'Borderline', min: 0.03, max: 0.05 },
    { id: 'intermediate', label: 'Intermediate', min: 0.05, max: 0.10 },
    { id: 'high', label: 'High', min: 0.10, max: 1.01 },
  ],

  // Primary-prevention plan per tier.
  tierPlan: {
    low: {
      statin: 'none',
      ldlGoal: null,
      text: 'Emphasize healthy lifestyle. Statin generally not indicated on risk alone; review risk enhancers and LDL-C ≥160 mg/dL.',
      evidence: ['DYSLIPIDEMIA_2026', 'CHOLESTEROL_2018'],
    },
    borderline: {
      statin: 'consider-moderate',
      ldlGoal: 100,
      text: 'Clinician–patient risk discussion. Moderate-intensity statin is an option, particularly if risk enhancers are present. CAC can refine the decision.',
      evidence: ['DYSLIPIDEMIA_2026'],
    },
    intermediate: {
      statin: 'moderate',
      ldlGoal: 100,
      text: 'At least moderate-intensity statin (LDL-C reduction 30–49%) to LDL-C <100 mg/dL; high-intensity may be considered at the upper end of this range. CAC can refine the decision.',
      evidence: ['DYSLIPIDEMIA_2026'],
    },
    high: {
      statin: 'high',
      ldlGoal: 70,
      text: 'Lipid-lowering therapy to LDL-C <70 mg/dL and non-HDL-C <100 mg/dL, with ≥50% LDL-C reduction.',
      evidence: ['DYSLIPIDEMIA_2026'],
    },
  },

  secondaryPrevention: {
    // All clinical ASCVD → <55 (physician lead decision).
    ldlGoalAscvd: { value: 55, status: 'clinician-confirmed', evidence: ['DYSLIPIDEMIA_2026', 'PHYSICIAN_LEAD'] },
    ldlGoalVeryHighRisk: { value: 55, status: 'secondary-source', evidence: ['DYSLIPIDEMIA_2026'] },
  },

  severeHypercholesterolemia: {
    ldlThreshold: 190, // CHOLESTEROL_2018 (verified)
    // <70 and ≥50% reduction (physician lead decision; treated as high risk).
    ldlGoal: { value: 70, minReduction: 0.5, status: 'clinician-confirmed', evidence: ['CHOLESTEROL_2018', 'PHYSICIAN_LEAD'] },
  },

  diabetes: {
    // 2018: adults 40–75 with diabetes → at least moderate-intensity statin (COR I).
    ageMin: 40, ageMax: 75, minStatin: 'moderate', evidence: ['CHOLESTEROL_2018'],
  },

  cac: {
    // CAC use: men >40, women >45 with borderline/intermediate risk (DYSLIPIDEMIA_2026, secondary-source)
    eligibleAge: { male: 40, female: 45 },
    zero: {
      // 2018: withhold statin & reassess in 5–10 y unless diabetes, smoking, family hx premature ASCVD.
      // 5 years: consistent with 2026 guideline summaries; confirmed by physician lead (2026-10-30).
      repeatYears: 5,
      exclusions: ['diabetes', 'smoker', 'familyHistoryPrematureAscvd', 'fh'],
      evidence: ['CHOLESTEROL_2018', 'DYSLIPIDEMIA_2026', 'PHYSICIAN_LEAD'],
    },
    mild: { min: 1, max: 299, statin: 'moderate', ldlGoal: 100, status: 'secondary-source', evidence: ['DYSLIPIDEMIA_2026', 'CHOLESTEROL_2018'] },
    // "Moderate-to-severe" CAC → high-intensity, LDL <70. Cutoff ≥300 set by physician lead.
    elevated: { min: 300, statin: 'high', ldlGoal: 70, status: 'clinician-confirmed', evidence: ['DYSLIPIDEMIA_2026', 'PHYSICIAN_LEAD'] },
    // CAC ≥1000: keep <70 (from ≥300 rule); show that <55 may be considered (physician lead).
    veryHigh: { min: 1000, ldlGoal: null, considerGoal: 55, status: 'clinician-confirmed', evidence: ['DYSLIPIDEMIA_2026', 'PHYSICIAN_LEAD'] },
  },

  // Apply "needs-review" thresholds automatically? Default false = conservative.
  applyUnverifiedThresholds: false,

  followUp: {
    // CHOLESTEROL_2018: repeat lipids 4–12 weeks after starting/adjusting therapy.
    lipidRecheckWeeks: [4, 12], evidence: ['CHOLESTEROL_2018'],
  },

  riskEnhancers: [
    // CHOLESTEROL_2018 list (verified). Lp(a)/apoB thresholds per that guideline.
    { id: 'familyHistoryPrematureAscvd', label: 'Family history of premature ASCVD (men <55, women <65)' },
    { id: 'persistentLdl160', label: 'Persistently elevated LDL-C 160–189 mg/dL' },
    { id: 'metabolicSyndrome', label: 'Metabolic syndrome' },
    { id: 'ckd', label: 'Chronic kidney disease' },
    { id: 'inflammatory', label: 'Chronic inflammatory condition (e.g., RA, psoriasis, HIV)' },
    { id: 'pregnancyHistory', label: 'History of preeclampsia or premature menopause (<40 y)' },
    { id: 'southAsian', label: 'South Asian ancestry' },
    { id: 'tg175', label: 'Persistently elevated triglycerides ≥175 mg/dL' },
    { id: 'hscrp2', label: 'hs-CRP ≥2.0 mg/L' },
    { id: 'lpa', label: 'Lp(a) ≥50 mg/dL or ≥125 nmol/L' },
    { id: 'apob130', label: 'ApoB ≥130 mg/dL' },
    { id: 'abi', label: 'Ankle-brachial index <0.9' },
  ],
});
