# CACME: cardiovascular prevention planner

Clinical decision support for primary care. It estimates cardiovascular risk with the AHA **PREVENT** equations, refines the decision with a **coronary artery calcium (CAC)** score, sets an **LDL-C goal**, and suggests **statin intensity, doses and add-on therapy**, with a literature citation on every recommendation. It is built to plug into **Epic** as a SMART on FHIR app.

> Decision support only. Not FDA-cleared. Not validated for clinical use. See `docs/VALIDATION.md` and `docs/OPEN_QUESTIONS.md`.

## How it decides
1. **Pathway.** Clinical ASCVD → secondary prevention. LDL-C ≥190 or FH → severe hypercholesterolemia. Otherwise → primary prevention.
2. **Risk.** PREVENT base model, 10-year ASCVD / total CVD / heart failure. It refuses to calculate outside the validated input ranges.
3. **Tier.** 2026 ACC/AHA tiers: low <3%, borderline 3–<5%, intermediate 5–<10%, high ≥10%.
4. **CAC.** 0 → statin may be deferred (borderline/intermediate, no diabetes, smoking or family history). 1–299 → moderate-intensity statin, LDL-C <100. ≥300 → high-intensity, LDL-C <70. ≥1000 → also consider <55. Rescan CAC 0 in 5 years.
5. **Goal.** The strictest applicable LDL-C goal (non-HDL-C = LDL-C + 30).
6. **Plan.** Statin intensity and starting doses (2018 Table 3). Required % reduction. Projected LDL-C. Then ezetimibe, then PCSK9 mAb / bempedoic acid where appropriate (2022 ACC ECDP). Recheck lipids in 4–12 weeks.

Anything not confirmed in the literature is shown as a **review** note and never applied silently.

## Layout
```
src/engine/   risk + guideline logic (pure JS, no dependencies)
  prevent.js            PREVENT equations
  guideline-config.js   every threshold, in one reviewable file
  therapies.js          statin intensity table, nonstatin doses and effects
  recommend.js          decision engine
  evidence.js           citation registry with verification status
src/fhir/     FHIR R4 → input mapping (LOINC / ICD-10)
app/          web interface + SMART on FHIR launch
test/         unit tests (node --test)
docs/         evidence log, open questions, validation, Epic plan
tools/        builds a single-file demo (dist/preview.html)
```

## Run it
```
npm test                       # 23 unit tests
npm start                      # then open http://localhost:8080/app/
node tools/build-preview.mjs   # single-file demo in dist/
```
Requires Node 18+ and Python 3 (only for the simple local web server). No packages to install.
