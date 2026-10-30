// Runs only when the page was opened through an EHR (SMART on FHIR) launch.
import { buildDraftFromFhir } from '../src/fhir/mapping.js';

const launched = () => {
  try { return Boolean(sessionStorage.getItem('SMART_KEY')) || new URLSearchParams(location.search).has('code'); }
  catch { return false; }
};

async function all(client, url) {
  // fhirclient follows `next` links when pageLimit: 0
  const res = await client.request(url, { pageLimit: 0, flat: true });
  return Array.isArray(res) ? res.filter(Boolean) : [];
}

async function loadChart() {
  if (!window.FHIR || !launched()) return;
  const client = await window.FHIR.oauth2.ready();
  const pid = client.patient.id;
  const [patient, labs, vitals, social, conditions, medications] = await Promise.all([
    client.patient.read(),
    all(client, `Observation?patient=${pid}&category=laboratory&_count=200`),
    all(client, `Observation?patient=${pid}&category=vital-signs&_count=200`),
    all(client, `Observation?patient=${pid}&category=social-history&_count=50`),
    all(client, `Condition?patient=${pid}&_count=200`),
    all(client, `MedicationRequest?patient=${pid}&status=active&_count=200`),
  ]);
  const { draft, provenance, warnings } = buildDraftFromFhir({
    patient, observations: [...labs, ...vitals, ...social], conditions, medications,
  });
  window.CACME?.loadFromChart(draft, provenance, warnings);
  const btn = document.getElementById('ehr');
  if (btn) { btn.hidden = false; btn.onclick = () => window.CACME.loadFromChart(draft, provenance, warnings); }
}

loadChart().catch((e) => {
  const b = document.getElementById('banner');
  if (b) { b.hidden = false; b.textContent = `Could not load chart data: ${e.message}. Enter values manually.`; }
});
