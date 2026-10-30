/**
 * FHIR R4 → calculator input mapping (pure functions; no network).
 * Designed for Epic SMART on FHIR, but uses only standard FHIR R4 resources.
 *
 * IMPORTANT: Every value pulled from the chart is returned with its source and date so the
 * clinician can confirm it. Nothing is auto-accepted; the UI pre-fills the form for review.
 *
 * Codes below are standard LOINC / ICD-10-CM. Local Epic builds often add proprietary codes;
 * those must be added per site after validation (see docs/EPIC_INTEGRATION.md).
 */

export const LOINC = Object.freeze({
  totalCholesterol: ['2093-3'],
  hdl: ['2085-9'],
  ldl: ['13457-7', '18262-6', '2089-1'], // calculated, direct (2)
  triglycerides: ['2571-8'],
  sbp: ['8480-6'], // also found as a component of BP panel 85354-9
  bmi: ['39156-5'],
  egfr: ['98979-8', '62238-1', '33914-3'], // CKD-EPI 2021 preferred, then older equations
  hba1c: ['4548-4'],
  lpaMass: ['10835-7'], // mg/dL
  lpaMolar: ['43583-4'], // nmol/L
  apob: ['1884-6'],
  hscrp: ['30522-7'],
  smokingStatus: ['72166-2'],
  // No widely adopted LOINC exists for the Agatston CAC score. Site must configure.
  cacScore: [],
});

// ICD-10-CM prefixes. These are deliberately narrow and REQUIRE local clinical validation.
export const ICD10 = Object.freeze({
  diabetes: ['E10', 'E11', 'E13'],
  ascvd: ['I20', 'I21', 'I22', 'I23', 'I24', 'I25', 'I63', 'I65', 'I66', 'I70', 'Z95.1', 'Z95.5'],
  fh: ['E78.01'],
});

// SNOMED smoking-status answers that mean "current smoker" (HL7 US Core value set).
const CURRENT_SMOKER_SNOMED = ['449868002', '428041000124106', '77176002', '428071000124103', '428061000124105'];

const codings = (cc) => (cc?.coding || []);
const hasLoinc = (obs, codes) => codings(obs.code).some((c) => c.system?.includes('loinc') && codes.includes(c.code));

function obsDate(o) {
  return o.effectiveDateTime || o.effectivePeriod?.start || o.issued || null;
}

function quantityFrom(obs, codes) {
  if (hasLoinc(obs, codes) && obs.valueQuantity) return obs.valueQuantity;
  for (const comp of obs.component || []) {
    if (codings(comp.code).some((c) => codes.includes(c.code)) && comp.valueQuantity) return comp.valueQuantity;
  }
  return null;
}

/** Most recent numeric value for a set of LOINC codes, with unit + date + provenance. */
export function latestQuantity(observations, codes, { expectUnits } = {}) {
  const hits = [];
  for (const o of observations) {
    if (o.status && !['final', 'amended', 'corrected', 'preliminary'].includes(o.status)) continue;
    const q = quantityFrom(o, codes);
    if (q && Number.isFinite(q.value)) hits.push({ value: q.value, unit: q.unit || q.code || '', date: obsDate(o), id: o.id });
  }
  hits.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const best = hits[0] || null;
  if (best && expectUnits && !expectUnits.some((u) => best.unit.toLowerCase().replace(/\s/g, '') === u)) {
    best.unitWarning = `Unexpected unit "${best.unit}" (expected ${expectUnits.join(' or ')}). Not used automatically.`;
  }
  return best;
}

function conditionMatches(cond, prefixes) {
  const active = !cond.clinicalStatus || codings(cond.clinicalStatus).some((c) => c.code === 'active');
  return active && codings(cond.code).some((c) => (c.system || '').includes('icd-10') && prefixes.some((p) => c.code?.startsWith(p)));
}

function ageFrom(birthDate, asOf = new Date()) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  let a = asOf.getFullYear() - b.getFullYear();
  const m = asOf.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < b.getDate())) a--;
  return a;
}

const STATINS = ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'lovastatin', 'fluvastatin', 'pitavastatin'];
const ANTIHYPERTENSIVE_HINTS = ['lisinopril', 'losartan', 'amlodipine', 'hydrochlorothiazide', 'chlorthalidone', 'valsartan', 'olmesartan', 'irbesartan', 'telmisartan', 'enalapril', 'ramipril', 'benazepril', 'metoprolol', 'carvedilol', 'nifedipine', 'diltiazem', 'spironolactone', 'indapamide'];

function medText(m) {
  const c = m.medicationCodeableConcept;
  return (c?.text || codings(c).map((x) => x.display).join(' ') || m.medicationReference?.display || '').toLowerCase();
}

