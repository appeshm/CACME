/**
 * Recommendation engine: risk → CAC refinement → LDL-C goal → therapy plan.
 *
 * Design rules (conservative by intent):
 *  1. Never extrapolate PREVENT outside its validated input ranges.
 *  2. Thresholds marked "needs-review" are shown to the clinician as flags, not applied,
 *     unless GUIDELINE.applyUnverifiedThresholds is true.
 *  3. Every output item carries evidence IDs (see evidence.js).
 *  4. The output is decision SUPPORT. It never replaces clinician judgment.
 */
import { calculatePrevent10yr, validatePreventInputs } from './prevent.js';
import { GUIDELINE } from './guideline-config.js';
import { STATIN_INTENSITY, NONSTATINS, classifyStatin, regimenSafetyNotes } from './therapies.js';

const INTENSITY_RANK = { none: 0, defer: 0, 'consider-moderate': 1, moderate: 2, high: 3 };

function maxIntensity(a, b) {
  return (INTENSITY_RANK[b] ?? 0) > (INTENSITY_RANK[a] ?? 0) ? b : a;
}

function tierFor(risk) {
  return GUIDELINE.riskTiers.find((t) => risk >= t.min && risk < t.max);
}

function usable(rule) {
  return rule && rule.value != null && (rule.status !== 'needs-review' || GUIDELINE.applyUnverifiedThresholds);
}

/**
 * @param {object} pt patient data — see README "Input fields".
 */
