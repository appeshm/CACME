/**
 * Citation registry. Every recommendation the engine emits references one or more IDs here.
 *
 * `status` describes how well the app's use of the source has been verified:
 *   "verified"         – value checked against primary source or an independent implementation
 *   "secondary-source" – confirmed only via guideline summaries / news; primary text not yet reviewed
 *   "needs-review"     – plausible but NOT confirmed; never applied automatically
 */
export const EVIDENCE = Object.freeze({
  PREVENT_2024: {
    cite: 'Khan SS, Matsushita K, Sang Y, et al. Development and Validation of the American Heart Association’s PREVENT Equations. Circulation. 2024;149:430–449.',
    doi: '10.1161/CIRCULATIONAHA.123.067626',
    status: 'verified',
    note: 'Base-model 10-year coefficients (Suppl. Table S12A) cross-checked against an independent implementation.',
  },
  DYSLIPIDEMIA_2026: {
    cite: '2026 ACC/AHA/AACVPR/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Dyslipidemia. Circulation / J Am Coll Cardiol. 2026.',
    doi: '10.1161/CIR.0000000000001423',
    altDoi: '10.1016/j.jacc.2025.11.016',
    status: 'secondary-source',
    note: 'Risk tiers (<3, 3–<5, 5–<10, ≥10% PREVENT-ASCVD) and LDL-C goals (<100, <70, <55) confirmed via ACC, AHA, JACC Guideline-at-a-Glance and Medscape summaries. Full text not yet reviewed line-by-line.',
  },
  CHOLESTEROL_2018: {
    cite: 'Grundy SM, Stone NJ, Bailey AL, et al. 2018 AHA/ACC/.../PCNA Guideline on the Management of Blood Cholesterol. Circulation. 2019;139:e1082–e1143.',
    doi: '10.1161/CIR.0000000000000625',
    status: 'verified',
    note: 'Source of statin-intensity table (Table 3), risk-enhancer list and the original CAC 0 / 1–99 / ≥100 framework.',
  },
  ECDP_2022: {
    cite: 'Lloyd-Jones DM, Morris PB, Ballantyne CM, et al. 2022 ACC Expert Consensus Decision Pathway on the Role of Nonstatin Therapies for LDL-Cholesterol Lowering. J Am Coll Cardiol. 2022;80:1366–1418.',
    doi: '10.1016/j.jacc.2022.07.006',
    status: 'verified',
    note: 'Sequencing of nonstatin add-on therapy.',
  },
  IMPROVE_IT: {
    cite: 'Cannon CP, Blazing MA, Giugliano RP, et al. Ezetimibe Added to Statin Therapy after Acute Coronary Syndromes. N Engl J Med. 2015;372:2387–2397.',
    doi: '10.1056/NEJMoa1410489',
    status: 'secondary-source',
    note: '~24% additional LDL-C lowering vs simvastatin 40 mg alone (time-weighted median ~54 vs ~70 mg/dL).',
  },
  FOURIER: {
    cite: 'Sabatine MS, Giugliano RP, Keech AC, et al. Evolocumab and Clinical Outcomes in Patients with Cardiovascular Disease. N Engl J Med. 2017;376:1713–1722.',
    doi: '10.1056/NEJMoa1615664',
    status: 'verified',
    note: '59% LDL-C reduction vs placebo at 48 weeks on top of statin.',
  },
  ODYSSEY: {
    cite: 'Schwartz GG, Steg PG, Szarek M, et al. Alirocumab and Cardiovascular Outcomes after Acute Coronary Syndrome. N Engl J Med. 2018;379:2097–2107.',
    doi: '10.1056/NEJMoa1801174',
    status: 'verified',
    note: 'Outcome benefit after ACS. LDL-C effect not used for numeric projections in this app.',
  },
  VESALIUS_CV: {
    cite: 'VESALIUS-CV (TIMI 66): Evolocumab in high-risk patients without prior myocardial infarction or stroke. N Engl J Med. Published online November 8, 2025.',
    doi: null,
    status: 'secondary-source',
    note: '12,257 patients, median 4.6 y. 3-point MACE HR 0.75 (0.65\u20130.86). Enrollment required LDL-C \u226590 mg/dL; many had CAD, PAD or cerebrovascular disease without MI/stroke. True primary-prevention subgroup (diabetes without known atherosclerosis): HR 0.69.',
  },
  CLEAR_OUTCOMES: {
    cite: 'Nissen SE, Lincoff AM, Brennan D, et al. Bempedoic Acid and Cardiovascular Outcomes in Statin-Intolerant Patients. N Engl J Med. 2023;388:1353–1364.',
    doi: '10.1056/NEJMoa2215024',
    status: 'verified',
    note: '21.1% greater LDL-C reduction vs placebo at 6 months in statin-intolerant patients.',
  },
  ORION_10_11: {
    cite: 'Ray KK, Wright RS, Kallend D, et al. Two Phase 3 Trials of Inclisiran in Patients with Elevated LDL Cholesterol. N Engl J Med. 2020;382:1507–1519.',
    doi: '10.1056/NEJMoa1912387',
    status: 'verified',
    note: '~50% placebo-corrected LDL-C reduction (ORION-10 52.3%, ORION-11 49.9%).',
  },
  CAC_MESA_2015: {
    cite: 'McClelland RL, Jorgensen NW, Budoff M, et al. 10-Year Coronary Heart Disease Risk Prediction Using Coronary Artery Calcium and Traditional Risk Factors (MESA). J Am Coll Cardiol. 2015;66:1643–1653.',
    doi: '10.1016/j.jacc.2015.08.035',
    status: 'verified',
    note: 'Background for CAC-based risk refinement. MESA risk score itself is NOT implemented here.',
  },
  PHYSICIAN_LEAD: {
    cite: 'Project physician lead (preventive cardiologist) decision, 2026-10-30, where the 2026 guideline text available to the build was ambiguous.',
    doi: null,
    status: 'clinician-confirmed',
    note: 'CAC 0 rescan 5 y; CAC \u2265300 \u2192 high-intensity statin, LDL-C <70; CAC \u22651000 \u2192 <70 with <55 considered; all clinical ASCVD \u2192 LDL-C <55; LDL-C \u2265190/FH \u2192 LDL-C <70 and \u226550% reduction.',
  },
  FDA_LABELS: {
    cite: 'US FDA prescribing information (rosuvastatin, atorvastatin, simvastatin, ezetimibe, bempedoic acid, evolocumab, alirocumab, inclisiran).',
    doi: null,
    status: 'verified',
    note: 'Dose and renal-dose limits.',
  },
});

export function cite(id) {
  const e = EVIDENCE[id];
  if (!e) throw new Error(`Unknown evidence id: ${id}`);
  return e;
}