/**
 * Build a *draft* calculator input from FHIR resources.
 * Returns { draft, provenance, warnings } — the UI shows provenance next to each field.
 */
export function buildDraftFromFhir({ patient, observations = [], conditions = [], medications = [] }) {
  const draft = {};
  const provenance = {};
  const warnings = [];
  const set = (k, v, src) => { draft[k] = v; provenance[k] = src; };

  if (patient) {
    const g = patient.gender;
    if (g === 'female' || g === 'male') set('sex', g, 'Patient.gender');
    else warnings.push('Patient.gender is not male/female; PREVENT requires sex at birth — enter manually.');
    const age = ageFrom(patient.birthDate);
    if (age != null) set('age', age, `Patient.birthDate (${patient.birthDate})`);
  }

  const mgdl = ['mg/dl'];
  const fields = [
    ['totalCholesterol', LOINC.totalCholesterol, mgdl],
    ['hdl', LOINC.hdl, mgdl],
    ['ldl', LOINC.ldl, mgdl],
    ['triglycerides', LOINC.triglycerides, mgdl],
    ['sbp', LOINC.sbp, ['mm[hg]', 'mmhg']],
    ['bmi', LOINC.bmi, ['kg/m2', 'kg/m^2']],
    ['egfr', LOINC.egfr, ['ml/min/1.73m2', 'ml/min/{1.73_m2}', 'ml/min/1.73m^2']],
  ];
  for (const [key, codes, units] of fields) {
    const q = latestQuantity(observations, codes, { expectUnits: units });
    if (!q) continue;
    if (q.unitWarning) { warnings.push(`${key}: ${q.unitWarning}`); continue; }
    set(key, q.value, `Observation/${q.id} (${q.date ?? 'undated'})`);
  }

  const lpa = latestQuantity(observations, LOINC.lpaMass) || latestQuantity(observations, LOINC.lpaMolar);
  if (lpa) { draft.lpaMeasured = true; provenance.lpaMeasured = `Lp(a) ${lpa.value} ${lpa.unit} (${lpa.date ?? 'undated'})`; draft.lpa = lpa; }

  // Smoking (US Core smoking status)
  const smoke = observations
    .filter((o) => hasLoinc(o, LOINC.smokingStatus))
    .sort((a, b) => String(obsDate(b)).localeCompare(String(obsDate(a))))[0];
  if (smoke) {
    const code = codings(smoke.valueCodeableConcept)[0]?.code;
    set('smoker', CURRENT_SMOKER_SNOMED.includes(code), `Observation/${smoke.id} smoking status`);
  }

  // Conditions
  if (conditions.length) {
    set('diabetes', conditions.some((c) => conditionMatches(c, ICD10.diabetes)), 'Condition (ICD-10 E10/E11/E13)');
    const ascvd = conditions.some((c) => conditionMatches(c, ICD10.ascvd));
    set('clinicalAscvd', ascvd, 'Condition (ICD-10 ASCVD codes) — VERIFY');
    if (conditions.some((c) => conditionMatches(c, ICD10.fh))) set('fh', true, 'Condition (ICD-10 E78.01)');
  }

  // Medications (active only)
  const active = medications.filter((m) => !m.status || m.status === 'active');
  const statin = active.find((m) => STATINS.some((s) => medText(m).includes(s)));
  if (statin) {
    const txt = medText(statin);
    const drug = STATINS.find((s) => txt.includes(s));
    const dose = (txt.match(/(\d+(?:\.\d+)?)\s*mg/) || [])[1];
    draft.currentTherapy = { ...(draft.currentTherapy || {}), statinDrug: drug[0].toUpperCase() + drug.slice(1), statinDose: dose ? Number(dose) : null };
    provenance.currentTherapy = `MedicationRequest/${statin.id}`;
  }
  if (active.some((m) => medText(m).includes('ezetimibe'))) draft.currentTherapy = { ...(draft.currentTherapy || {}), ezetimibe: true };
  if (active.some((m) => /evolocumab|alirocumab/.test(medText(m)))) draft.currentTherapy = { ...(draft.currentTherapy || {}), pcsk9: true };
  if (active.some((m) => medText(m).includes('inclisiran'))) draft.currentTherapy = { ...(draft.currentTherapy || {}), inclisiran: true };
  if (active.some((m) => medText(m).includes('bempedoic'))) draft.currentTherapy = { ...(draft.currentTherapy || {}), bempedoic: true };
  if (medications.length) {
    const bp = active.some((m) => ANTIHYPERTENSIVE_HINTS.some((h) => medText(m).includes(h)));
    set('onBpMeds', bp, 'MedicationRequest (name match — VERIFY; some agents have non-BP indications)');
  }

  warnings.push('All chart-derived values are a draft. Confirm each field before using the results.');
  return { draft, provenance, warnings };
}
