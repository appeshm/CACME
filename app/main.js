import { recommend } from '../src/engine/recommend.js';
import { GUIDELINE } from '../src/engine/guideline-config.js';
import { EVIDENCE } from '../src/engine/evidence.js';

const $ = (id) => document.getElementById(id);
const NUM = ['age', 'totalCholesterol', 'hdl', 'ldl', 'sbp', 'bmi', 'egfr', 'untreatedTotalCholesterol', 'untreatedHdl', 'untreatedLdl'];
const BOOL = ['diabetes', 'diabetesModifiers', 'smoker', 'onBpMeds', 'clinicalAscvd', 'veryHighRisk', 'fh', 'statinIntolerance', 'lpaMeasured'];
const THER = ['ezetimibe', 'pcsk9', 'inclisiran', 'bempedoic'];

export const EXAMPLE = {
  sex: 'female', age: 58, totalCholesterol: 228, hdl: 52, ldl: 148, sbp: 138, bmi: 29.4, egfr: 82,
  diabetes: false, smoker: false, onBpMeds: true, cac: 112, enhancers: ['familyHistoryPrematureAscvd'],
};

const enhBox = $('enhancers');
enhBox.innerHTML = GUIDELINE.riskEnhancers.map((e) =>
  `<label class="chk"><input type="checkbox" id="enh-${e.id}" data-enh="${e.id}"> ${e.label}</label>`).join('');

function fill(d, provenance = {}) {
  $('sex').value = d.sex || 'female';
  NUM.forEach((k) => { $(k).value = d[k] ?? ''; });
  BOOL.forEach((k) => { $(k).checked = Boolean(d[k]); });
  $('cac').value = d.cac ?? d.cacScore ?? '';
  $('cacPercentile').value = d.cacPercentile ?? '';
  const t = d.currentTherapy || {};
  $('statinDrug').value = t.statinDrug || '';
  $('statinDose').value = t.statinDose ?? '';
  THER.forEach((k) => { $(k).checked = Boolean(t[k]); });
  enhBox.querySelectorAll('[data-enh]').forEach((el) => { el.checked = (d.enhancers || []).includes(el.dataset.enh); });
  document.querySelectorAll('[data-prov]').forEach((el) => { el.textContent = provenance[el.dataset.prov] ? `from chart: ${provenance[el.dataset.prov]}` : ''; });
}

function read() {
  const n = (id) => { const v = $(id).value.trim(); return v === '' ? undefined : Number(v); };
  const pt = { sex: $('sex').value };
  NUM.forEach((k) => { pt[k] = n(k); });
  BOOL.forEach((k) => { pt[k] = $(k).checked; });
  const cac = n('cac');
  if (cac !== undefined) pt.cac = { score: cac, percentile: n('cacPercentile') };
  pt.currentTherapy = { statinDrug: $('statinDrug').value || null, statinDose: n('statinDose') ?? null };
  THER.forEach((k) => { pt.currentTherapy[k] = $(k).checked; });
  pt.enhancers = [...enhBox.querySelectorAll('[data-enh]:checked')].map((el) => el.dataset.enh);
  return pt;
}

const pct = (x) => (x * 100 < 1 ? '<1' : (x * 100).toFixed(1)) + '%';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const refs = (ids = []) => ids.length ? ` <span class="refs">[${ids.map(esc).join(', ')}]</span>` : '';
const TIER_LABEL = { low: 'Low', borderline: 'Borderline', intermediate: 'Intermediate', high: 'High' };

function scale(risk) {
  // Axis 0–20%; values above 20% pin to the end.
  const pos = Math.min(risk * 100, 20) / 20 * 100;
  return `<div class="scale" aria-hidden="true"><div class="bar"><span></span><span></span><span></span><span></span></div>
    <div class="marker"><i style="left:${pos}%"></i></div>
    <div class="ticks"><b style="left:0%;transform:none">0</b><b style="left:15%">3</b><b style="left:25%">5</b><b style="left:50%">10</b><b style="left:100%;transform:translateX(-100%)">20%+</b></div></div>`;
}

