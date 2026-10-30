// Fill in after registering the app at https://fhir.epic.com (Epic on FHIR) — see docs/EPIC_INTEGRATION.md.
export const SMART_CONFIG = {
  clientId: 'REPLACE_WITH_EPIC_CLIENT_ID',
  // Read-only access to the launching patient's data. No write scopes are requested.
  scope: [
    'launch', 'openid', 'fhirUser',
    'patient/Patient.read',
    'patient/Observation.read',
    'patient/Condition.read',
    'patient/MedicationRequest.read',
  ].join(' '),
};
