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
  assert.ok(r.cac.text.includes('5 years'));
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

test('CAC 100-299 gives high-intensity statin and goal <70', () => {
  const r = recommend({ ...pp, cac: { score: 150 } });
  assert.equal(r.ldlGoal.value, 70);
  assert.equal(r.statin.intensity, 'high');
});

test('CAC 1-99 at >=75th percentile gives goal <70', () => {
  assert.equal(recommend({ ...pp, cac: { score: 40, percentile: 80 } }).ldlGoal.value, 70);
});

test('CAC 300-999 offers optional <55', () => {
  const r = recommend({ ...pp, cac: { score: 500 } });
  assert.equal(r.ldlGoal.value, 70);
  assert.ok(r.flags.some((f) => f.text.includes('optional intensive goal LDL-C <55')));
});

test('CAC >=300 gives high-intensity statin and goal <70', () => {
  const r = recommend({ ...pp, cac: { score: 300 } });
  assert.equal(r.ldlGoal.value, 70);
  assert.equal(r.statin.intensity, 'high');
});

test('CAC >=1000 gives goal <55', () => {
  assert.equal(recommend({ ...pp, cac: { score: 1200 } }).ldlGoal.value, 55);
});

test('ASCVD not very high risk: <70 with optional <55', () => {
  const r = recommend({ ...pp, clinicalAscvd: true });
  assert.equal(r.ldlGoal.value, 70);
  assert.ok(r.flags.some((f) => f.text.includes('Optional intensive goal')));
});

test('ASCVD with CKD stage 3+ is very high risk (<55)', () => {
  assert.equal(recommend({ ...pp, clinicalAscvd: true, egfr: 50 }).ldlGoal.value, 55);
});

test('LDL-C >=190 without risk factors or CAC has goal <100', () => {
  const r = recommend({ ...pp, onBpMeds: false, ldl: 200, cac: { score: 0 } });
  assert.equal(r.ldlGoal.value, 100);
});

test('diabetes: <100 without modifiers, <70 with', () => {
  const base = { ...pp, age: 50, diabetes: true, onBpMeds: false, sbp: 118 };
  assert.equal(recommend(base).ldlGoal.value, 100);
  const r = recommend({ ...base, diabetesModifiers: true });
  assert.equal(r.ldlGoal.value, 70);
  assert.equal(r.statin.intensity, 'high');
});

test('low risk, age 30-59, untreated LDL-C 160-189 gets goal <100', () => {
  const r = recommend({ ...pp, age: 40, sbp: 115, onBpMeds: false, totalCholesterol: 250, hdl: 60, ldl: 170 });
  assert.equal(r.tier, 'low');
  assert.equal(r.ldlGoal.value, 100);
});

test('LDL-C >=190 has goal <70 with >=50% reduction note', () => {
  const r = recommend({ ...pp, ldl: 200 });
  assert.equal(r.ldlGoal.value, 70);
  assert.ok(r.flags.some((f) => f.text.includes('50% reduction')));
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

test('pre-statin lipids give a statin-naive risk estimate', () => {
  const ther = { statinDrug: 'Atorvastatin', statinDose: 20 };
  const treated = recommend({ ...pp, totalCholesterol: 160, hdl: 50, currentTherapy: ther });
  const naive = recommend({ ...pp, totalCholesterol: 160, hdl: 50, untreatedTotalCholesterol: 240, untreatedHdl: 50, currentTherapy: ther });
  assert.ok(naive.risk.ascvd > treated.risk.ascvd);
  assert.ok(treated.flags.some((f) => f.text.includes('pre-statin lipids were not entered')));
});

test('warns when >=50% reduction from baseline is not met (secondary prevention)', () => {
  const r = recommend({ ...pp, clinicalAscvd: true, ldl: 90, untreatedLdl: 150, currentTherapy: { statinDrug: 'Rosuvastatin', statinDose: 20 } });
  assert.ok(r.flags.some((f) => f.level === 'warning' && f.text.includes('40% lower')));
});

test('high-risk primary prevention gets PCSK9 mAb after ezetimibe (VESALIUS-CV)', () => {
  const r = recommend({ ...pp, ldl: 140, cac: { score: 400 }, currentTherapy: { statinDrug: 'Atorvastatin', statinDose: 80 } });
  const step = r.plan.find((s) => s.drug === 'pcsk9mab');
  assert.ok(step);
  assert.ok(step.evidence.includes('VESALIUS_CV'));
});

test('patient at goal on statin is told to continue', () => {
  const r = recommend({ ...pp, ldl: 80, cac: { score: 45 }, currentTherapy: { statinDrug: 'Atorvastatin', statinDose: 20 } });
  assert.ok(r.plan.some((s) => s.text.includes('at goal')));
  assert.ok(!r.plan.some((s) => s.kind === 'nonstatin'));
});
