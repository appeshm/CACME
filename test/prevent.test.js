import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrevent10yr, validatePreventInputs, transformPredictors } from '../src/engine/prevent.js';

const base = {
  sex: 'female', age: 50, totalCholesterol: 200, hdl: 50, sbp: 120, bmi: 25, egfr: 90,
  diabetes: false, smoker: false, onBpMeds: false, onStatin: false,
};

test('reference point: all transformed predictors are 0 at the centering values', () => {
  // Centering values from the PREVENT supplement: age 55, non-HDL 3.5 mmol/L, HDL 1.3 mmol/L,
  // SBP 130 (upper spline), eGFR 90 (upper spline), BMI 30 (upper spline).
  const t = transformPredictors({ ...base, age: 55, sbp: 130, egfr: 90, bmi: 30,
    hdl: 1.3 / 0.02586, totalCholesterol: (1.3 + 3.5) / 0.02586 });
  for (const k of ['age', 'nonHdl', 'hdl', 'sbpHigh', 'egfrHigh', 'bmiHigh']) {
    assert.ok(Math.abs(t[k]) < 1e-9, `${k} should be 0, got ${t[k]}`);
  }
});

test('at the reference point, risk equals logistic(constant)', () => {
  const p = { ...base, age: 55, sbp: 130, egfr: 90, bmi: 30, hdl: 1.3 / 0.02586, totalCholesterol: 4.8 / 0.02586 };
  // At reference: sbpLow = (110-110)/20 = 0, egfrLow = 0, bmiLow = (30-25)/5 = 1 (HF only).
  const r = calculatePrevent10yr(p);
  const L = (x) => Math.exp(x) / (1 + Math.exp(x));
  assert.ok(Math.abs(r.totalCvd - L(-3.307728)) < 1e-12);
  assert.ok(Math.abs(r.ascvd - L(-3.819975)) < 1e-12);
  assert.ok(Math.abs(r.heartFailure - L(-4.310409 + -0.0072294 * 1)) < 1e-12);
});

test('risk increases with each adverse factor', () => {
  const r0 = calculatePrevent10yr(base).ascvd;
  for (const change of [{ smoker: true }, { diabetes: true }, { sbp: 160 }, { age: 65 }, { egfr: 40 }]) {
    assert.ok(calculatePrevent10yr({ ...base, ...change }).ascvd > r0, JSON.stringify(change));
  }
});

test('out-of-range inputs are rejected, never extrapolated', () => {
  assert.throws(() => calculatePrevent10yr({ ...base, age: 82 }), /Invalid/);
  assert.throws(() => calculatePrevent10yr({ ...base, totalCholesterol: 350 }), /Invalid/);
  assert.ok(validatePreventInputs({ ...base, bmi: 45 }).some((e) => e.includes('bmi')));
  assert.ok(validatePreventInputs({ ...base, smoker: undefined }).length > 0);
});

test('regression snapshot (values must not drift silently)', () => {
  // Pinned outputs of this implementation. If these change, the change must be deliberate.
  // External validation against the AHA online calculator is tracked in docs/VALIDATION.md.
  const r = calculatePrevent10yr({ sex: 'male', age: 55, totalCholesterol: 213, hdl: 50, sbp: 140,
    bmi: 28, egfr: 90, diabetes: false, smoker: false, onBpMeds: true, onStatin: false });
  assert.equal(r.ascvd.toFixed(4), '0.0461');
  assert.equal(r.totalCvd.toFixed(4), '0.0729');
  assert.equal(r.heartFailure.toFixed(4), '0.0287');
});