export function recommend(pt) {
  const out = {
    guidelineVersion: GUIDELINE.version,
    pathway: null,
    risk: null,
    riskErrors: [],
    tier: null,
    statin: { intensity: 'none', reasons: [] },
    ldlGoal: null,
    goalCandidates: [],
    cac: null,
    plan: [],
    flags: [],
    evidence: new Set(),
  };
  const addEv = (ids) => ids.forEach((i) => out.evidence.add(i));
  const flag = (level, text, evidence = []) => { out.flags.push({ level, text, evidence }); addEv(evidence); };
  const goal = (value, reason, evidence, status = 'secondary-source') => {
    out.goalCandidates.push({ value, reason, evidence, status });
    addEv(evidence);
  };
  const raise = (intensity, reason, evidence) => {
    out.statin.intensity = maxIntensity(out.statin.intensity, intensity);
    out.statin.reasons.push({ intensity, reason, evidence });
    addEv(evidence);
  };

  const ther = pt.currentTherapy || {};
  const onStatin = Boolean(ther.statinDrug);
  const preventInput = { ...pt, onStatin };

  // ---- 1. Pathway -------------------------------------------------------
  if (pt.clinicalAscvd) {
    out.pathway = 'secondary';
    raise('high', 'Clinical ASCVD: high-intensity (or maximally tolerated) statin.', ['CHOLESTEROL_2018', 'DYSLIPIDEMIA_2026']);
    const sp = GUIDELINE.secondaryPrevention;
    const rule = pt.veryHighRisk ? sp.ldlGoalVeryHighRisk : sp.ldlGoalAscvd;
    if (usable(rule)) goal(rule.value, pt.veryHighRisk ? 'Very-high-risk ASCVD' : 'Clinical ASCVD', rule.evidence, rule.status);
    else flag('review', `Secondary-prevention LDL-C goal (${rule.value} mg/dL) is not yet verified against the 2026 guideline text; clinician to confirm goal.`, rule.evidence);
    flag('info', 'PREVENT is not used in patients with established ASCVD.', ['PREVENT_2024']);
  } else if (pt.fh || (Number.isFinite(pt.ldl) && pt.ldl >= GUIDELINE.severeHypercholesterolemia.ldlThreshold)) {
    out.pathway = 'severe';
    raise('high', 'LDL-C ≥190 mg/dL or familial hypercholesterolemia: high-intensity statin without needing risk calculation.', ['CHOLESTEROL_2018']);
    const rule = GUIDELINE.severeHypercholesterolemia.ldlGoal;
    if (usable(rule)) {
      goal(rule.value, 'LDL-C ≥190 / FH', rule.evidence, rule.status);
      flag('info', `Goal: LDL-C <${rule.value} mg/dL AND ≥${Math.round(rule.minReduction * 100)}% reduction from untreated baseline.`, rule.evidence);
    }
    else flag('review', 'For LDL-C ≥190 / FH, the 2018 guideline supports adding ezetimibe if LDL-C stays ≥100 mg/dL on maximal statin. The 2026 goal for this group is not yet verified; clinician to confirm.', rule.evidence);
    flag('info', 'Consider evaluation for familial hypercholesterolemia and cascade screening of relatives.', ['CHOLESTEROL_2018']);
  } else {
    out.pathway = 'primary';
  }

  // ---- 2. PREVENT (primary prevention only) -----------------------------
  if (out.pathway === 'primary') {
    const errs = validatePreventInputs(preventInput);
    if (errs.length) {
      out.riskErrors = errs;
      flag('review', 'PREVENT could not be calculated (inputs missing or outside validated range). Risk tier requires clinician judgment.', ['PREVENT_2024']);
    } else {
      out.risk = calculatePrevent10yr(preventInput);
      addEv(['PREVENT_2024']);
      const tier = tierFor(out.risk.ascvd);
      out.tier = tier.id;
      const plan = GUIDELINE.tierPlan[tier.id];
      raise(plan.statin, `${tier.label} 10-year PREVENT-ASCVD risk: ${plan.text}`, plan.evidence);
      if (plan.ldlGoal != null) goal(plan.ldlGoal, `${tier.label} risk tier`, plan.evidence);
      if (onStatin) {
        flag('info', 'Patient is on a statin; PREVENT includes statin use as a predictor, but tier thresholds were defined for treatment-naive decision-making. Interpret with care.', ['PREVENT_2024']);
      }
    }

    // Diabetes 40–75 (2018, COR I)
    const dm = GUIDELINE.diabetes;
    if (pt.diabetes && pt.age >= dm.ageMin && pt.age <= dm.ageMax) {
      raise(dm.minStatin, 'Diabetes, age 40–75: at least moderate-intensity statin.', dm.evidence);
    }

    // ---- 3. CAC ----------------------------------------------------------
    out.cac = interpretCac(pt, out, { raise, goal, flag });
  }

  // ---- 4. Risk enhancers (informational) --------------------------------
  const enh = (pt.enhancers || []).map((id) => GUIDELINE.riskEnhancers.find((e) => e.id === id)).filter(Boolean);
  if (enh.length) {
    flag('info', `Risk enhancers present: ${enh.map((e) => e.label).join('; ')}. These favor initiating or intensifying statin in borderline/intermediate risk.`, ['CHOLESTEROL_2018']);
  }
  if (!pt.lpaMeasured) {
    flag('info', 'Lp(a) has not been recorded. The 2026 guideline recommends measuring Lp(a) in all adults as part of risk assessment.', ['DYSLIPIDEMIA_2026']);
  }

  // ---- 5. Choose goal (strictest applicable) ----------------------------
  if (out.goalCandidates.length) {
    const value = Math.min(...out.goalCandidates.map((c) => c.value));
    const basis = out.goalCandidates.filter((c) => c.value === value);
    out.ldlGoal = {
      value,
      nonHdlValue: value + 30, // non-HDL-C goal = LDL-C goal + 30 mg/dL
      reason: basis.map((c) => c.reason).join('; '),
      evidence: [...new Set(basis.flatMap((c) => c.evidence))],
      status: basis.some((c) => c.status === 'needs-review') ? 'needs-review' : basis[0].status,
    };
    addEv(['DYSLIPIDEMIA_2026']);
  }

  // ---- 6. Therapy plan -------------------------------------------------
  out.plan = buildPlan(pt, out, flag);
  out.evidence = [...out.evidence];
  return out;
}

