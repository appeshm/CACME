/**
 * Which questions to ask. Rule: ask only what can change the LDL-C goal or the medicine choice.
 * Order: clinical ASCVD → LDL-C ≥190 / FH → CAC (always in primary prevention) → PREVENT → tier-specific.
 */
import { GUIDELINE } from './guideline-config.js';
import { cacSettlesGoal } from './recommend.js';

export function visibleSections(pt, result = null) {
  const ascvd = Boolean(pt.clinicalAscvd);
  const severe = !ascvd && (Boolean(pt.fh) || (Number.isFinite(pt.ldl) && pt.ldl >= GUIDELINE.severeHypercholesterolemia.ldlThreshold));
  const primary = !ascvd && !severe;
  const score = pt.cac?.score;
  const cacSettles = primary && cacSettlesGoal(pt);
  const needPrevent = primary && !cacSettles;
  const onStatin = Boolean(pt.currentTherapy?.statinDrug);
  const tier = result?.tier ?? null;

  // Risk enhancers: which ones can still change something
  let enhancers;
  if (ascvd) enhancers = ['lpa']; // elevated Lp(a) favors a PCSK9 mAb
  else if (severe) enhancers = ['familyHistoryPrematureAscvd', 'lpa']; // family history is an ASCVD risk factor here
  else if (cacSettles || tier === 'high') enhancers = ['lpa'];
  else enhancers = GUIDELINE.riskEnhancers.map((e) => e.id);

  const skipped = [];
  if (ascvd) skipped.push('PREVENT, CAC and most risk enhancers (clinical ASCVD sets the goal)');
  if (severe) skipped.push('PREVENT (LDL-C ≥190 / FH sets the goal)');
  if (severe && pt.fh) skipped.push('CAC (not indicated in FH)');
  if (cacSettles) skipped.push(`PREVENT inputs (CAC ${score} already sets the goal)`);
  if (primary && tier === 'high' && !cacSettles) skipped.push('risk enhancers (high risk already sets goal <70)');

  return {
    pathway: ascvd ? 'secondary' : severe ? 'severe' : 'primary',
    ascvdDetails: ascvd,
    cac: primary || (severe && !pt.fh),
    cacPercentile: (primary || (severe && !pt.fh)) && Number.isFinite(score) && score >= 1 && score < GUIDELINE.cac.elevated.min,
    patient: needPrevent,
    prevent: needPrevent,
    riskHistory: needPrevent || severe,
    diabetesModifiers: needPrevent && Boolean(pt.diabetes),
    preStatinTcHdl: needPrevent && onStatin,
    preStatinLdl: onStatin,
    statinDose: onStatin,
    enhancers,
    skipped,
  };
}
