import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from '../src/engine/recommend.js';

const pp = {
  sex: 'male', age: 55, totalCholesterol: 213, hdl: 50, ldl: 130, sbp: 140, bmi: 28, egfr: 90,
  diabetes: false, smoker: false, onBpMeds: true,
};

test('every emitted evidence id exists', async () => {
  const { EVIDENCE } = await import('../src/engine/evidence.js');
  const r = recommend({ ...pp, cac: { score: 450 } });
  for (const id of r.evidence) assert.ok(EVIDENCE[id], id);
  for (const f of r.flags) for (const id of f.evidence) assert.ok(EVIDENCE[id], id);
});

test('clinical ASCVD skips PREVENT and uses secondary prevention', () => {
  const r = recommend({ ...pp, clinicalAscvd: true });
  assert.equal(r.pathway, 'secondary');
  assert.equal(r.risk, null);
  assert.equal(r.statin.intensity, 'high');
});

test('very-high-risk ASCVD goal is <55', () => {
  const r = recommend({ ...pp, clinicalAscvd: true, veryHighRisk: true });
  assert.equal(r.ldlGoal.value, 55);
});

test('LDL-C >=190 routes to severe hypercholesterolemia with high-intensity statin', () => {
  const r = recommend({ ...pp, ldl: 195 });
  assert.equal(r.pathway, 'severe');
  assert.equal(r.statin.intensity, 'high');
});

test('CAC = 0 in borderline/intermediate risk without exclusions defers statin', () => {
  const r = recommend({ ...pp, cac: { score: 0 } });
  assert.ok(['borderline', 'intermediate'].includes(r.tier));
  assert.equal(r.statin.intensity, 'defer');
  assert.equal(r.ldlGoal, null);
});

test('CAC = 0 does not de-risk a smoker', () => {
  const r = recommend({ ...pp, smoker: true, cac: { score: 0 } });
  assert.notEqual(r.statin.intensity, 'defer');
  assert.ok(r.flags.some((f) => f.text.includes('does NOT downgrade')));
});

test('CAC > 0 sets LDL-C goal <100 and at least moderate statin', () => {
  const r = recommend({ ...pp, cac: { score: 45 } });
  assert.equal(r.ldlGoal.value, 100);
  assert.equal(r.statin.intensity, 'moderate');
});

test('CAC >=100 thresholds are flagged, not silently applied', () => {
  const r = recommend({ ...pp, cac: { score: 250 } });
  assert.equal(r.ldlGoal.value, 100); // not auto-tightened to 70
  assert.ok(r.flags.some((f) => f.level === 'review' && f.text.includes('not applied automatically')));
});

test('high-risk patient gets high-intensity statin and goal <70; ezetimibe projected if needed', () => {
  const r = recommend({ sex: 'female', age: 62, totalCholesterol: 240, hdl: 45, ldl: 165, sbp: 150,
    bmi: 31, egfr: 55, diabetes: true, smoker: true, onBpMeds: true });
  assert.equal(r.tier, 'high');
  assert.equal(r.statin.intensity, 'high');
  assert.equal(r.ldlGoal.value, 70);
  assert.equal(r.projectedLdlAfterStatin, 83); // 165 * (1 - 0.50), rounded
  assert.ok(r.plan.some((s) => s.drug === 'ezetimibe'));
});

test('age outside 30-79 does not produce a PREVENT tier', () => {
  const r = recommend({ ...pp, age: 82 });
  assert.equal(r.tier, null);
  assert.ok(r.riskErrors.length > 0);
});

test('rosuvastatin renal warning when eGFR <30', async () => {
  const r = recommend({ ...pp, clinicalAscvd: true, egfr: 25 });
  const statinStep = r.plan.find((s) => s.kind === 'statin');
  assert.ok(statinStep.safety.some((t) => t.includes('do not exceed 10 mg')));
});

test('patient at goal on statin is told to continue', () => {
  const r = recommend({ ...pp, ldl: 80, cac: { score: 45 }, currentTherapy: { statinDrug: 'Atorvastatin', statinDose: 20 } });
  assert.ok(r.plan.some((s) => s.text.includes('at goal')));
  assert.ok(!r.plan.some((s) => s.kind === 'nonstatin'));
});
