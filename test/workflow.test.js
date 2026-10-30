import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleSections } from '../src/engine/workflow.js';
import { recommend } from '../src/engine/recommend.js';

test('ASCVD hides PREVENT and CAC, keeps Lp(a) only', () => {
  const v = visibleSections({ clinicalAscvd: true, ldl: 90 });
  assert.equal(v.prevent, false);
  assert.equal(v.cac, false);
  assert.deepEqual(v.enhancers, ['lpa']);
  assert.equal(v.ascvdDetails, true);
});

test('FH hides PREVENT and CAC; LDL-C >=190 without FH still asks CAC', () => {
  assert.equal(visibleSections({ fh: true, ldl: 170 }).cac, false);
  const v = visibleSections({ ldl: 200 });
  assert.equal(v.cac, true);
  assert.equal(v.prevent, false);
  assert.equal(v.riskHistory, true);
});

test('primary prevention always asks CAC; CAC >=100 hides PREVENT', () => {
  assert.equal(visibleSections({ ldl: 130 }).cac, true);
  assert.equal(visibleSections({ ldl: 130 }).prevent, true);
  assert.equal(visibleSections({ ldl: 130, cac: { score: 150 } }).prevent, false);
  assert.equal(visibleSections({ ldl: 130, cac: { score: 40 } }).cacPercentile, true);
});

test('CAC >=100 with no PREVENT inputs still gives a goal without a PREVENT error', () => {
  const r = recommend({ ldl: 130, egfr: 80, cac: { score: 150 } });
  assert.equal(r.ldlGoal.value, 70);
  assert.equal(r.preventSkipped, true);
  assert.equal(r.riskErrors.length, 0);
});

test('missing CAC in primary prevention prompts for it', () => {
  const r = recommend({ sex: 'male', age: 55, totalCholesterol: 213, hdl: 50, ldl: 130, sbp: 140, egfr: 90,
    diabetes: false, smoker: false, onBpMeds: true });
  assert.ok(r.flags.some((f) => f.text.startsWith('CAC score not entered')));
  assert.equal(r.risk.heartFailure, null); // BMI omitted
  assert.ok(r.risk.ascvd > 0);
});

test('ezetimibe always precedes PCSK9 mAb, even with a large gap', () => {
  const r = recommend({ clinicalAscvd: true, veryHighRisk: true, ldl: 160, egfr: 80,
    currentTherapy: { statinDrug: 'Rosuvastatin', statinDose: 40 } });
  const drugs = r.plan.filter((s) => s.kind === 'nonstatin').map((s) => s.drug);
  assert.deepEqual(drugs.slice(0, 2), ['ezetimibe', 'pcsk9mab']);
  assert.match(r.plan.find((s) => s.drug === 'pcsk9mab').text, /on ezetimibe/);
});

test('statin intolerant, large gap: PCSK9 mAb first, then ezetimibe', () => {
  const r = recommend({ clinicalAscvd: true, veryHighRisk: true, ldl: 160, egfr: 80, statinIntolerance: true });
  const drugs = r.plan.filter((s) => s.kind === 'nonstatin').map((s) => s.drug);
  assert.deepEqual(drugs.slice(0, 2), ['pcsk9mab', 'ezetimibe']);
});

test('statin intolerant, small gap: bempedoic acid first', () => {
  const r = recommend({ clinicalAscvd: true, veryHighRisk: true, ldl: 65, egfr: 80, statinIntolerance: true });
  const drugs = r.plan.filter((s) => s.kind === 'nonstatin').map((s) => s.drug);
  assert.equal(drugs[0], 'bempedoic');
  assert.ok(!drugs.includes('ezetimibe') || drugs.indexOf('ezetimibe') > 0);
});
