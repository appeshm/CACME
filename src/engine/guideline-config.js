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
    // 2026 4.2.5: age 40–75 → moderate-intensity statin, LDL-C <100 (COR 1, LOE A);
    // multiple ASCVD risk factors → high-intensity, LDL-C <70 (COR 2a). Table 17 diabetes-specific
    // risk enhancers support intensification.
    ageMin: 40, ageMax: 75, minStatin: 'moderate', ldlGoal: 100,
    withModifiers: { statin: 'high', ldlGoal: 70 },
    evidence: ['CHOLESTEROL_2018', 'GUIDELINE_2026_SUMMARY'],
  },

  // CKD stage 3+ without ASCVD, age 40–75, LDL-C 70–189 → moderate-intensity statin ± ezetimibe (2026 4.2.8.8, COR 1).
  ckd: { egfrBelow: 60, ageMin: 40, ageMax: 75, ldlMin: 70, ldlMax: 189, statin: 'moderate', evidence: ['DYSLIPIDEMIA_2026'] },

  // Primary prevention: untreated LDL-C <70 and non-HDL-C <100 without additional risk factors → LLT unlikely to help (COR 3: No Benefit).
  noBenefit: { ldlBelow: 70, nonHdlBelow: 100, evidence: ['DYSLIPIDEMIA_2026'] },

  // Low 10-y risk (<3%), age 30–59, LDL-C 160–189 → moderate-intensity statin reasonable (2026 4.2.3.7 rec 3, COR 2a).
  lowRiskHighLdl: { ageMin: 30, ageMax: 59, ldlMin: 160, ldlMax: 189, statin: 'moderate', ldlGoal: 100, evidence: ['GUIDELINE_2026_SUMMARY'] },

  // Optional ApoB goals by LDL-C goal (2026 summary).
  apobGoals: { 100: 90, 70: 70, 55: 55 },

  cac: {
    // CAC use: men >40, women >45 with borderline/intermediate risk (DYSLIPIDEMIA_2026, secondary-source)
    eligibleAge: { male: 40, female: 45 },
    zero: {
      // 2018: withhold statin & reassess in 5–10 y unless diabetes, smoking, family hx premature ASCVD.
      // 2026 (4.2.3.6 rec 2, COR 2a): reassess with repeat CAC in 3–7 y. Physician lead default: 5 y.
      repeatYears: 5, repeatRange: [3, 7],
      // Higher-risk conditions where CAC 0 does not defer therapy: FH/LDL-C >190, diabetes and age >40,
      // current smoking, strong family history of premature ASCVD.
      exclusions: ['diabetesOver40', 'smoker', 'familyHistoryPrematureAscvd', 'fh'],
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
    // 2026: lipid profile 4–12 weeks after starting/intensifying, then every 6–12 months.
    lipidRecheckWeeks: [4, 12], thereafterMonths: [6, 12], evidence: ['DYSLIPIDEMIA_2026'],
  },

  riskEnhancers: [
    // 2026 guideline Table 13 (verified against full text).
    { id: 'familyHistoryPrematureAscvd', label: 'Premature ASCVD in a parent or sibling (men <55, women <65)' },
    { id: 'highRiskAncestry', label: 'Higher-risk ancestry (e.g., South Asian, Filipino)' },
    { id: 'polygenic', label: 'High polygenic risk (if measured)' },
    { id: 'inflammatory', label: 'Chronic inflammatory disease (e.g., lupus, RA, advanced psoriasis, inflammatory arthritis)' },
    { id: 'lpa', label: 'Lp(a) ≥125 nmol/L or ≥50 mg/dL' },
    { id: 'hscrp2', label: 'hs-CRP ≥2 mg/L' },
    { id: 'tg', label: 'Triglycerides persistently ≥175 mg/dL nonfasting or ≥150 fasting' },
    { id: 'ckm', label: 'Cardiovascular-kidney-metabolic (CKM) syndrome' },
    { id: 'persistentLdl160', label: 'LDL-C persistently 160–189, non-HDL-C 190–219, or apoB ≥120 mg/dL' },
    { id: 'reproductive', label: 'Reproductive risk marker (premature menopause, preeclampsia, gestational diabetes or hypertension, preterm delivery)' },
  ],
});
