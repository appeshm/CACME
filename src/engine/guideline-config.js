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
    // ASCVD not at very high risk → <70, with <55 optional by shared decision-making.
    ldlGoalAscvd: { value: 70, optionalGoal: 55, status: 'clinician-confirmed', evidence: ['DYSLIPIDEMIA_2026', 'GUIDELINE_2026_SUMMARY'] },
    // Very high risk (multiple major events OR 1 major + ≥2 high-risk conditions), ASCVD + CKD stage 3+, or FH + ASCVD → <55.
    ldlGoalVeryHighRisk: { value: 55, status: 'clinician-confirmed', evidence: ['DYSLIPIDEMIA_2026', 'GUIDELINE_2026_SUMMARY'] },
    ckdEgfrThreshold: 60, // CKD stage 3+
  },

  severeHypercholesterolemia: {
    ldlThreshold: 190, // CHOLESTEROL_2018 (verified)
    // Without HeFH / ASCVD risk factors / subclinical atherosclerosis → <100; with any → <70. Plus ≥50% reduction.
    ldlGoal: { value: 100, minReduction: 0.5, status: 'clinician-confirmed', evidence: ['GUIDELINE_2026_SUMMARY'] },
    ldlGoalEnhanced: { value: 70, status: 'clinician-confirmed', evidence: ['GUIDELINE_2026_SUMMARY'] },
    // Major ASCVD risk factors used to decide "additional risk factors" (traditional set; see docs/OPEN_QUESTIONS.md).
    riskFactorKeys: ['diabetes', 'smoker', 'onBpMeds', 'familyHistoryPrematureAscvd'],
  },

  diabetes: {
    // 2018: adults 40–75 with diabetes → at least moderate-intensity statin (COR I).
    // 2026 summary: without risk factors/diabetes-specific modifiers → LDL-C <100; with → <70 (high-intensity).
    ageMin: 40, ageMax: 75, minStatin: 'moderate', ldlGoal: 100,
    withModifiers: { statin: 'high', ldlGoal: 70 },
    evidence: ['CHOLESTEROL_2018', 'GUIDELINE_2026_SUMMARY'],
  },

  // Low 10-y risk (<3%), age 30–59, untreated LDL-C 160–189 → LDL-C <100 (2026 summary).
  lowRiskHighLdl: { ageMin: 30, ageMax: 59, ldlMin: 160, ldlMax: 189, statin: 'moderate', ldlGoal: 100, evidence: ['GUIDELINE_2026_SUMMARY'] },

  // Optional ApoB goals by LDL-C goal (2026 summary).
  apobGoals: { 100: 90, 70: 70, 55: 55 },

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
    // 1–99 AU and <75th percentile → moderate, <100.
    mild: { min: 1, max: 99, statin: 'moderate', ldlGoal: 100, status: 'clinician-confirmed', evidence: ['DYSLIPIDEMIA_2026', 'GUIDELINE_2026_SUMMARY'] },
    // ≥100 AU or ≥75th percentile → high-intensity, <70.
    elevated: { min: 100, percentile: 75, statin: 'high', ldlGoal: 70, status: 'clinician-confirmed', evidence: ['DYSLIPIDEMIA_2026', 'GUIDELINE_2026_SUMMARY'] },
    // 300–999 AU → <70 standard; <55 optional intensive goal.
    severe: { min: 300, optionalGoal: 55, status: 'clinician-confirmed', evidence: ['GUIDELINE_2026_SUMMARY'] },
    // ≥1000 AU → <55.
    veryHigh: { min: 1000, statin: 'high', ldlGoal: 55, status: 'clinician-confirmed', evidence: ['GUIDELINE_2026_SUMMARY'] },
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
