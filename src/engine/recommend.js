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
  // Physician-lead decision: if pre-statin lipids are entered, estimate risk as statin-naive.
  const usePreStatin = onStatin && Number.isFinite(pt.untreatedTotalCholesterol) && Number.isFinite(pt.untreatedHdl);
  const preventInput = usePreStatin
    ? { ...pt, totalCholesterol: pt.untreatedTotalCholesterol, hdl: pt.untreatedHdl, onStatin: false }
    : { ...pt, onStatin };

  // ---- 1. Pathway -------------------------------------------------------
  if (pt.clinicalAscvd) {
    out.pathway = 'secondary';
    raise('high', 'Clinical ASCVD: high-intensity (or maximally tolerated) statin.', ['CHOLESTEROL_2018', 'DYSLIPIDEMIA_2026']);
    const sp = GUIDELINE.secondaryPrevention;
    const vhrReasons = [];
    if (pt.veryHighRisk) vhrReasons.push('very high risk (multiple major events or 1 major event + \u22652 high-risk conditions)');
    if (Number.isFinite(pt.egfr) && pt.egfr < sp.ckdEgfrThreshold) vhrReasons.push(`CKD stage 3+ (eGFR ${pt.egfr})`);
    if (pt.fh) vhrReasons.push('familial hypercholesterolemia');
    out.veryHighRisk = vhrReasons.length > 0;
    if (out.veryHighRisk) {
      const rule = sp.ldlGoalVeryHighRisk;
      goal(rule.value, `Clinical ASCVD with ${vhrReasons.join(', ')}`, rule.evidence, rule.status);
      flag('info', 'Very high risk: early nonstatin escalation (ezetimibe and/or PCSK9 mAb, bempedoic acid or inclisiran) if not at goal on maximally tolerated statin.', rule.evidence);
    } else {
      const rule = sp.ldlGoalAscvd;
      goal(rule.value, 'Clinical ASCVD (not very high risk)', rule.evidence, rule.status);
      flag('info', `Optional intensive goal: LDL-C <${rule.optionalGoal} mg/dL, non-HDL-C <85 and apoB <55 mg/dL by shared decision-making (COR 2a).`, rule.evidence);
    }
    if ((pt.enhancers || []).includes('lpa')) {
      flag('info', 'Elevated Lp(a) with clinical ASCVD: if LDL-C is not at goal, adding a PCSK9 mAb is favored.', ['GUIDELINE_2026_SUMMARY']);
    }
    flag('info', 'PREVENT is not used in patients with established ASCVD.', ['PREVENT_2024']);
  } else if (pt.fh || (Number.isFinite(pt.ldl) && pt.ldl >= GUIDELINE.severeHypercholesterolemia.ldlThreshold)) {
    out.pathway = 'severe';
    raise('high', 'LDL-C ≥190 mg/dL or familial hypercholesterolemia: high-intensity statin without needing risk calculation.', ['CHOLESTEROL_2018']);
    const sh = GUIDELINE.severeHypercholesterolemia;
    const why = [];
    if (pt.fh) why.push('HeFH');
    if (Number.isFinite(pt.cac?.score) && pt.cac.score > 0) why.push(`subclinical atherosclerosis (CAC ${pt.cac.score})`);
    const rf = sh.riskFactorKeys.filter((k) => pt[k] || (pt.enhancers || []).includes(k));
    if (rf.length) why.push(`ASCVD risk factors: ${rf.join(', ')}`);
    const rule = why.length ? sh.ldlGoalEnhanced : sh.ldlGoal;
    goal(rule.value, why.length ? `LDL-C \u2265190 / FH with ${why.join('; ')}` : 'LDL-C \u2265190 without HeFH, risk factors or subclinical atherosclerosis', rule.evidence, rule.status);
    flag('info', `Goal: LDL-C <${rule.value} mg/dL AND \u2265${Math.round(sh.ldlGoal.minReduction * 100)}% reduction from untreated baseline.`, rule.evidence);
    if (pt.fh) flag('warning', 'HeFH: general-population risk tools (PREVENT) should not be used, and CAC = 0 does not justify deferring statin.', ['DYSLIPIDEMIA_2026']);
    flag('info', 'If LDL-C stays ≥100 mg/dL despite maximally tolerated statin ± ezetimibe, inclisiran is reasonable (COR 2a; outcome trials pending).', ['DYSLIPIDEMIA_2026']);
    if (rf.length) flag('review', `"Additional ASCVD risk factors" was taken to mean: ${rf.join(', ')}. Confirm this applies.`, ['GUIDELINE_2026_SUMMARY']);
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
      if (usePreStatin) {
        flag('info', 'Risk calculated from the pre-statin total cholesterol and HDL-C entered (statin-naive estimate).', ['PREVENT_2024', 'PHYSICIAN_LEAD']);
      } else if (onStatin) {
        flag('review', 'Patient is on a statin and pre-statin lipids were not entered, so this is an on-treatment estimate and may understate risk. Enter pre-statin total cholesterol and HDL-C for a statin-naive estimate.', ['PREVENT_2024', 'PHYSICIAN_LEAD']);
      }
    }

    // Diabetes 40–75
    const dm = GUIDELINE.diabetes;
    if (pt.diabetes && pt.age >= dm.ageMin && pt.age <= dm.ageMax) {
      if (pt.diabetesModifiers) {
        raise(dm.withModifiers.statin, 'Diabetes, age 40\u201375, with ASCVD risk factors or diabetes-specific risk modifiers: high-intensity statin.', dm.evidence);
        goal(dm.withModifiers.ldlGoal, 'Diabetes with risk factors/modifiers', dm.evidence, 'clinician-confirmed');
      } else {
        raise(dm.minStatin, 'Diabetes, age 40\u201375: at least moderate-intensity statin.', dm.evidence);
        goal(dm.ldlGoal, 'Diabetes, age 40\u201375', dm.evidence, 'clinician-confirmed');
      }
    }

    // Low risk but untreated LDL-C 160–189, age 30–59
    const lr = GUIDELINE.lowRiskHighLdl;
    const baseLdl = onStatin ? pt.untreatedLdl : pt.ldl;
    if (out.tier === 'low' && pt.age >= lr.ageMin && pt.age <= lr.ageMax && Number.isFinite(baseLdl) && baseLdl >= lr.ldlMin && baseLdl <= lr.ldlMax) {
      raise(lr.statin, `Low 10-year risk but untreated LDL-C ${baseLdl} mg/dL (160\u2013189), age 30\u201359.`, lr.evidence);
      goal(lr.ldlGoal, 'Untreated LDL-C 160\u2013189, age 30\u201359', lr.evidence, 'clinician-confirmed');
    }
    // CKD stage 3+ (no ASCVD), age 40–75, LDL-C 70–189
    const ck = GUIDELINE.ckd;
    if (Number.isFinite(pt.egfr) && pt.egfr < ck.egfrBelow && pt.age >= ck.ageMin && pt.age <= ck.ageMax && Number.isFinite(pt.ldl) && pt.ldl >= ck.ldlMin && pt.ldl <= ck.ldlMax) {
      raise(ck.statin, `CKD stage 3+ (eGFR ${pt.egfr}), age 40–75: moderate-intensity statin, or moderate-intensity statin + ezetimibe.`, ck.evidence);
    }

    // No-benefit zone: untreated LDL-C <70 and non-HDL-C <100 without additional risk factors
    const nb = GUIDELINE.noBenefit;
    const uLdl = onStatin ? pt.untreatedLdl : pt.ldl;
    const uNonHdl = onStatin ? (pt.untreatedTotalCholesterol - pt.untreatedHdl) : (pt.totalCholesterol - pt.hdl);
    const anyRf = pt.diabetes || pt.smoker || pt.onBpMeds || (pt.enhancers || []).length > 0;
    if (Number.isFinite(uLdl) && uLdl < nb.ldlBelow && Number.isFinite(uNonHdl) && uNonHdl < nb.nonHdlBelow && !anyRf && !(pt.cac?.score > 0)) {
      flag('warning', 'Untreated LDL-C <70 and non-HDL-C <100 mg/dL with no additional risk factors: starting lipid-lowering therapy is unlikely to reduce ASCVD risk (COR 3: No Benefit).', nb.evidence);
    }
    if (Number.isFinite(uLdl) && uLdl < 70) {
      flag('info', 'PREVENT-based treatment thresholds were set for LDL-C 70–189 mg/dL.', ['DYSLIPIDEMIA_2026']);
    }

    // Hypertriglyceridemia (Figure 1)
    const h = GUIDELINE.htg;
    if (isHtg(pt)) {
      const rfs = htgRiskFactors(pt);
      if (pt.age >= h.withRiskFactor.ageMin && pt.age <= h.withRiskFactor.ageMax && rfs.length) {
        goal(h.withRiskFactor.ldlGoal, `Triglycerides ${pt.triglycerides} mg/dL, age 40–75 with ASCVD risk factor (${rfs.join(', ')})`, h.evidence, 'verified');
      } else if (pt.age < h.young.ageBelow && !(pt.enhancers || []).length) {
        goal(h.young.ldlGoal, `Triglycerides ${pt.triglycerides} mg/dL, age <50, no risk enhancers`, h.evidence, 'verified');
      }
      flag('review', 'Hypertriglyceridemia: when to start a statin is shown in guideline Figures 14–17, which this app has not encoded. Confirm secondary causes are addressed and 4–12 weeks of lifestyle change have been tried.', ['DYSLIPIDEMIA_2026']);
    }

    if (out.tier === 'low' && pt.age <= 59) {
      flag('info', 'The 2026 guideline also uses 30-year ASCVD risk \u226510% in adults 30\u201359. 30-year PREVENT is not yet built into this app.', ['GUIDELINE_2026_SUMMARY']);
    }

    // ---- 3. CAC ----------------------------------------------------------
    out.cac = interpretCac(pt, out, { raise, goal, flag });
  }

  // ---- 3b. Reduction from pre-treatment baseline -------------------------
  if (onStatin && Number.isFinite(pt.untreatedLdl) && Number.isFinite(pt.ldl) && pt.untreatedLdl > 0) {
    const achieved = 1 - pt.ldl / pt.untreatedLdl;
    out.achievedReduction = achieved;
    const needs50 = out.pathway !== 'primary' || out.tier === 'high';
    const msg = `LDL-C is ${Math.round(achieved * 100)}% lower than the pre-treatment value (${pt.untreatedLdl} \u2192 ${pt.ldl} mg/dL).`;
    if (needs50 && achieved < 0.5) flag('warning', `${msg} The \u226550% reduction target has not been met.`, ['DYSLIPIDEMIA_2026', 'CHOLESTEROL_2018']);
    else flag('info', msg, ['CHOLESTEROL_2018']);
  }

  if (Number.isFinite(pt.triglycerides) && pt.triglycerides >= 150) {
    flag('info', 'Triglycerides ≥150 mg/dL: non-HDL-C or apoB is preferred over LDL-C to guide decisions (COR 2a).', ['DYSLIPIDEMIA_2026']);
  }

  // ---- 4. Risk enhancers (informational) --------------------------------
  const enh = (pt.enhancers || []).map((id) => GUIDELINE.riskEnhancers.find((e) => e.id === id)).filter(Boolean);
  if (enh.length) {
    flag('info', `Risk enhancers present: ${enh.map((e) => e.label).join('; ')}. These favor initiating or intensifying statin in borderline/intermediate risk.`, ['CHOLESTEROL_2018']);
  }
  if (!pt.lpaMeasured) {
    flag('info', 'Lp(a) has not been recorded. The 2026 guideline recommends measuring Lp(a) at least once in all adults (COR 1).', ['DYSLIPIDEMIA_2026']);
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
    out.ldlGoal.apobValue = apobGoalFor(pt, out);
    if (out.ldlGoal.apobValue) addEv(GUIDELINE.apob.evidence);
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
    const present = z.exclusions.filter((k) => (k === 'diabetesOver40'
      ? pt.diabetes && pt.age > 40
      : pt[k] || (pt.enhancers || []).includes(k)));
    if (out.tier === 'borderline' || out.tier === 'intermediate') {
      if (present.length) {
        res.text = `CAC = 0 does NOT downgrade risk here because of: ${present.join(', ')}.`;
        flag('warning', res.text, z.evidence);
      } else {
        out.statin.intensity = 'defer';
        out.statin.reasons.push({ intensity: 'defer', reason: 'CAC = 0 in borderline/intermediate risk: reasonable to defer statin and reassess.', evidence: z.evidence });
        out.goalCandidates.length = 0; // no statin-driven goal while deferring
        const interval = `${z.repeatYears} years (guideline range ${z.repeatRange.join('–')} years, shorter when baseline risk is higher)`;
        res.text = `CAC = 0: reasonable to defer statin; repeat risk assessment / CAC in ${interval}.`;
        flag('info', res.text, z.evidence);
      }
    } else {
      res.text = 'CAC = 0 has been studied as a "de-risking" tool in borderline/intermediate risk only; it does not change this recommendation.';
      flag('review', res.text, z.evidence);
    }
    return res;
  }

  // CAC > 0 (2026 summary table, adopted by physician lead)
  const pctl = Number.isFinite(pt.cac?.percentile) ? pt.cac.percentile : null;
  const e = cfg.elevated;
  if (res.score >= e.min || (pctl != null && pctl >= e.percentile)) {
    res.category = 'elevated';
    const basis = res.score >= e.min ? `CAC ${res.score}` : `CAC at the ${pctl}th percentile`;
    raise(e.statin, `${basis}: high-intensity statin.`, e.evidence);
    goal(e.ldlGoal, `${basis} (\u2265${e.min} AU or \u2265${e.percentile}th percentile)`, e.evidence, e.status);
    flag('info', 'CAC ≥100 AU or ≥75th percentile: target ≥50% LDL-C reduction as well as the goal (COR 1).', e.evidence);
    res.text = `${basis}: high-intensity statin, LDL-C goal <${e.ldlGoal} mg/dL.`;
  } else {
    const m = cfg.mild;
    res.category = 'mild';
    raise(m.statin, `CAC ${res.score}: presence of coronary calcium favors statin therapy.`, m.evidence);
    goal(m.ldlGoal, 'CAC 1\u201399 (<75th percentile)', m.evidence, m.status);
    res.text = `CAC ${res.score}: moderate-intensity statin, LDL-C goal <${m.ldlGoal} mg/dL.`;
    if (pctl == null) flag('info', 'CAC percentile not entered. If the score is \u226575th percentile for age, sex and race (MESA), the goal becomes <70.', m.evidence);
  }
  if (res.score >= cfg.veryHigh.min) {
    const v = cfg.veryHigh;
    res.category = 'very-high';
    raise(v.statin, `Extensive CAC (\u2265${v.min} AU).`, v.evidence);
    goal(v.ldlGoal, `Extensive CAC \u2265${v.min}`, v.evidence, v.status);
    res.text = `CAC ${res.score}: extensive coronary calcium; LDL-C goal <${v.ldlGoal} mg/dL.`;
  } else if (res.score >= cfg.severe.min) {
    res.category = 'severe';
    flag('info', `Severe CAC (300\u2013999): optional intensive goal LDL-C <${cfg.severe.optionalGoal} mg/dL, non-HDL-C <85 and apoB <55 mg/dL (COR 2a).`, cfg.severe.evidence);
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
    // Physician-lead decision: also suggest PCSK9 mAb in high-risk primary prevention (goal <70), citing VESALIUS-CV.
    const highRiskPrimary = out.pathway === 'primary' && g != null && g <= 70;
    const pcsk9Appropriate = out.pathway !== 'primary' || pt.statinIntolerance || highRiskPrimary;
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
        evidence: key === 'pcsk9mab' && highRiskPrimary ? [...d.evidence, 'DYSLIPIDEMIA_2026', 'VESALIUS_CV', 'PHYSICIAN_LEAD'] : d.evidence,
      });
      if (key === 'pcsk9mab' && highRiskPrimary) {
        flag('info', 'PCSK9 mAb in high-risk primary prevention: the 2026 guideline rates adding a PCSK9 mAb or bempedoic acid as "may be reasonable" (COR 2b) after statin ± ezetimibe. VESALIUS-CV showed fewer first major events (3-point MACE HR 0.75). Many trial participants had coronary, peripheral or cerebrovascular atherosclerosis without prior MI or stroke, and all had LDL-C \u226590 mg/dL on therapy. Check payer criteria.', ['VESALIUS_CV']);
      }
    }
    if (out.pathway === 'primary' && !pt.statinIntolerance && !highRiskPrimary && (est == null || est > g)) {
      flag('review', 'If LDL-C remains above goal after maximally tolerated statin + ezetimibe, use of PCSK9 inhibitors or other agents in primary prevention (without severe hypercholesterolemia) requires clinician/specialist judgment.', ['ECDP_2022']);
    }
  }

  steps.push({
    kind: 'followup',
    text: `Recheck lipid panel (fasting or non-fasting) ${GUIDELINE.followUp.lipidRecheckWeeks.join('–')} weeks after starting or changing therapy, then every ${GUIDELINE.followUp.thereafterMonths.join('–')} months.`,
    evidence: GUIDELINE.followUp.evidence,
  });
  return steps;
}

function isHtg(pt) {
  const h = GUIDELINE.htg;
  return Number.isFinite(pt.triglycerides) && pt.triglycerides >= h.tgMin && pt.triglycerides <= h.tgMax;
}

// "ASCVD risk factor" for the hypertriglyceridemia row: same traditional set used for LDL-C ≥190.
function htgRiskFactors(pt) {
  return GUIDELINE.severeHypercholesterolemia.riskFactorKeys.filter((k) => pt[k] || (pt.enhancers || []).includes(k));
}

// ApoB goal only in the situations Figure 1 lists.
function apobGoalFor(pt, out) {
  const a = GUIDELINE.apob;
  const g = out.ldlGoal?.value;
  if (out.pathway === 'secondary') {
    if (out.veryHighRisk) return a.veryHighAscvd;
    return isHtg(pt) ? a.ascvdHtg : null;
  }
  if (out.pathway === 'primary') {
    if (isHtg(pt) && GUIDELINE.htg && pt.age >= 40 && pt.age <= 75 && htgRiskFactors(pt).length && g <= 70) return GUIDELINE.htg.withRiskFactor.apob;
    if ((isHtg(pt) || pt.diabetes) && a.byLdlGoal[g]) return a.byLdlGoal[g];
  }
  return null;
}
