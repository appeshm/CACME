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
| "Moderate-to-severe" CAC → high-intensity statin, LDL-C <70, defined as **CAC ≥300** | clinician-confirmed |
| CAC ≥1000 → LDL-C <70, with <55 shown as a consideration | clinician-confirmed |
| CAC 0 → rescan in 5 years | clinician-confirmed |
| All clinical ASCVD → LDL-C <55 | clinician-confirmed |
| LDL-C ≥190 / FH → LDL-C <70 and ≥50% reduction | clinician-confirmed |

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
| Sequencing | statin → ezetimibe → PCSK9 mAb (or bempedoic acid if statin-intolerant) | 2022 ACC ECDP (Lloyd-Jones, JACC 2022) |

Statin projections use the **low end** of each intensity range (moderate 30%, high 50%). That errs toward expecting less effect, so the app suggests add-on therapy sooner rather than later.

## Deliberately not implemented
- PREVENT 30-year equations and the full model (UACR, HbA1c, SDI): coefficients not independently verified yet.
- MESA CAC percentile and the MESA risk score.
- Per-dose LDL-C effects within an intensity group (for example, the "rule of 6").
- Drug–drug interaction checking. The EHR's own interaction checking should be used.
