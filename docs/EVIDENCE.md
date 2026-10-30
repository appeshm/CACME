# Evidence log

**2026-10-30: all guideline rules were cross-checked against the full 2026 guideline text** (Blumenthal RS, Morris PB, et al. Circulation. 2026;153; DOI 10.1161/CIR.0000000000001423), provided by the physician lead. See "Crosscheck against full guideline" at the end.

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


## Crosscheck against full guideline (2026-10-30)
| Parameter | Guideline (section, COR/LOE) | App before | Result |
|---|---|---|---|
| PREVENT scope and tiers | 4.2.3.2: age 30–79, no ASCVD, LDL-C 70–189; <3 / 3–<5 / 5–<10 / ≥10% (COR 1) | same | ✅ match; added note when LDL-C <70 |
| Borderline / intermediate | moderate statin (2a / 1A), goal <100 (2a) | same | ✅ |
| High ≥10% | high-intensity ≥50% (1A), <70 (2a), ezetimibe (2a), PCSK9 mAb or bempedoic acid (2b) | same | ✅ PCSK9 step now cites COR 2b |
| Low risk 30–59, LDL-C 160–189 or 30-y ≥10% | moderate statin reasonable (2a) | same, goal <100 from summary table | ✅ goal <100 kept from summary table |
| Untreated LDL-C <70 & non-HDL-C <100, no risk factors | LLT unlikely to help (3: No Benefit) | missing | ➕ added |
| CAC = 0 | defer, repeat CAC in **3–7 y** (2a); not with FH/LDL >190, diabetes age >40, smoking, strong family history | 5 y; diabetes any age | ✏️ 5 y kept (within range), range shown; diabetes exclusion now age >40 |
| CAC 1–99 & <75th %ile | moderate, <100 (2a) | same | ✅ |
| CAC 100–299 or ≥75th %ile | ≥50% reduction, <70 (COR 1) | same | ✅ added ≥50% note |
| CAC 300–999 | <70 (COR 1); <55 reasonable (2a) | same | ✅ |
| CAC ≥1000 | <55 (COR 1) | same | ✅ |
| LDL-C ≥190 | <100 (1); <70 with HeFH, risk factors or coronary calcium (1); <55 with ASCVD (1); inclisiran if ≥100 (2a) | same | ✅ added inclisiran note |
| HeFH | PREVENT should not be used (3: Harm); CAC 0 does not de-risk | PREVENT skipped | ✅ added explicit warning |
| Diabetes 40–75 | moderate, <100 (1A); multiple risk factors → high, <70 (2a) | checkbox "risk factors or modifiers" | ✏️ checkbox reworded to "multiple ASCVD risk factors or diabetes-specific enhancers (Table 17)" |
| ASCVD not very high risk | high-intensity, <70 (1A); <55 reasonable (2a) | same | ✅ |
| ASCVD very high risk | <55 (1A); ezetimibe and/or PCSK9 mAb (1A); inclisiran only if mAb not possible (2a) | same | ✅ definition text updated to 2026 Figure 10 |
| CKD 3+ with ASCVD | <55, ≥50% (COR 1, 4.2.8.8) | same | ✅ |
| CKD 3+ without ASCVD, 40–75, LDL-C 70–189 | moderate statin ± ezetimibe (COR 1) | missing | ➕ added |
| Statin intensity | Table 6 | 2018 Table 3 | ✏️ pitavastatin 1, 2, 4 mg (3 mg removed) |
| Risk enhancers | Table 13 | 2018 list | ✏️ replaced with 2026 list (adds Filipino ancestry, polygenic risk, CKM, reproductive markers; apoB ≥120; TG ≥175 nonfasting / ≥150 fasting; ABI removed) |
| Ezetimibe effect | "lowered LDL-C by 24%" | 24% | ✅ |
| Follow-up | lipids 4–12 wk after change, then every 6–12 mo | 4–12 wk | ✏️ added 6–12 mo |
| Lp(a) | at least once in all adults (COR 1) | same | ✅ |
| ApoB goals | Figure 1 (verified from screenshot): apoB <90 / <70 only with TG 150–499 or diabetes; <55 for very-high-risk ASCVD; <70 for ASCVD + TG 150–499; <55 optional with CAC 300–999 or ASCVD not very high | shown for every goal | ✏️ now shown only where Figure 1 lists it |
| Hypertriglyceridemia (TG 150–499) | Figure 1: age 40–75 + ≥1 risk factor → LDL-C <70, apoB <70; age <50 without enhancers → <100. Non-HDL-C/apoB preferred when TG ≥150 (2a). Statin initiation: Figures 14–17 | missing | ➕ goals added; initiation flagged for clinician (Figures 14–17 not encoded) |
| LDL-C calculation | Martin/Hopkins or Sampson/NIH preferred (COR 1) | uses entered value | ⚠️ open question 15 |

Figure 1 also confirms every LDL-C/non-HDL-C goal already in the app (primary, severe, diabetes, subclinical atherosclerosis, clinical ASCVD).
