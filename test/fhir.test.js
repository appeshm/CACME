import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDraftFromFhir } from '../src/fhir/mapping.js';

const loinc = (code, value, unit, date, id) => ({
  resourceType: 'Observation', id, status: 'final', effectiveDateTime: date,
  code: { coding: [{ system: 'http://loinc.org', code }] }, valueQuantity: { value, unit },
});

test('maps core PREVENT inputs from FHIR and keeps latest value', () => {
  const { draft, provenance } = buildDraftFromFhir({
    patient: { gender: 'female', birthDate: '1970-01-01' },
    observations: [
      loinc('2093-3', 190, 'mg/dL', '2024-01-01', 'a'),
      loinc('2093-3', 210, 'mg/dL', '2025-06-01', 'b'),
      loinc('2085-9', 55, 'mg/dL', '2025-06-01', 'c'),
      { resourceType: 'Observation', id: 'bp', status: 'final', effectiveDateTime: '2025-06-01',
        code: { coding: [{ system: 'http://loinc.org', code: '85354-9' }] },
        component: [{ code: { coding: [{ system: 'http://loinc.org', code: '8480-6' }] }, valueQuantity: { value: 134, unit: 'mm[Hg]' } }] },
    ],
    conditions: [{ clinicalStatus: { coding: [{ code: 'active' }] }, code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.9' }] } }],
    medications: [{ status: 'active', id: 'm1', medicationCodeableConcept: { text: 'Atorvastatin 20 mg tablet' } }],
  });
  assert.equal(draft.sex, 'female');
  assert.equal(draft.totalCholesterol, 210);
  assert.match(provenance.totalCholesterol, /Observation\/b/);
  assert.equal(draft.sbp, 134);
  assert.equal(draft.diabetes, true);
  assert.equal(draft.clinicalAscvd, false);
  assert.deepEqual(draft.currentTherapy, { statinDrug: 'Atorvastatin', statinDose: 20 });
});

test('refuses values with unexpected units (e.g., mmol/L cholesterol)', () => {
  const { draft, warnings } = buildDraftFromFhir({ observations: [loinc('2093-3', 5.2, 'mmol/L', '2025-01-01', 'x')] });
  assert.equal(draft.totalCholesterol, undefined);
  assert.ok(warnings.some((w) => w.includes('Unexpected unit')));
});