function interpretCac(pt, out, { raise, goal, flag }) {
  const cfg = GUIDELINE.cac;
  const score = pt.cac?.score;
  const res = { score: Number.isFinite(score) ? score : null, category: null, text: null };
  const eligibleAge = pt.age >= (cfg.eligibleAge[pt.sex] ?? Infinity);

  if (res.score == null) {
    if ((out.tier === 'borderline' || out.tier === 'intermediate') && eligibleAge) {
      res.text = 'CAC scoring is reasonable here to refine the statin decision (borderline/intermediate risk, age eligible).';
      flag('info', res.text, ['DYSLIPIDEMIA_2026', 'CHOLESTEROL_2018']);
    }
    return res;
  }

  if (res.score === 0) {
    res.category = 'zero';
    const z = cfg.zero;
    const present = z.exclusions.filter((k) => pt[k] || (pt.enhancers || []).includes(k));
    if (out.tier === 'borderline' || out.tier === 'intermediate') {
      if (present.length) {
        res.text = `CAC = 0 does NOT downgrade risk here because of: ${present.join(', ')}.`;
        flag('warning', res.text, z.evidence);
      } else {
        out.statin.intensity = 'defer';
        out.statin.reasons.push({ intensity: 'defer', reason: 'CAC = 0 in borderline/intermediate risk: reasonable to defer statin and reassess.', evidence: z.evidence });
        out.goalCandidates.length = 0; // no statin-driven goal while deferring
        const interval = z.repeatYears ? `${z.repeatYears} years` : 'an interval chosen by the clinician (2018 guideline: 5–10 years; 2026 summaries cite ~5 years — not yet verified)';
        res.text = `CAC = 0: reasonable to defer statin; repeat risk assessment / CAC in ${interval}.`;
        flag('info', res.text, z.evidence);
      }
    } else {
      res.text = 'CAC = 0 has been studied as a "de-risking" tool in borderline/intermediate risk only; it does not change this recommendation.';
      flag('review', res.text, z.evidence);
    }
    return res;
  }

  // CAC > 0: any calcium supports LDL-C <100 (2026, secondary-source)
  const mild = cfg.mild;
  raise(mild.statin, `CAC = ${res.score}: presence of coronary calcium favors statin therapy.`, mild.evidence);
  goal(mild.ldlGoal, `CAC > 0`, mild.evidence, mild.status);
  res.category = 'mild';
  res.text = `CAC ${res.score}: supports statin therapy with LDL-C goal <${mild.ldlGoal} mg/dL.`;

  if (res.score >= cfg.elevated.min) {
    res.category = 'elevated';
    const e = cfg.elevated;
    if (e.status !== 'needs-review' || GUIDELINE.applyUnverifiedThresholds) {
      raise(e.statin, `CAC ≥${e.min}: high-intensity statin.`, e.evidence);
      goal(e.ldlGoal, `CAC ≥${e.min}`, e.evidence, e.status);
      res.text = `CAC ${res.score}: high-intensity statin with LDL-C goal <${e.ldlGoal} mg/dL.`;
    } else {
      flag('review', `CAC = ${res.score}. The 2026 guideline supports high-intensity statin with LDL-C <${e.ldlGoal} mg/dL for "moderate-to-severe" coronary calcium. Whether this maps to CAC ≥${e.min} has not been verified, so it is not applied automatically. Clinician to decide.`, e.evidence);
    }
  }
  if (res.score >= cfg.veryHigh.min) {
    res.category = 'very-high';
    flag('review', `CAC ≥${cfg.veryHigh.min}: event rates in observational cohorts approach those of secondary prevention. Consider a lower LDL-C goal of <${cfg.veryHigh.considerGoal} mg/dL (clinician decision; not applied automatically).`, cfg.veryHigh.evidence);
  }
  return res;
}

