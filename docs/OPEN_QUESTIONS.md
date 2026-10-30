# Open clinical questions for the physician lead

All rules were cross-checked against the full guideline text on 2026-10-30 (see docs/EVIDENCE.md). Answered items (2026-10-30) are recorded in `src/engine/evidence.js` as `PHYSICIAN_LEAD` with status **clinician-confirmed**.

The app does **not** guess on any of these. Each is either shown as a "review" note or left to the clinician.
Answer them (with the guideline section or table number) and the config in
`src/engine/guideline-config.js` can be updated in a few lines.

| # | Question | Current behavior | Where |
|---|---|---|---|
| 1 | ~~CAC cutoffs~~ **Answered (follows 2026 summary doc):** 1–99 & <75th %ile → moderate, <100; ≥100 or ≥75th %ile → high-intensity, <70; 300–999 → <70, optional <55; ≥1000 → <55. | Applied. | `cac` |
| 2 | ~~CAC ≥1000~~ **Answered: LDL-C <55.** | Applied. | `cac.veryHigh` |
| 3 | ~~CAC = 0 repeat interval~~ **Answered: 5 years** (full guideline: 3–7 years, COR 2a; range now shown). | Applied. | `cac.zero.repeatYears` |
| 4 | ~~Secondary prevention goal~~ **Answered (2026 summary doc):** <70 with <55 optional; very high risk, ASCVD + CKD 3+, or ASCVD + FH → <55. | Applied. | `secondaryPrevention` |
| 5 | ~~LDL-C ≥190 / FH~~ **Answered (2026 summary doc):** <100 if no HeFH, risk factors or subclinical atherosclerosis; otherwise <70. Always ≥50% reduction. | Applied. | `severeHypercholesterolemia` |
| 6 | ~~Diabetes~~ **Answered (2026 summary doc):** age 40–75 → ≥moderate statin, <100; with risk factors / diabetes-specific modifiers → high-intensity, <70. | Applied. | `diabetes` |
| 7 | **30-year PREVENT.** Physician lead will upload the Khan et al. supplement; coefficients to be entered and cross-checked. | Pending upload. | `prevent.js` |
| 8 | **PREVENT full model (UACR, HbA1c, SDI).** Pending the same supplement upload. | Pending upload. | `prevent.js` |
| 9 | ~~Very-high-risk definition~~ Checkbox restored (needed again now that non-very-high ASCVD is <70). CKD 3+ and FH with ASCVD are detected automatically. | Applied. | UI |
| 10 | ~~Patients already on a statin~~ **Answered: ask for pre-statin lipids.** Optional pre-statin TC/HDL-C give a statin-naive estimate; otherwise the on-treatment estimate is shown with a review note. Pre-statin LDL-C is used to check the ≥50% reduction target. | Applied. | `recommend.js` |
| 11 | ~~PCSK9 in primary prevention~~ **Answered: suggest it** after statin + ezetimibe when the goal is <70 (high risk or CAC ≥300), citing VESALIUS-CV with a note on the trial population. | Applied. | `buildPlan` |
| 12 | ~~Ezetimibe effect size~~ **Answered: keep 24%.** | Applied. | `therapies.js` |
| 13 | **"Additional ASCVD risk factors" for LDL-C ≥190.** The app uses smoking, diabetes, BP treatment and family history of premature ASCVD, and shows a review note listing which applied. Is that the right set? | Review note. | `severeHypercholesterolemia.riskFactorKeys` |
| 14 | **Hypertriglyceridemia rows** of the 2026 table (TG 150–499 with risk factors → <70; age <50 without enhancers → <100). Add a triglyceride field and these rules? | Not implemented. | — |
| 15 | **LDL-C calculation.** 2026 prefers Martin/Hopkins or Sampson/NIH over Friedewald. Should the app compute Sampson LDL-C from TC/HDL/TG? | Uses the LDL-C entered or from the chart. | — |
| 16 | **ApoB goals.** Figure 1 of the guideline is an image. Please confirm the apoB goals (<90 / <70 / <55) against it. | From summary table. | `apobGoals` |
