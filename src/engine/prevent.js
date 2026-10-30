/**
 * AHA PREVENT equations — BASE model, 10-year risk.
 *
 * Source: Khan SS, Matsushita K, Sang Y, et al. Development and Validation of the
 * American Heart Association's PREVENT Equations. Circulation. 2024;149:430–449.
 * doi:10.1161/CIRCULATIONAHA.123.067626 — Supplemental Table S12A (base model, 10-year).
 *
 * Verification: every coefficient below was checked byte-for-byte (IEEE-754 double)
 * against an independent open-source implementation (PyPI "pyprevent" 0.1.6).
 * See docs/EVIDENCE.md.
 *
 * NOT implemented (deliberately, pending verified source tables):
 *   - 30-year risk equations
 *   - "Full" model add-ons (UACR, HbA1c, Social Deprivation Index)
 */

export const PREVENT_INPUT_LIMITS = Object.freeze({
  // Ranges accepted by the published equations / AHA online calculator.
  age: [30, 79],
  totalCholesterol: [130, 320], // mg/dL
  hdl: [20, 100], // mg/dL
  sbp: [90, 200], // mmHg
  bmi: [18.5, 39.9], // kg/m^2
  egfr: [15, 140], // mL/min/1.73m^2
});

const MGDL_TO_MMOL = 0.02586; // cholesterol conversion used by the PREVENT authors

// Coefficient order matches the predictor names in Table S12A.
const COEF = {
  female: {
    cvd: {
      constant: -3.307728, age: 0.7939329, nonHdl: 0.0305239, hdl: -0.1606857,
      sbpLow: -0.2394003, sbpHigh: 0.3600781, diabetes: 0.8667604, smoker: 0.5360739,
      egfrLow: 0.6045917, egfrHigh: 0.0433769, bpTx: 0.3151672, statin: -0.1477655,
      bpTxSbpHigh: -0.0663612, statinNonHdl: 0.1197879, ageNonHdl: -0.0819715,
      ageHdl: 0.0306769, ageSbpHigh: -0.0946348, ageDiabetes: -0.27057,
      ageSmoker: -0.078715, ageEgfrLow: -0.1637806,
    },
    ascvd: {
      constant: -3.819975, age: 0.719883, nonHdl: 0.1176967, hdl: -0.151185,
      sbpLow: -0.0835358, sbpHigh: 0.3592852, diabetes: 0.8348585, smoker: 0.4831078,
      egfrLow: 0.4864619, egfrHigh: 0.0397779, bpTx: 0.2265309, statin: -0.0592374,
      bpTxSbpHigh: -0.0395762, statinNonHdl: 0.0844423, ageNonHdl: -0.0567839,
      ageHdl: 0.0325692, ageSbpHigh: -0.1035985, ageDiabetes: -0.2417542,
      ageSmoker: -0.0791142, ageEgfrLow: -0.1671492,
    },
    hf: {
      constant: -4.310409, age: 0.8998235, sbpLow: -0.4559771, sbpHigh: 0.3576505,
      diabetes: 1.038346, smoker: 0.583916, bmiLow: -0.0072294, bmiHigh: 0.2997706,
      egfrLow: 0.7451638, egfrHigh: 0.0557087, bpTx: 0.3534442, bpTxSbpHigh: -0.0981511,
      ageSbpHigh: -0.0946663, ageDiabetes: -0.3581041, ageSmoker: -0.1159453,
      ageBmiHigh: -0.003878, ageEgfrLow: -0.1884289,
    },
  },
  male: {
    cvd: {
      constant: -3.031168, age: 0.7688528, nonHdl: 0.0736174, hdl: -0.0954431,
      sbpLow: -0.4347345, sbpHigh: 0.3362658, diabetes: 0.7692857, smoker: 0.4386871,
      egfrLow: 0.5378979, egfrHigh: 0.0164827, bpTx: 0.288879, statin: -0.1337349,
      bpTxSbpHigh: -0.0475924, statinNonHdl: 0.150273, ageNonHdl: -0.0517874,
      ageHdl: 0.0191169, ageSbpHigh: -0.1049477, ageDiabetes: -0.2251948,
      ageSmoker: -0.0895067, ageEgfrLow: -0.1543702,
    },
    ascvd: {
      constant: -3.500655, age: 0.7099847, nonHdl: 0.1658663, hdl: -0.1144285,
      sbpLow: -0.2837212, sbpHigh: 0.3239977, diabetes: 0.7189597, smoker: 0.3956973,
      egfrLow: 0.3690075, egfrHigh: 0.0203619, bpTx: 0.2036522, statin: -0.0865581,
      bpTxSbpHigh: -0.0322916, statinNonHdl: 0.114563, ageNonHdl: -0.0300005,
      ageHdl: 0.0232747, ageSbpHigh: -0.0927024, ageDiabetes: -0.2018525,
      ageSmoker: -0.0970527, ageEgfrLow: -0.1217081,
    },
    hf: {
      constant: -3.946391, age: 0.8972642, sbpLow: -0.6811466, sbpHigh: 0.3634461,
      diabetes: 0.923776, smoker: 0.5023736, bmiLow: -0.0485841, bmiHigh: 0.3726929,
      egfrLow: 0.6926917, egfrHigh: 0.0251827, bpTx: 0.2980922, bpTxSbpHigh: -0.0497731,
      ageSbpHigh: -0.1289201, ageDiabetes: -0.3040924, ageSmoker: -0.1401688,
      ageBmiHigh: 0.0068126, ageEgfrLow: -0.1797778,
    },
  },
};

