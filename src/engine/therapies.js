/**
 * Lipid-lowering therapy reference data.
 * Statin intensity groups: 2018 AHA/ACC Cholesterol Guideline, Table 3 (CHOLESTEROL_2018).
 * Doses / renal limits: FDA prescribing information (FDA_LABELS).
 *
 * LDL-C effect numbers used for projections are the LOWER bound of each guideline
 * intensity range, or the mean placebo-corrected effect from the named trial.
 * They are population averages; individual response varies.
 */

export const STATIN_INTENSITY = Object.freeze({
  high: {
    label: 'High-intensity',
    expectedLdlReduction: '≥50%',
    planningReduction: 0.50,
    regimens: [
      { drug: 'Atorvastatin', doses: [40, 80], preferredStart: 40 },
      { drug: 'Rosuvastatin', doses: [20, 40], preferredStart: 20 },
    ],
  },
  moderate: {
    label: 'Moderate-intensity',
    expectedLdlReduction: '30–49%',
    planningReduction: 0.30,
    regimens: [
      { drug: 'Atorvastatin', doses: [10, 20], preferredStart: 10 },
      { drug: 'Rosuvastatin', doses: [5, 10], preferredStart: 5 },
      { drug: 'Simvastatin', doses: [20, 40], preferredStart: 20 },
      { drug: 'Pravastatin', doses: [40, 80], preferredStart: 40 },
      { drug: 'Lovastatin', doses: [40, 80], preferredStart: 40 },
      { drug: 'Fluvastatin XL', doses: [80], preferredStart: 80 },
      { drug: 'Pitavastatin', doses: [1, 2, 3, 4], preferredStart: 2 },
    ],
  },
  low: {
    label: 'Low-intensity',
    expectedLdlReduction: '<30%',
    planningReduction: 0,
    regimens: [
      { drug: 'Simvastatin', doses: [10] },
      { drug: 'Pravastatin', doses: [10, 20] },
      { drug: 'Lovastatin', doses: [20] },
      { drug: 'Fluvastatin', doses: [20, 40] },
    ],
  },
});

// Map a current statin + dose to its intensity group (or null if not in Table 3).
export function classifyStatin(drug, doseMg) {
  if (!drug) return null;
  const d = drug.toLowerCase();
  for (const [intensity, group] of Object.entries(STATIN_INTENSITY)) {
    for (const r of group.regimens) {
      if (r.drug.toLowerCase() === d && r.doses.includes(Number(doseMg))) return intensity;
    }
  }
  return null;
}

export const NONSTATINS = Object.freeze({
  ezetimibe: {
    name: 'Ezetimibe',
    dose: '10 mg orally once daily',
    planningReduction: 0.24,
    effectNote: '~24% additional LDL-C lowering when added to simvastatin 40 mg (IMPROVE-IT).',
    evidence: ['IMPROVE_IT', 'ECDP_2022'],
  },
  pcsk9mab: {
    name: 'PCSK9 monoclonal antibody',
    dose: 'Evolocumab 140 mg SC every 2 weeks or 420 mg SC monthly; or alirocumab 75–150 mg SC every 2 weeks (or 300 mg monthly)',
    planningReduction: 0.59,
    effectNote: '59% LDL-C reduction vs placebo on top of statin (evolocumab, FOURIER).',
    evidence: ['FOURIER', 'ODYSSEY', 'ECDP_2022'],
  },
  bempedoic: {
    name: 'Bempedoic acid',
    dose: '180 mg orally once daily',
    planningReduction: 0.21,
    effectNote: '21% LDL-C reduction vs placebo in statin-intolerant patients (CLEAR Outcomes).',
    evidence: ['CLEAR_OUTCOMES', 'ECDP_2022'],
  },
  inclisiran: {
    name: 'Inclisiran',
    dose: '284 mg SC at day 0, month 3, then every 6 months',
    planningReduction: 0.50,
    effectNote: '~50% LDL-C reduction vs placebo (ORION-10/11). Clinician to confirm current outcome-trial status.',
    evidence: ['ORION_10_11', 'ECDP_2022'],
  },
});

/** Safety notes that change a specific regimen. Only label-based facts. */
export function regimenSafetyNotes(drug, { egfr } = {}, doseMg = null) {
  const notes = [];
  const d = drug.toLowerCase();
  if (d === 'rosuvastatin' && Number.isFinite(egfr) && egfr < 30) {
    notes.push('Severe renal impairment (CrCl <30, not on hemodialysis): FDA label — start 5 mg, do not exceed 10 mg daily.');
  }
  if (d === 'simvastatin' && Number(doseMg) === 80) {
    notes.push('Simvastatin 80 mg is restricted by FDA (myopathy risk) and is not suggested.');
  }
  return notes;
}
