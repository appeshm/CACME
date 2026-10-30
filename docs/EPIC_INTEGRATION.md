# Epic integration plan

## Path 1: SMART on FHIR app (scaffolded in this repo)
The app is already structured as a standard **SMART on FHIR (R4) EHR-launch** app:

- `app/launch.html` is the launch URL Epic calls. It starts OAuth2 using the bundled `fhirclient` 2.6.3 library.
- `app/index.html` is the redirect URL. `app/smart.js` reads the chart and pre-fills the form.
- `src/fhir/mapping.js` turns FHIR resources into calculator inputs. Every pre-filled value shows its source (Observation id and date), and **the clinician must confirm each field**.
- Scopes are **read-only**: Patient, Observation, Condition, MedicationRequest. The app writes nothing back.

### Steps
1. Register a developer account at https://fhir.epic.com and create an app with **EHR launch**, FHIR R4, and the scopes in `app/smart-config.js`.
2. Put the client ID in `app/smart-config.js`.
3. Hosting is done: launch URL `https://11well.com/ldl-goal-navigator/launch.html`, redirect URL `https://11well.com/ldl-goal-navigator/index.html` (HTTPS via GitHub Pages; no server-side code).
4. Test in the Epic sandbox with sandbox patients. Then work with your organization's Epic analysts to:
   - add any **local lab codes** (many sites use proprietary component IDs in addition to LOINC) to `LOINC` in `mapping.js`;
   - decide where the **CAC score** lives (often only in the radiology report text). No standard LOINC exists, so the clinician enters it manually for now;
   - validate the **ICD-10 lists** used for diabetes, ASCVD and FH;
   - embed the app in an Epic activity or BestPractice Advisory link.

### Data mapped (LOINC)
| Input | Codes |
|---|---|
| Total cholesterol | 2093-3 |
| HDL-C | 2085-9 |
| LDL-C | 13457-7 (calc), 18262-6, 2089-1 (direct) |
| Systolic BP | 8480-6 (alone or inside BP panel 85354-9) |
| BMI | 39156-5 |
| eGFR | 98979-8 (CKD-EPI 2021), 62238-1, 33914-3 |
| Lp(a) | 10835-7 (mg/dL), 43583-4 (nmol/L) |
| Smoking status | 72166-2 |

Values with unexpected units (for example, cholesterol in mmol/L) are **not** used. A warning is shown instead.

## Path 2 (later): CDS Hooks
For an in-workflow alert ("patient-view" hook) the engine in `src/engine/` is plain JavaScript with no browser dependencies, so it can run unchanged in a small Node.js CDS Hooks service. Not built yet.

## Regulatory note
Software that gives patient-specific treatment recommendations may be a medical device. FDA's 2022 Clinical Decision Support Software guidance describes when CDS is excluded from device regulation. One condition is that the clinician can independently review the basis for each recommendation, which is why every output here shows its sources. Get regulatory and compliance review before deployment.
