# External validation worksheet: PREVENT

**Status: NOT YET DONE. Needs a clinician to complete it before any clinical use.**

How the coefficients have been checked so far:
1. All 136 base-model 10-year coefficients were typed in from Khan et al. (Circulation 2024, Supplemental Table S12A).
2. Each one was matched byte-for-byte against the compiled constants in an independent implementation (PyPI `pyprevent` 0.1.6). The only miss was a truncated digit (0.360078 → 0.3600781), which was corrected.
3. The variable transforms (centering at age 55, non-HDL 3.5 mmol/L, HDL 1.3 mmol/L, SBP 110/130, eGFR 60/90, BMI 25/30; mg/dL→mmol/L factor 0.02586) match the constants in that implementation.
4. Unit tests check the reference-point math and that risk moves in the right direction.

**Still missing:** comparing outputs against the official AHA calculator
(https://professional.heart.org/en/guidelines-and-statements/prevent-calculator).
For each row, enter the inputs into the AHA calculator, record its outputs, and confirm they match to 0.1%.
"Statin" means currently on a statin. All cases use the base model (no UACR, HbA1c or zip code).

| # | Sex | Age | TC | HDL | SBP | BMI | eGFR | DM | Smoker | BP meds | Statin | ASCVD | Total CVD | HF | AHA ASCVD | AHA CVD | AHA HF |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|------|---|---|
| 1 | F | 50 | 200 | 50 | 120 | 25 | 90 | N | N | N | N | 1.3% | 2.0% | 0.7%  | | | |
| 2 | M | 50 | 200 | 50 | 120 | 25 | 90 | N | N | N | N | 1.9% | 2.7% | 1.0%  | | | |
| 3 | F | 58 | 228 | 52 | 138 | 29.4 | 82 | N | N | Y | N | 4.1% | 6.7% | 2.7%  | | | |
| 4 | M | 55 | 213 | 50 | 140 | 28 | 90 | N | N | Y | N | 4.6% | 7.3% | 2.9%  | | | |
| 5 | M | 65 | 240 | 38 | 150 | 32 | 58 | Y | Y | Y | N | 23.7% | 33.3% | 20.4%  | | | |
| 6 | F | 62 | 240 | 45 | 150 | 31 | 55 | Y | Y | Y | N | 20.3% | 31.5% | 18.6%  | | | |
| 7 | F | 45 | 180 | 65 | 112 | 22 | 105 | N | N | N | N | 0.5% | 0.8% | 0.3%  | | | |
| 8 | M | 72 | 170 | 42 | 132 | 27 | 48 | Y | N | Y | Y | 16.7% | 28.9% | 20.3%  | | | |
| 9 | F | 40 | 260 | 40 | 145 | 36 | 95 | N | Y | N | N | 3.5% | 4.9% | 1.5%  | | | |
| 10 | M | 35 | 190 | 45 | 124 | 24 | 120 | N | N | N | N | 0.7% | 0.9% | 0.3%  | | | |

If any row disagrees, do not use the app clinically until the cause is found.
