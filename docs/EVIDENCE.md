# Evidence log

Every rule in the engine points to an ID in `src/engine/evidence.js`. Each ID has a verification status:

- **verified**: checked against the primary source or an independent implementation.
- **secondary-source**: confirmed only through official summaries (ACC/AHA news, JACC Guideline-at-a-Glance, Medscape). The full text has not yet been reviewed line by line.
- **clinician-confirmed**: decided by the project's physician lead where the available guideline text was ambiguous (evidence ID `PHYSICIAN_LEAD`).
- **needs-review**: plausible but not confirmed. **Never applied automatically.** Shown to the clinician as a "review" note.

## Risk model
| Item | Source | Status |
|---|---|---|
| PREVENT base 10-year equations (total CVD, ASCVD, HF), all coefficients and transforms | Khan SS et al. Circulation 2024;149:430–449, Suppl. Table S12A | verified (see VALIDATION.md; external AHA-calculator check still pending) |
| Valid input ranges (age 30–79, TC 130–320, HDL 20–100, SBP 90–200, BMI 18.5–39.9, eGFR 15–140). Out-of-range inputs are **rejected, not clamped** | AHA PREVENT calculator | verified |

## 2026 summary table (physician lead)
The goal columns (<100 / <70 / <55), CAC, diabetes, LDL-C ≥190, ASCVD, ApoB and Lp(a) rules follow the physician lead's 2026 guideline summary table (Google Doc, Aug 2026), evidence ID `GUIDELINE_2026_SUMMARY`, status **clinician-confirmed**. This replaces the earlier interim choices.

## Risk tiers and goals (2026 ACC/AHA dyslipidemia guideline)
| Rule | Status |
|---|---|
| PREVENT-ASCVD 10-y tiers: low <3%, borderline 3–<5%, intermediate 5–<10%, high ≥10% | secondary-source |
| Borderline/intermediate → LDL-C goal <100 mg/dL; high → <70 mg/dL, ≥50% reduction | secondary-source |
| Intermediate → at least moderate-intensity statin | secondary-source |
| Very-high-risk ASCVD → LDL-C <55 mg/dL, non-HDL-C <85 mg/dL | secondary-source |
| Non-HDL-C goal = LDL-C goal + 30 mg/dL | secondary-source |
| Any CAC >0 → statin favored, LDL-C <100 | secondary-source |
| CAC 0 does not de-risk FH | secondary-source |
| CAC scoring for men >40, women >45 at borderline/intermediate risk | secondary-source |
| Measure Lp(a) in all adults | secondary-source |
| CAC 1–99 → <100; ≥100 or ≥75th %ile → <70; 300–999 → optional <55; ≥1000 → <55 | clinician-confirmed (summary table) |
| CAC 0 → rescan in 5 years | clinician-confirmed |
| ASCVD → <70 (optional <55); very high risk, + CKD 3+, or + FH → <55 | clinician-confirmed (summary table) |
| LDL-C ≥190 → <100, or <70 with HeFH / risk factors / CAC >0; ≥50% reduction | clinician-confirmed (summary table) |
| Diabetes 40–75 → <100; with modifiers → high-intensity, <70 | clinician-confirmed (summary table) |
| Low risk, 30–59, untreated LDL-C 160–189 → <100 | clinician-confirmed (summary table) |
| Optional ApoB goals <90 / <70 / <55 | clinician-confirmed (summary table) |
| On a statin: use pre-statin TC/HDL-C for PREVENT when entered | clinician-confirmed |

## 2018 AHA/ACC cholesterol guideline (Grundy et al., Circulation 2019)
| Rule | Status |
|---|---|
| Statin intensity table (Table 3) | verified |
| LDL-C ≥190 → high-intensity statin without risk calculation | verified |
| Diabetes age 40–75 → at least moderate-intensity statin | verified |
| CAC 0 → reasonable to withhold statin unless diabetes, smoking or family history of premature ASCVD | verified |
| Risk enhancer list | verified |
| Recheck lipids 4–12 weeks after starting or changing therapy | verified |

## Nonstatin therapy
| Drug | Effect used for projections | Source |
|---|---|---|
| Ezetimibe 10 mg | ~24% added to statin | IMPROVE-IT (Cannon, NEJM 2015). secondary-source for the exact % |
| PCSK9 mAb | 59% | FOURIER (Sabatine, NEJM 2017) |
| Bempedoic acid 180 mg | 21% | CLEAR Outcomes (Nissen, NEJM 2023) |
| Inclisiran 284 mg | ~50% | ORION-10/11 (Ray, NEJM 2020) |
| PCSK9 mAb in high-risk primary prevention | VESALIUS-CV (NEJM 2025): 3-point MACE HR 0.75. secondary-source; clinician-confirmed for use |
| Sequencing | statin → ezetimibe → PCSK9 mAb (or bempedoic acid if statin-intolerant) | 2022 ACC ECDP (Lloyd-Jones, JACC 2022) |

Statin projections use the **low end** of each intensity range (moderate 30%, high 50%). That errs toward expecting less effect, so the app suggests add-on therapy sooner rather than later.

## Deliberately not implemented
- PREVENT 30-year equations and the full model (UACR, HbA1c, SDI): coefficients not independently verified yet.
- MESA CAC percentile and the MESA risk score.
- Per-dose LDL-C effects within an intensity group (for example, the "rule of 6").
- Drug–drug interaction checking. The EHR's own interaction checking should be used.