function buildPlan(pt, out, flag) {
  const steps = [];
  const ther = pt.currentTherapy || {};
  const ldl = Number.isFinite(pt.ldl) ? pt.ldl : null;
  const g = out.ldlGoal?.value ?? null;
  const target = out.statin.intensity;
  const targetIntensity = target === 'consider-moderate' ? 'moderate' : target;

  if (target === 'defer') {
    steps.push({ kind: 'lifestyle', text: 'No statin at this time (CAC = 0). Continue heart-healthy lifestyle and reassess.', evidence: ['CHOLESTEROL_2018'] });
    return steps;
  }
  steps.push({ kind: 'lifestyle', text: 'Heart-healthy lifestyle for all patients (diet, physical activity, weight, tobacco avoidance).', evidence: ['CHOLESTEROL_2018', 'DYSLIPIDEMIA_2026'] });
  if (target === 'none') return steps;

  if (ldl == null) flag('review', 'LDL-C not available — cannot calculate required reduction or project dose needs.', []);

  const currentIntensity = ther.statinDrug ? classifyStatin(ther.statinDrug, ther.statinDose) : null;
  if (ther.statinDrug && !currentIntensity) {
    flag('review', `Current statin "${ther.statinDrug} ${ther.statinDose ?? ''} mg" is not in the guideline intensity table; intensity could not be classified.`, ['CHOLESTEROL_2018']);
  }
  if (ther.statinDrug) steps.push(...regimenSafetyNotes(ther.statinDrug, pt, ther.statinDose).map((t) => ({ kind: 'safety', text: t, evidence: ['FDA_LABELS'] })));

  const needed = ldl != null && g != null ? Math.max(0, 1 - g / ldl) : null;
  // `est` = projected LDL-C after the steps so far; null once we can no longer project honestly.
  let est = ldl;
  let pendingStep = false; // a statin change must be made & rechecked before add-ons

  // ---- Statin step ----
  if (pt.statinIntolerance) {
    steps.push({ kind: 'statin', text: 'Statin intolerance reported. Consider re-challenge with a different statin, lower dose or alternate-day dosing; if not tolerated, use nonstatin therapy (ezetimibe, bempedoic acid, PCSK9 mAb).', evidence: ['ECDP_2022'] });
  } else if (!ther.statinDrug) {
    const grp = STATIN_INTENSITY[targetIntensity];
    let note = '';
    if (targetIntensity === 'moderate' && needed != null && needed > 0.49) {
      note = ` LDL-C must fall ~${Math.round(needed * 100)}% to reach goal, beyond the expected range for moderate intensity (30–49%); high-intensity statin may be preferred.`;
    }
    const regs = grp.regimens.slice(0, targetIntensity === 'high' ? 2 : 3);
    steps.push({
      kind: 'statin',
      text: `${target === 'consider-moderate' ? 'Option (shared decision): ' : 'Start '}${grp.label.toLowerCase()} statin, e.g., ${regs.map((r) => `${r.drug} ${r.preferredStart} mg daily`).join(' or ')} (expected LDL-C reduction ${grp.expectedLdlReduction}).${note}`,
      safety: regs.flatMap((r) => regimenSafetyNotes(r.drug, pt, r.preferredStart)),
      evidence: ['CHOLESTEROL_2018', 'FDA_LABELS'],
    });
    if (est != null) est *= 1 - grp.planningReduction;
    pendingStep = true;
  } else if (currentIntensity && INTENSITY_RANK[currentIntensity] < INTENSITY_RANK[targetIntensity]) {
    const grp = STATIN_INTENSITY[targetIntensity];
    steps.push({ kind: 'statin', text: `Increase statin from ${STATIN_INTENSITY[currentIntensity].label.toLowerCase()} to ${grp.label.toLowerCase()} (e.g., ${grp.regimens.map((r) => `${r.drug} ${r.doses.join('–')} mg`).join(' or ')}), if tolerated.`, evidence: ['CHOLESTEROL_2018'] });
    est = null; // no verified per-step figure for intensifying an existing statin
    pendingStep = true;
  } else if (ldl != null && g != null && ldl > g && currentIntensity && currentIntensity !== 'high') {
    steps.push({ kind: 'statin', text: 'LDL-C above goal on current statin: consider increasing to high-intensity statin, if tolerated, before or alongside adding nonstatin therapy.', evidence: ['CHOLESTEROL_2018', 'ECDP_2022'] });
    est = null;
    pendingStep = true;
  } else if (ther.statinDrug && ldl != null && g != null && ldl <= g) {
    steps.push({ kind: 'statin', text: `LDL-C ${ldl} mg/dL is at goal (<${g}). Continue current therapy.`, evidence: ['DYSLIPIDEMIA_2026'] });
  }

  out.projectedLdlAfterStatin = !ther.statinDrug && est != null ? Math.round(est) : null;
  out.requiredReduction = needed;

  // ---- Nonstatin add-ons (ECDP 2022 sequencing) ----
  const stillAbove = ldl != null && g != null && ldl > g && (est == null || est > g);
  if (stillAbove) {
    const sequence = [];
    if (!ther.ezetimibe) sequence.push('ezetimibe');
    if (pt.statinIntolerance && !ther.bempedoic) sequence.push('bempedoic');
    const pcsk9Appropriate = out.pathway !== 'primary' || pt.statinIntolerance;
    if (!ther.pcsk9 && !ther.inclisiran && pcsk9Appropriate) sequence.push('pcsk9mab');

    const prefix = pendingStep ? 'If LDL-C remains above goal at recheck, add' : 'Add';
    for (const key of sequence) {
      if (est != null && est <= g) break;
      const d = NONSTATINS[key];
      const from = est;
      if (est != null) est *= 1 - d.planningReduction;
      steps.push({
        kind: 'nonstatin', drug: key,
        text: `${prefix} ${d.name} (${d.dose}). ${d.effectNote}`,
        projectedFrom: from != null ? Math.round(from) : null,
        projectedLdl: est != null ? Math.round(est) : null,
        evidence: d.evidence,
      });
    }
    if (out.pathway === 'primary' && !pt.statinIntolerance && (est == null || est > g)) {
      flag('review', 'If LDL-C remains above goal after maximally tolerated statin + ezetimibe, use of PCSK9 inhibitors or other agents in primary prevention (without severe hypercholesterolemia) requires clinician/specialist judgment.', ['ECDP_2022']);
    }
  }

  steps.push({
    kind: 'followup',
    text: `Recheck lipid panel (fasting or non-fasting) ${GUIDELINE.followUp.lipidRecheckWeeks.join('–')} weeks after starting or changing therapy to assess response and adherence.`,
    evidence: GUIDELINE.followUp.evidence,
  });
  return steps;
}
