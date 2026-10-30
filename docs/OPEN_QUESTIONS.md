# Open clinical questions for the physician lead

Answered items (2026-10-30) are recorded in `src/engine/evidence.js` as `PHYSICIAN_LEAD` with status **clinician-confirmed**.

The app does **not** guess on any of these. Each is either shown as a "review" note or left to the clinician.
Answer them (with the guideline section or table number) and the config in
`src/engine/guideline-config.js` can be updated in a few lines.

| # | Question | Current behavior | Where |
|---|---|---|---|
| 1 | ~~CAC ≥100 cutoff~~ **Answered: use CAC ≥300** for high-intensity statin + LDL-C <70. CAC 1–299 → moderate, <100. | Applied. | `cac.elevated` |
| 2 | ~~CAC ≥1000~~ **Answered: LDL-C <70, with a note to consider <55.** | Applied. | `cac.veryHigh` |
| 3 | ~~CAC = 0 repeat interval~~ **Answered (physician lead, 2026-10-30): 5 years.** | Applied. | `cac.zero.repeatYears` |
| 4 | ~~Secondary prevention goal~~ **Answered: <55 for all clinical ASCVD.** | Applied. | `secondaryPrevention.ldlGoalAscvd` |
| 5 | ~~LDL-C ≥190 / FH goal~~ **Answered: <70 and ≥50% reduction.** | Applied. | `severeHypercholesterolemia.ldlGoal` |
| 6 | **Diabetes.** Does 2026 change the diabetes-specific recommendations (age range, intensity, goal) beyond the PREVENT tier? | Uses 2018 (age 40–75 → at least moderate statin) plus PREVENT tier goal. | `diabetes` |
| 7 | **30-year PREVENT.** The 2026 guideline reportedly uses 30-year risk for some younger adults. Can you provide Suppl. Table S12 (30-year) so the coefficients can be entered and checked? | Not implemented. | `prevent.js` |
| 8 | **PREVENT full model.** Should UACR, HbA1c and SDI (zip code) be added? Needs Suppl. Tables S12B–D. | Not implemented. | `prevent.js` |
| 9 | **Very-high-risk definition.** Should the app compute very-high-risk status (major ASCVD events + high-risk conditions), or keep it as a clinician checkbox? | Checkbox. | UI |
| 10 | **Patients already on a statin.** PREVENT includes statin use as a predictor. For tier assignment in treated patients, should the app use the treated estimate, or request a pre-treatment LDL/TC? | Uses treated estimate and shows a caution. | `recommend.js` |
| 11 | **PCSK9 in primary prevention.** VESALIUS-CV (evolocumab, patients without prior MI or stroke) has been reported. Should PCSK9 mAb be a suggested step in high-risk primary prevention? | Only suggested in secondary prevention, severe hypercholesterolemia, or statin intolerance. Otherwise flagged. | `buildPlan` |
| 12 | **Ezetimibe effect size.** The app projects ~24% added reduction (IMPROVE-IT). Prefer a different, more conservative figure? | 24%. | `therapies.js` |