/** Validate inputs. Returns a list of human-readable problems (empty = OK). */
export function validatePreventInputs(p) {
  const errors = [];
  if (p.sex !== 'female' && p.sex !== 'male') errors.push('Sex must be "female" or "male".');
  for (const [key, [lo, hi]] of Object.entries(PREVENT_INPUT_LIMITS)) {
    const v = p[key];
    // BMI is only used by the heart-failure equation; it is optional for CVD/ASCVD risk.
    if (key === 'bmi' && (v === undefined || v === null)) continue;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`${key} is required.`);
    } else if (v < lo || v > hi) {
      errors.push(`${key} = ${v} is outside the validated PREVENT range (${lo}–${hi}).`);
    }
  }
  for (const key of ['diabetes', 'smoker', 'onBpMeds', 'onStatin']) {
    if (typeof p[key] !== 'boolean') errors.push(`${key} must be yes/no.`);
  }
  if (Number.isFinite(p.totalCholesterol) && Number.isFinite(p.hdl) && p.hdl >= p.totalCholesterol) {
    errors.push('HDL-C must be lower than total cholesterol.');
  }
  return errors;
}

/** Transformed predictor values, exactly as defined in the PREVENT supplement. */
export function transformPredictors(p) {
  const age = (p.age - 55) / 10;
  const nonHdl = (p.totalCholesterol - p.hdl) * MGDL_TO_MMOL - 3.5;
  const hdl = (p.hdl * MGDL_TO_MMOL - 1.3) / 0.3;
  const sbpLow = (Math.min(p.sbp, 110) - 110) / 20;
  const sbpHigh = (Math.max(p.sbp, 110) - 130) / 20;
  const egfrLow = (Math.min(p.egfr, 60) - 60) / -15;
  const egfrHigh = (Math.max(p.egfr, 60) - 90) / -15;
  const bmiLow = (Math.min(p.bmi, 30) - 25) / 5;
  const bmiHigh = (Math.max(p.bmi, 30) - 30) / 5;
  const dm = p.diabetes ? 1 : 0;
  const smk = p.smoker ? 1 : 0;
  const bpTx = p.onBpMeds ? 1 : 0;
  const statin = p.onStatin ? 1 : 0;
  return {
    age, nonHdl, hdl, sbpLow, sbpHigh, egfrLow, egfrHigh, bmiLow, bmiHigh,
    diabetes: dm, smoker: smk, bpTx, statin,
    bpTxSbpHigh: bpTx * sbpHigh,
    statinNonHdl: statin * nonHdl,
    ageNonHdl: age * nonHdl,
    ageHdl: age * hdl,
    ageSbpHigh: age * sbpHigh,
    ageDiabetes: age * dm,
    ageSmoker: age * smk,
    ageBmiHigh: age * bmiHigh,
    ageEgfrLow: age * egfrLow,
  };
}

function logistic(x) {
  return Math.exp(x) / (1 + Math.exp(x));
}

function linearPredictor(coefs, t) {
  let x = coefs.constant;
  for (const [k, b] of Object.entries(coefs)) {
    if (k === 'constant') continue;
    if (!(k in t)) throw new Error(`Missing transformed predictor: ${k}`);
    x += b * t[k];
  }
  return x;
}

/**
 * Compute 10-year PREVENT risks (as fractions 0–1).
 * Throws if inputs are invalid — the app never extrapolates outside validated ranges.
 */
export function calculatePrevent10yr(p) {
  const errors = validatePreventInputs(p);
  if (errors.length) {
    const e = new Error('Invalid PREVENT inputs');
    e.validationErrors = errors;
    throw e;
  }
  const t = transformPredictors(p);
  const c = COEF[p.sex];
  return {
    model: 'PREVENT base model, 10-year (Khan et al., Circulation 2024)',
    totalCvd: logistic(linearPredictor(c.cvd, t)),
    ascvd: logistic(linearPredictor(c.ascvd, t)),
    // null when BMI was not provided
    heartFailure: Number.isFinite(p.bmi) ? logistic(linearPredictor(c.hf, t)) : null,
  };
}

export const _internal = { COEF, logistic, linearPredictor };
