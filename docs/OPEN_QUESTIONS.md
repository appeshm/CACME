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
| 6 | ~~Diabetes~~ **Answered: keep at least moderate-intensity statin at age 40–75**; goal from PREVENT tier / CAC. | Applied. | `diabetes` |
| 7 | **30-year PREVENT.** Physician lead will upload the Khan et al. supplement; coefficients to be entered and cross-checked. | Pending upload. | `prevent.js` |
| 8 | **PREVENT full model (UACR, HbA1c, SDI).** Pending the same supplement upload. | Pending upload. | `prevent.js` |
| 9 | ~~Very-high-risk definition~~ **Answered: not needed** since all ASCVD uses LDL-C <55. Checkbox removed from the form. | Applied. | UI |
| 10 | ~~Patients already on a statin~~ **Answered: ask for pre-statin lipids.** Optional pre-statin TC/HDL-C give a statin-naive estimate; otherwise the on-treatment estimate is shown with a review note. Pre-statin LDL-C is used to check the ≥50% reduction target. | Applied. | `recommend.js` |
| 11 | ~~PCSK9 in primary prevention~~ **Answered: suggest it** after statin + ezetimibe when the goal is <70 (high risk or CAC ≥300), citing VESALIUS-CV with a note on the trial population. | Applied. | `buildPlan` |
| 12 | ~~Ezetimibe effect size~~ **Answered: keep 24%.** | Applied. | `therapies.js` |