function renderClin(r) {
  const parts = [];
  if (r.pathway === 'primary' && r.risk) {
    parts.push(`<div class="card"><h2>10-year risk &middot; PREVENT</h2>
      <div class="risknums">
        <div><span class="v main">${pct(r.risk.ascvd)}</span><span class="k">ASCVD</span></div>
        <div><span class="v">${pct(r.risk.totalCvd)}</span><span class="k">Total CVD</span></div>
        <div><span class="v">${pct(r.risk.heartFailure)}</span><span class="k">Heart failure</span></div>
      </div>${scale(r.risk.ascvd)}
      <p style="margin:8px 0 0">Risk tier: <span class="pill ${r.tier}">${TIER_LABEL[r.tier]}</span></p></div>`);
  } else if (r.pathway === 'primary') {
    parts.push(`<div class="card"><h2>10-year risk &middot; PREVENT</h2><p style="margin:0 0 6px">Not calculated:</p><ul class="errors">${r.riskErrors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`);
  } else {
    const label = r.pathway === 'secondary' ? 'Secondary prevention (clinical ASCVD)' : 'Severe hypercholesterolemia (LDL-C ≥190 or FH)';
    parts.push(`<div class="card"><h2>Pathway</h2><p style="margin:0"><span class="pill neutral">${label}</span></p></div>`);
  }

  const g = r.ldlGoal;
  const cacTxt = r.cac?.score != null ? `<span class="sub">CAC ${r.cac.score}</span>` : '';
  parts.push(`<div class="card"><h2>LDL-C goal</h2>${g
    ? `<div class="goal"><span class="big">&lt;${g.value} mg/dL</span><span class="sub">non-HDL-C &lt;${g.nonHdlValue} mg/dL</span>${g.apobValue ? `<span class="sub">ApoB &lt;${g.apobValue} (optional)</span>` : ''}${
        r.requiredReduction != null ? `<span class="sub">needs ${Math.round(r.requiredReduction * 100)}% reduction from current</span>` : ''}${cacTxt}</div>
       <p class="refs" style="margin:6px 0 0">Basis: ${esc(g.reason)} &middot; ${esc(g.evidence.join(', '))}</p>`
    : `<p style="margin:0">${r.statin.intensity === 'defer' ? 'No goal while statin is deferred (CAC = 0).' : 'No automatic goal. Clinician to set goal (see review items).'}</p>`}</div>`);

  parts.push(`<div class="card"><h2>Plan</h2><ol class="plan">${r.plan.map((s) => `<li>${esc(s.text)}${
      s.projectedLdl != null ? `<br><span class="proj">est. LDL-C ${s.projectedFrom} → ${s.projectedLdl} mg/dL</span>` : ''}${
      (s.safety || []).map((t) => `<span class="safety">${esc(t)}</span>`).join('')}${refs(s.evidence)}</li>`).join('')}</ol>
    ${r.projectedLdlAfterStatin != null ? `<p class="refs" style="margin:10px 0 0">Projected LDL-C on the suggested statin: ~${r.projectedLdlAfterStatin} mg/dL (uses the low end of the guideline's expected reduction, so it errs toward needing more therapy).</p>` : ''}</div>`);

  if (r.flags.length) {
    const order = { warning: 0, review: 1, info: 2 };
    const sorted = [...r.flags].sort((a, b) => order[a.level] - order[b.level]);
    parts.push(`<div class="card"><h2>Notes for the clinician</h2><div class="flags">${sorted.map((f) =>
      `<div class="flag ${f.level}"><span class="lvl">${f.level}</span>${esc(f.text)}${refs(f.evidence)}</div>`).join('')}</div></div>`);
  }

  parts.push(`<details class="card"><summary><h2 style="display:inline">Sources (${r.evidence.length})</h2></summary><div class="evid" style="margin-top:10px">${r.evidence.map((id) => {
    const e = EVIDENCE[id];
    return `<div><span><b>${esc(id)}</b> <span class="status ${e.status}">${e.status.replace(/-/g, ' ')}</span></span><span>${esc(e.cite)}${e.doi ? ` doi:${esc(e.doi)}` : ''}</span><span class="refs">${esc(e.note)}</span></div>`;
  }).join('')}</div></details>`);
  $('clin').innerHTML = `<div style="display:grid;gap:16px">${parts.join('')}</div>`;
}

function renderPatient(r) {
  const p = [];
  if (r.risk) {
    const n = Math.round(r.risk.ascvd * 100);
    p.push(`<p>Based on your age, cholesterol, blood pressure and other health information, your estimated chance of having a heart attack or stroke in the next 10 years is about <b>${pct(r.risk.ascvd)}</b>${n >= 1 ? `. That means about ${n} out of 100 people like you would have one` : ''}.</p>`);
  }
  if (r.pathway === 'secondary') p.push('<p>Because you already have heart or blood-vessel disease, lowering your LDL ("bad") cholesterol is one of the most effective ways to prevent another event.</p>');
  if (r.pathway === 'severe') p.push('<p>Your LDL ("bad") cholesterol is very high. This usually needs medicine regardless of other risk factors, and your family members may benefit from testing too.</p>');
  if (r.cac?.score === 0 && r.statin.intensity === 'defer') p.push('<p>Your heart scan showed <b>no calcium</b> in the heart arteries. That is reassuring, and it is reasonable to hold off on a statin for now and check again in a few years.</p>');
  else if (r.cac?.score > 0) p.push(`<p>Your heart scan found calcium in the heart arteries (score ${r.cac.score}). Calcium is a sign of plaque, and it means cholesterol-lowering medicine is likely to help you.</p>`);
  if (r.ldlGoal) p.push(`<p>Your LDL cholesterol goal is <b>below ${r.ldlGoal.value} mg/dL</b>.${Number.isFinite(read().ldl) ? ` Your latest LDL is ${read().ldl} mg/dL.` : ''}</p>`);
  const meds = r.plan.filter((s) => s.kind === 'statin' || s.kind === 'nonstatin');
  if (meds.length) p.push('<p>Your clinician may talk with you about cholesterol medicine. A statin is usually the first choice. If your LDL is still above goal after a few weeks, another medicine can be added.</p>');
  p.push('<p>Healthy eating, regular activity, not smoking, and good blood pressure control lower your risk whatever medicines you take.</p>');
  p.push('<p class="refs">This summary supports, and does not replace, a conversation with your clinician.</p>');
  $('pt').innerHTML = `<h2>Your heart-health summary</h2>${p.join('')}`;
}

function run() {
  const r = recommend(read());
  renderClin(r);
  renderPatient(r);
  return r;
}

$('form').addEventListener('submit', (e) => { e.preventDefault(); run(); });
$('form').addEventListener('change', run);
$('clear').addEventListener('click', () => { fill({}); $('banner').hidden = true; run(); });
$('example').addEventListener('click', () => { fill(EXAMPLE); $('banner').hidden = false; run(); });
const setView = (pt) => { $('viewPt').setAttribute('aria-pressed', pt); $('viewClin').setAttribute('aria-pressed', !pt); $('pt').hidden = !pt; $('clin').hidden = pt; };
$('viewClin').addEventListener('click', () => setView(false));
$('viewPt').addEventListener('click', () => setView(true));

// Exposed for the SMART on FHIR launcher (smart.js) to pre-fill from the chart.
window.CACME = {
  loadFromChart(draft, provenance, warnings) {
    fill(draft, provenance);
    $('banner').innerHTML = `<strong>Pre-filled from the chart.</strong> Confirm every field before relying on results. ${warnings.map(esc).join(' ')}`;
    $('banner').hidden = false;
    run();
  },
};

fill(EXAMPLE);
run();
