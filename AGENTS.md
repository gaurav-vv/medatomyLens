# AGENTS.md

# 3D Medical Anatomy Visualizer — Agent Development Rules

> Version 2. All original rules are preserved. Items marked **(v2)** are new or extended.
> New sections are numbered 103–118 at the end of this file.

## 1. PROJECT MISSION

Build a free-first web application that converts medical reports into an interactive, educational 3D visualization of the human body.

Core flow:

```text
Medical Report
      ↓
Document Extraction
      ↓
Finding Detection
      ↓
Medical Term Normalization
      ↓
Anatomical Mapping (organ + sub-region where the report gives location)
      ↓
3D Body View (affected organs highlighted)
      ↓
Click organ → 3D Organ View (reported area + normal reference)
      ↓
Explanation Panel (what the report says, what the test measures)
      ↓
Source Report Reference
```

The application must help users understand **which anatomical structures are associated with findings in their reports**, **where in that structure the report places the finding (when the report says so)**, and **what the same structure looks like when normal**.

The application is an educational visualization tool.

It MUST NOT present itself as an autonomous diagnostic system.

---

# 2. ABSOLUTE DEVELOPMENT RULES

These rules override convenience.

## RULE 1 — DO NOT BREAK EXISTING FEATURES

Never modify a working feature unless the current task explicitly requires it.

Before changing any existing component:

1. Understand how it currently works.
2. Identify all dependencies.
3. Check whether other screens use it.
4. Make the smallest possible change.
5. Verify that existing functionality still works.

Do NOT rewrite working code merely because another implementation appears cleaner.

---

## RULE 2 — MINIMAL CHANGES

Always prefer:

```text
small targeted change
```

over:

```text
large refactor
```

Do not refactor unrelated code while implementing a feature.

Do not rename files, components, variables, APIs, routes, database tables, or functions unless required.

---

## RULE 3 — NEVER REMOVE FUNCTIONALITY WITHOUT EXPLICIT PERMISSION

Never:

* delete an existing feature
* remove an existing API
* remove database fields
* replace a working component
* remove authentication
* remove navigation
* remove responsive behavior
* remove existing animations
* remove existing 3D functionality
* replace the current architecture

without explicit instruction.

---

# 3. PRIMARY PRODUCT PRINCIPLE

The application should answer:

> "What part of the body is associated with this finding in my report?"

**(v2)** and, when the report provides it:

> "Where in that organ does the report place the finding, and how does that compare to a normal organ?"

It should NOT automatically answer:

> "What disease do I have?"

The distinction is critical.

Example:

```text
Report:
ALT = 85 U/L

Allowed:

ALT is a liver-associated blood marker.
The liver is highlighted because the reported
marker is associated with liver function.

Not allowed:

Your liver is damaged.
```

The system must distinguish:

```text
reported finding
        ≠
medical diagnosis
```

**(v2)** The system must also distinguish two kinds of information:

```text
APP ASSOCIATION   → the app maps a lab marker to an organ
                    ("ALT is associated with the liver")

REPORT STATEMENT  → the report itself states something
                    ("Impression: mild fatty liver", page 1)
```

A REPORT STATEMENT may be displayed, always as a quote attributed to the report and its source, never as the app's own conclusion.

```text
Allowed:      Report says "Fatty liver, grade 1" (USG, page 1)
              → liver highlighted, statement quoted with source

Not allowed:  App infers "Your liver is damaged"
```

---

# 4. MEDICAL SAFETY RULES

## 4.1 Never invent medical findings

The system must only visualize findings that can be traced to:

* uploaded report content
* explicitly entered user data
* verified medical mappings

Never fabricate:

* diseases
* abnormalities
* symptoms
* diagnoses
* severity
* treatment recommendations
* prognosis

**(v2)** Never fabricate the location, size, shape, or extent of a finding in 3D. See Section 107.

---

## 4.2 Never convert a laboratory value directly into a diagnosis

For example:

```text
Creatinine = 2.8
```

does NOT automatically mean:

```text
Kidney disease confirmed
```

Instead:

```text
Creatinine
→ kidney-associated laboratory marker
→ kidney highlighted
```

---

## 4.3 Every visualization should have evidence

Whenever possible, each finding should maintain:

```text
finding
source_document
source_page
source_text
measurement
unit
anatomical_structure
mapping_reason
confidence
```

Example:

```json
{
  "finding": "Creatinine",
  "value": 2.8,
  "unit": "mg/dL",
  "anatomicalStructure": "kidney",
  "source": {
    "document": "report.pdf",
    "page": 2
  }
}
```

---

## 4.4 Never hide uncertainty

If the system is unsure:

```text
Possible anatomical association
```

is better than:

```text
Confirmed abnormality
```

Use confidence states such as:

```text
HIGH
MEDIUM
LOW
UNKNOWN
```

Low-confidence mappings should not be presented as confirmed facts.

---

# 5. PRODUCT SCOPE

## V1 GOAL

The first version should focus on:

* PDF upload
* text extraction
* basic OCR where required
* common laboratory findings
* medical terminology normalization
* anatomical mapping
* interactive 3D human body
* organ highlighting
* body-system filtering
* finding details
* report source references
* responsive UI
* **(v2)** two-level viewer: body view → organ detail view
* **(v2)** normal reference view for supported organs
* **(v2)** explanation panel driven by curated data
* **(v2)** reference range bar for numeric lab findings
* **(v2)** demo report

## (v2) V1.5 GOAL

* imaging report text (ultrasound, CT, MRI impressions)
* sub-organ region mapping (lobe, pole, side, segment where supported)
* laterality handling (left / right)

Do NOT attempt everything at once.

---

# 6. V1 ANATOMY

Initial anatomy should prioritize major structures.

## Organs

* Brain
* Heart
* Lungs
* Liver
* Gallbladder
* Pancreas
* Stomach
* Small intestine
* Large intestine
* Spleen
* Right kidney
* Left kidney
* Urinary bladder
* Thyroid

## Systems

* Nervous system
* Cardiovascular system
* Respiratory system
* Digestive system
* Urinary system
* Endocrine system
* Skeletal system
* Muscular system

## Additional structures

Initially support only the major structures that can be reliably represented by the selected 3D model.

Do not claim complete anatomical coverage until it actually exists.

## (v2) Detailed organ models

Detailed organ view (Section 104) should first be built for ONE organ, the kidney, and proven end to end before adding others. Suggested order after kidney: liver, heart, lungs, thyroid.

---

# 7. FUTURE ANATOMY

Potential future layers:

```text
Skin
Skeleton
Muscles
Organs
Arteries
Veins
Peripheral nerves
Spinal cord
Lymphatic system
Ligaments
Tendons
Joints
Detailed anatomical structures
```

These should be implemented incrementally.

Never create fake or placeholder anatomy and present it as medically accurate anatomy.

---

# 8. 3D ENGINE

Preferred technology:

```text
Three.js
```

Possible supporting technologies:

```text
React Three Fiber
@react-three/drei
WebGL
GLTF / GLB
Draco compression
```

Use whichever is already present in the project.

Do NOT introduce React Three Fiber if the project already has a stable Three.js architecture unless there is a clear technical reason.

---

# 9. 3D MODEL REQUIREMENTS

Use only anatomy assets whose license permits the intended use.

Before adding a model:

Check:

* license
* commercial-use restrictions
* modification rights
* redistribution restrictions
* attribution requirements
* **(v2)** share-alike / copyleft terms and whether they affect this project's own license

Record the source/license in:

```text
docs/THIRD_PARTY_ASSETS.md
```

Never download random anatomical models and silently include them.

---

# 10. 3D PERFORMANCE RULES

The application must feel instant and fluid.

Priorities:

```text
Responsiveness
>
Smooth interaction
>
Visual complexity
```

Avoid unnecessarily high-poly models.

Use:

* GLTF/GLB
* Draco compression where appropriate
* lazy loading
* level of detail
* frustum culling
* texture optimization
* instancing when useful
* progressive loading

Do not load the entire anatomical system if the user only needs one layer.

**(v2)** Detailed organ models must be lazy-loaded when the organ is first opened, never at app start.

---

# 11. 3D INTERACTION

The user should be able to:

* rotate
* zoom
* pan where appropriate
* select anatomy
* deselect anatomy
* focus on an organ
* hide/show layers
* change anatomy systems
* reset camera
* search anatomy
* highlight report-associated structures
* **(v2)** open the organ detail view from the body view
* **(v2)** return from organ view to body view
* **(v2)** switch between Reported, Normal, and Side-by-side modes in organ view

Expected interaction:

```text
Click Kidney
      ↓
Kidney selected
      ↓
Camera optionally focuses kidney
      ↓
Information panel opens
      ↓
"Open detailed view" opens the 3D organ view
```

Avoid excessive camera animation.

Animations must feel smooth and short.

---

# 12. ANATOMY OBJECT IDENTIFICATION

Every selectable anatomical structure should have a stable ID.

Example:

```text
heart
left_kidney
right_kidney
liver
brain
left_lung
right_lung
thyroid
```

Never rely exclusively on visible mesh names.

Use a dedicated mapping:

```json
{
  "left_kidney": {
    "meshNames": ["LeftKidney", "Kidney_L"],
    "system": "urinary",
    "displayName": "Left Kidney"
  }
}
```

**(v2)** Sub-parts use the same ID scheme. See Section 105.

---

# 13. MEDICAL MAPPING ENGINE

Do not allow an LLM to directly control the 3D model.

Use an intermediate structured layer.

Correct:

```text
Report
 ↓
Extraction
 ↓
Normalized finding
 ↓
Validated anatomical mapping
 ↓
3D visualization
```

Incorrect:

```text
Report
 ↓
LLM
 ↓
LLM says "highlight liver"
 ↓
3D model
```

The AI must not have unrestricted control over medical visualization.

---

# 14. FINDING DATA MODEL

Use a structured representation.

Example:

```json
{
  "id": "finding_001",
  "name": "Creatinine",
  "normalizedName": "creatinine",
  "value": 2.8,
  "unit": "mg/dL",
  "referenceRange": null,
  "status": "reported",
  "anatomicalStructures": [
    "left_kidney",
    "right_kidney"
  ],
  "system": "urinary",
  "source": {
    "documentId": "doc_001",
    "page": 2,
    "text": "Creatinine 2.8 mg/dL"
  },
  "confidence": "high"
}
```

The exact schema can evolve, but structured data is mandatory.

**(v2)** The model is extended in Section 106 with `findingType`, `location`, and `statedBy`.

---

# 15. MEDICAL TERMINOLOGY

Create a controlled terminology layer.

Example:

```text
Creatinine
→ creatinine
→ kidney-associated marker

eGFR
→ estimated_glomerular_filtration_rate
→ kidney function marker

ALT
→ alanine_aminotransferase
→ liver-associated marker

AST
→ aspartate_aminotransferase
→ liver-associated marker

Troponin
→ cardiac_troponin
→ heart-associated marker
```

Do not depend entirely on string matching.

Normalize:

* capitalization
* abbreviations
* synonyms
* common spelling differences
* units

Example:

```text
HbA1c
HBA1C
A1C
Glycated Hemoglobin
```

may represent the same normalized concept where medically appropriate.

---

# 16. REPORT PROCESSING

Supported initial format:

```text
PDF
```

Processing pipeline:

```text
Upload
 ↓
Validate file
 ↓
Extract text
 ↓
Detect tables
 ↓
OCR if required
 ↓
Normalize text
 ↓
Identify medical entities
 ↓
Extract measurements
 ↓
Normalize units
 ↓
Map findings
```

Never assume every PDF is text-based.

Some reports may be scanned images.

---

# 17. OCR

OCR should only be used when normal text extraction is insufficient.

Preferred strategy:

```text
Try text extraction
       ↓
Enough text?
   /         \
 YES         NO
 ↓            ↓
Use text     OCR
```

Do not OCR every document unnecessarily.

This reduces:

* processing time
* CPU usage
* memory usage
* cost

---

# 18. TABLE EXTRACTION

Medical reports frequently contain tables.

The parser should preserve:

```text
Test
Value
Unit
Reference Range
Status
```

Example:

```text
Creatinine | 2.8 | mg/dL | 0.7–1.3
```

must not become meaningless text such as:

```text
Creatinine 2.8 mg/dL 0.7 1.3
```

where the relationship between fields is lost.

---

# 19. REPORT SOURCE TRACKING

Every extracted finding should maintain its origin.

Example:

```text
Finding:
Creatinine = 2.8 mg/dL

Source:
LabReport.pdf

Page:
2

Original text:
"Creatinine 2.8 mg/dL"
```

The user should be able to click:

```text
View source
```

and navigate to the relevant report page or extracted section.

---

# 20. USER INTERFACE

Design philosophy:

```text
Minimal
Premium
Medical
Calm
Modern
Highly visual
Low cognitive load
```

The 3D anatomy should be the primary visual focus.

Avoid dashboards filled with cards.

---

# 21. UI STRUCTURE

Suggested layout:

```text
┌─────────────────────────────────────────────────────┐
│ Logo          Search          Upload Report   User  │
├──────────────┬──────────────────────────┬───────────┤
│              │                          │           │
│ Navigation   │                          │ Findings  │
│              │      3D BODY             │           │
│ Body         │                          │           │
│ Organs       │                          │           │
│ Systems      │                          │           │
│ Skeleton     │                          │           │
│ Muscles      │                          │           │
│ Nerves       │                          │           │
│              │                          │           │
└──────────────┴──────────────────────────┴───────────┘
```

On mobile:

```text
3D Body
   ↓
Bottom sheet
   ↓
Finding details
```

**(v2)** Organ detail view layout (desktop):

```text
┌─────────────────────────────────────────────────────┐
│ ← Back to body     LEFT KIDNEY      [Reported|Normal|Side by side] │
├───────────────────────────────┬─────────────────────┤
│                               │ Reported findings   │
│      3D ORGAN VIEW            │ Reference range bar │
│      (reported / normal)      │ What this means     │
│                               │ Source              │
└───────────────────────────────┴─────────────────────┘
```

On mobile, the organ view is full screen with a bottom sheet for details; Side-by-side becomes a toggle.

---

# 22. UI DESIGN RULES

Prefer:

* rounded corners
* subtle glass effects
* clean typography
* restrained colors
* smooth transitions
* clear hierarchy
* large 3D canvas

Avoid:

* excessive gradients
* excessive shadows
* excessive animations
* tiny text
* clutter
* unnecessary buttons
* unnecessary modals

The interface must remain usable even with large amounts of medical information.

---

# 23. COLOR SYSTEM

Do not use colors to imply diagnosis unless the meaning is explicitly defined.

Possible semantic states:

```text
Neutral
Reported
Attention
Selected
Unavailable
```

**(v2)** Add: `Normal reference` (used only in the normal view) and `Reported region` (the marked area within an organ).

The exact visual design can evolve.

Do not hard-code medical meaning into colors.

**(v2)** UI text must say "Reported", "Out of range", or "Reported area". It must not say "damaged", "diseased", or "infected" as the app's own wording. Those words may appear only inside a quoted report statement.

---

# 24. ACCESSIBILITY

The application must not depend entirely on color.

Selected structures should also have:

* outline
* label
* panel information
* accessible name

Provide keyboard navigation wherever practical.

Support:

```text
Tab
Enter
Escape
Arrow keys
```

for important controls.

---

# 25. RESPONSIVENESS

The application must work on:

* desktop
* laptop
* tablet
* mobile

Do not sacrifice 3D usability on mobile.

For low-powered devices:

* reduce model complexity
* disable expensive effects
* reduce shadows
* reduce post-processing
* reduce texture resolution

---

# 26. PERFORMANCE

Performance is a core feature.

Target experience:

```text
Click → immediate visual response
Search → immediate feedback
Organ selection → immediate highlight
Camera movement → smooth
Panel opening → instant
```

Avoid:

```text
Click
 ↓
API request
 ↓
wait
 ↓
render
```

when the required information is already available locally.

Prefer:

```text
Preloaded local anatomy metadata
 ↓
instant interaction
```

---

# 27. CACHING

Use caching wherever appropriate.

Cache:

* anatomy metadata
* normalized terminology
* previously processed report results where safe
* static assets

Do not cache sensitive medical information insecurely.

Never store medical reports in publicly accessible caches.

---

# 28. PRIVACY

Medical reports contain sensitive information.

Follow privacy-first design.

Never:

* log complete reports
* print patient names to console
* expose uploaded files publicly
* include medical data in analytics
* store reports longer than necessary without purpose
* send documents to third-party APIs without explicit design approval

Use:

```text
minimum data collection
minimum retention
minimum exposure
```

---

# 29. LOGGING

Never log:

```text
patient name
address
phone number
hospital ID
medical report contents
diagnosis
full extracted report
```

Instead log:

```text
document_processed
processing_failed
finding_count
processing_duration
```

Example:

```text
Report processing completed.
Findings extracted: 12
Duration: 1.8s
```

---

# 30. AUTHENTICATION

Authentication should not be implemented unless necessary for the current feature.

For V1, anonymous/local processing can be considered.

If accounts are introduced:

* never expose user data
* isolate users' documents
* enforce authorization server-side
* never trust client-side user IDs
* use secure sessions

---

# 31. DATABASE

Use the existing database if the project already has one.

Do not replace:

```text
Supabase
```

with another database unless explicitly instructed.

Potential tables:

```text
users
documents
document_pages
findings
anatomical_structures
finding_mappings
report_sessions
```

Do not create excessive tables prematurely.

---

# 32. API DESIGN

Keep APIs small and predictable.

Example:

```text
POST /api/reports/upload
POST /api/reports/:id/process
GET  /api/reports/:id
GET  /api/reports/:id/findings
GET  /api/anatomy
GET  /api/anatomy/:id
```

Do not create an endpoint for every UI interaction.

Prefer reusable data APIs.

---

# 33. AI USAGE

AI should be used where it provides real value.

Good uses:

* medical terminology normalization
* extraction assistance
* synonym resolution
* explanation generation
* report summarization
* ambiguity detection

Bad uses:

* inventing findings
* diagnosing diseases
* determining emergency status automatically
* generating unsupported medical conclusions
* directly manipulating medical visualization without validation

**(v2)** AI may rephrase curated explanation text for reading level (Section 108). It must not add medical claims that are not in the curated source.

---

# 34. AI OUTPUT VALIDATION

Never blindly trust model output.

Pipeline:

```text
AI output
 ↓
Schema validation
 ↓
Terminology validation
 ↓
Anatomy validation
 ↓
Confidence evaluation
 ↓
Application
```

If validation fails:

```text
Do not visualize as confirmed.
```

---

# 35. OFFLINE/FREE-FIRST ARCHITECTURE

The project should prioritize free and open-source tools.

Prefer:

```text
Open source
Local processing
Static assets
Client-side processing
Free tiers
```

before:

```text
Paid APIs
Paid AI
Paid infrastructure
```

Do not introduce paid services without explicit approval.

---

# 36. NO UNNECESSARY DEPENDENCIES

Before installing a package:

1. Check whether the functionality already exists.
2. Check whether native browser APIs can solve it.
3. Check whether an existing dependency already provides it.
4. Install only if necessary.

Every dependency adds:

* bundle size
* maintenance
* security surface
* complexity

---

# 37. ERROR HANDLING

Never silently fail.

Example:

Bad:

```text
Nothing happens.
```

Good:

```text
We couldn't extract readable text from this report.

Try uploading a clearer PDF or image.
```

For anatomy:

```text
This structure is not available in the current
anatomy model.
```

For mapping:

```text
This finding could not be confidently mapped
to a specific anatomical structure.
```

**(v2)** For missing detailed organ models:

```text
A detailed view is not available for this organ yet.
The body view still shows the association.
```

---

# 38. LOADING STATES

Never show a blank screen during processing.

Use meaningful states:

```text
Uploading report...
Reading report...
Extracting findings...
Mapping anatomy...
Preparing visualization...
Ready
```

Do not fake progress.

If the actual process is 20% complete, don't display an arbitrary 80%.

**(v2)** Opening a detailed organ model shows a real loading state ("Loading kidney model...") and keeps the body view usable behind it.

---

# 39. ERROR RECOVERY

If report extraction fails:

```text
Allow retry
```

If one finding fails:

```text
Continue processing other findings
```

Do not fail the entire report because one term could not be mapped.

Example:

```text
12 findings detected
9 mapped
2 require review
1 could not be mapped
```

This is preferable to:

```text
Processing failed
```

---

# 40. ANATOMICAL SEARCH

The user should eventually be able to search:

```text
Kidney
Heart
Liver
Femur
Spinal cord
Sciatic nerve
```

Search should return:

```text
Structure
System
Location
```

Clicking the result should focus the 3D model.

---

# 41. SYSTEM FILTERS

Example:

```text
☐ All
☐ Organs
☐ Skeleton
☐ Muscles
☐ Nervous System
☐ Blood Vessels
```

Only show filters for anatomy actually available.

Do not display a "Nerves" option if the current model has no nerve layer.

---

# 42. ORGAN DETAIL VIEW

When selecting an organ:

```text
Organ name
Anatomical location
Associated system
Reported findings
Measurements
Source reports
```

Example:

```text
KIDNEY

System
Urinary System

Reported findings
Creatinine: 2.8 mg/dL
eGFR: 26

Sources
Lab Report — Page 2
```

Avoid automatically adding unrelated information.

**(v2)** The information panel is the summary. The full detailed 3D organ view is defined in Section 104.

---

# 43. FINDING TIMELINE

Future feature:

```text
2026
 ├── Jan
 ├── Mar
 ├── Jun
 └── Sep
```

Users can compare reported findings over time.

Never manufacture trends.

If only one measurement exists:

```text
No historical comparison available.
```

---

# 44. COMPARISON

When multiple reports exist:

```text
Previous
Current
```

show:

```text
Previous value
Current value
Difference
```

Only calculate differences when:

* same test
* compatible units
* comparable context
* valid numeric values

Do not compare unrelated measurements.

---

# 45. MEDICAL LANGUAGE MODES

Provide two explanation modes eventually:

### Simple

```text
This test is commonly associated with kidney function.
```

### Technical

```text
Estimated glomerular filtration rate is an estimate
of renal filtration capacity.
```

Do not change the underlying finding between modes.

Only change explanation complexity.

---

# 46. DISCLAIMER

The application should clearly communicate:

```text
This application provides educational visualization
of information contained in uploaded medical reports.
It does not provide a medical diagnosis or replace
professional medical advice.
```

The disclaimer should not be used to justify unsafe functionality.

---

# 47. NEVER MAKE EMERGENCY DECISIONS

Do not implement:

```text
You are having a medical emergency.
```

based solely on automated interpretation.

If a user asks for medical advice, provide appropriate safety-oriented information through the application's designated medical-information flow rather than presenting the visualization as a diagnosis.

---

# 48. FILE STRUCTURE

Preferred structure:

```text
/
├── app/
│   ├── components/
│   │   ├── anatomy/
│   │   ├── report/
│   │   ├── ui/
│   │   └── layout/
│   │
│   ├── api/
│   ├── body/
│   ├── organs/
│   └── reports/
│
├── components/
│
├── lib/
│   ├── anatomy/
│   ├── medical/
│   ├── reports/
│   ├── parser/
│   └── utils/
│
├── public/
│   ├── anatomy/
│   │   ├── body/          (v2: full body model)
│   │   └── organs/        (v2: detailed organ models, one file per organ)
│   └── icons/
│
├── data/
│   ├── anatomy/
│   └── medical/
│       ├── mappings/      (v2: term → structure)
│       └── explanations/  (v2: curated explanation content)
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MEDICAL_MAPPINGS.md
│   └── THIRD_PARTY_ASSETS.md
│
├── tests/
│
└── AGENTS.md
```

Adapt this structure to the existing project instead of forcing a migration.

---

# 49. COMPONENT ORGANIZATION

Prefer reusable components.

Example:

```text
AnatomyViewer
AnatomyControls
AnatomySearch
AnatomyLayerToggle
OrganPanel
FindingPanel
ReportUploader
ReportViewer
FindingList
FindingSource
ProcessingStatus
```

**(v2)** Additional components:

```text
OrganDetailViewer
OrganViewModeToggle
RegionMarker
ReferenceRangeBar
ExplanationPanel
ReportStatementQuote
```

Do not create giant components containing the entire application.

---

# 50. STATE MANAGEMENT

Keep state close to where it is used.

Example:

```text
3D camera state
→ AnatomyViewer

Selected anatomy
→ Anatomy context/store

Report findings
→ Report state

User settings
→ application settings
```

**(v2)** Viewer level (`body` | `organ`), active organ, and organ view mode (`reported` | `normal` | `side_by_side`) live in the anatomy context, not in individual components.

Avoid putting everything into one global store.

---

# 51. SECURITY

Validate all uploaded files.

Check:

* MIME type
* file extension
* file size
* malformed files
* potentially dangerous input

Never trust:

```text
filename
MIME type from client
user ID from client
```

Validate server-side.

---

# 52. UPLOAD LIMITS

Set reasonable limits.

For example:

```text
Maximum PDF size: configurable
Maximum pages: configurable
Maximum processing time: configurable
```

Do not allow unlimited uploads in V1.

---

# 53. NO SECRET KEYS IN FRONTEND

Never expose:

```text
API keys
service role keys
database passwords
private tokens
AI provider secrets
```

Use environment variables.

Client-side variables must contain only intentionally public configuration.

---

# 54. ENVIRONMENT VARIABLES

Use:

```text
.env.local
```

and provide:

```text
.env.example
```

Never commit secrets.

---

# 55. TESTING

Every major feature should have at least one test.

Priority tests:

```text
PDF extraction
Measurement extraction
Unit normalization
Medical term normalization
Anatomical mapping
3D structure selection
Report source linking
API validation
```

**(v2)** Additional priority tests:

```text
Body → organ view transition and back
Sub-region ID resolves to a mesh or overlay
Laterality (left/right) never swapped
Unspecified location falls back to whole organ
Reference range bar uses the report's own range
Explanation panel renders only curated content
```

---

# 56. REGRESSION TESTING

After changing anything related to:

* report processing
* anatomy
* navigation
* authentication
* database
* 3D viewer

verify existing features.

Minimum check:

```text
Build
Lint
Typecheck
Tests
Main user flow
```

---

# 57. BEFORE EVERY CODE CHANGE

The agent MUST:

1. Inspect existing implementation.
2. Identify affected files.
3. Understand current behavior.
4. Make the smallest change.
5. Run relevant checks.
6. Verify no unrelated behavior changed.

Never code blindly.

---

# 58. BEFORE CREATING A NEW FILE

Ask:

```text
Can the existing file safely handle this?
```

If yes, avoid unnecessary files.

If no, create a logically scoped file.

---

# 59. BEFORE INSTALLING A PACKAGE

Ask:

```text
Is this dependency actually necessary?
```

If an existing package can perform the task, reuse it.

---

# 60. DO NOT REWRITE THE APPLICATION

Never perform:

```text
full rewrite
framework migration
database migration
3D engine replacement
UI library replacement
```

unless explicitly instructed.

---

# 61. GIT SAFETY

Never run destructive commands such as:

```text
git reset --hard
git clean -fd
```

unless explicitly authorized.

Never delete uncommitted user work.

Never overwrite unrelated changes.

---

# 62. CODE QUALITY

Code should be:

* readable
* modular
* typed
* maintainable
* documented where necessary

Avoid:

```text
huge functions
duplicate logic
magic numbers
hard-coded medical mappings
hard-coded API URLs
unused imports
dead code
```

---

# 63. TYPESCRIPT

Prefer strict typing.

Avoid:

```typescript
any
```

unless genuinely unavoidable.

Prefer:

```typescript
type
interface
unknown
generics
type guards
```

---

# 64. MEDICAL MAPPINGS MUST BE DATA-DRIVEN

Do NOT scatter mappings throughout components.

Bad:

```typescript
if (test === "ALT") {
   highlight("liver");
}
```

Preferred:

```text
medicalMappings
        ↓
normalized term
        ↓
anatomical structure
```

This allows mappings to be reviewed independently from UI code.

---

# 65. EXAMPLE MAPPING

```json
{
  "normalizedTerm": "creatinine",
  "displayName": "Creatinine",
  "category": "laboratory_marker",
  "associatedStructures": [
    "left_kidney",
    "right_kidney"
  ],
  "system": "urinary",
  "visualizationType": "association"
}
```

Notice:

```text
visualizationType = association
```

rather than:

```text
visualizationType = disease
```

This distinction is intentional.

---

# 66. REPORT FINDING STATES

Use explicit states:

```text
NORMAL
ABOVE_RANGE
BELOW_RANGE
REPORTED_ABNORMAL
QUALITATIVE_FINDING
UNKNOWN
NOT_INTERPRETED
```

Do not automatically treat:

```text
ABOVE_RANGE
```

as:

```text
DISEASE
```

**(v2)** Add `REPORT_STATED` for a finding whose meaning comes from a statement in the report itself (Section 106).

---

# 67. UNITS

Units must be normalized carefully.

Examples:

```text
mg/dL
mmol/L
g/dL
U/L
mL/min/1.73m²
```

Never convert units unless the conversion is verified.

Store:

```text
original value
original unit
normalized value
normalized unit
```

when conversion occurs.

---

# 68. REFERENCE RANGES

Reference ranges vary by:

* laboratory
* age
* sex
* methodology
* units
* clinical context

Therefore:

Prefer the reference range contained in the uploaded report.

Do not blindly substitute a universal reference range.

---

# 69. AGE/SEX DEPENDENCY

Do not assume a reference range when demographic context matters.

If required information is unavailable:

```text
Reference range unavailable.
```

Do not invent it.

---

# 70. MULTIPLE REPORTS

Never merge reports blindly.

Each report should have:

```text
documentId
date
source
findings
```

When comparing:

```text
same analyte
same units
different dates
```

only.

---

# 71. USER EXPERIENCE PRINCIPLE

The user should always know:

```text
What happened?
Why did it happen?
What is being shown?
Where did this information come from?
```

For example:

```text
Kidney highlighted

Why?
Your uploaded report contains findings associated
with kidney function.

Source:
Blood Report — Page 2
```

---

# 72. DO NOT OVERLOAD THE USER

Don't show every extracted technical detail immediately.

Use progressive disclosure:

```text
Finding
 ↓
Simple explanation
 ↓
Technical details
 ↓
Source
```

---

# 73. EMPTY STATES

Examples:

No report:

```text
Upload a medical report to begin.
```

No findings:

```text
No recognizable medical findings were extracted.
```

No anatomy mapping:

```text
We found information in the report but could not
confidently associate it with a 3D structure.
```

No history:

```text
No previous report available for comparison.
```

**(v2)** No location in report:

```text
The report does not specify where in this organ
the finding is located. The whole organ is shown.
```

---

# 74. DEMO MODE

V1 should have a demo report.

This allows users to experience the application without uploading real medical information.

Example:

```text
Demo Medical Report
```

The demo data must be clearly labeled:

```text
DEMO / SAMPLE DATA
```

Never present fabricated data as a real patient's medical information.

**(v2)** The demo report should include at least: one lab finding (for example creatinine, with report-style reference range) and one imaging-style statement with a location (for example a synthetic cortical or lower-pole finding), so both the body view and organ view can be exercised with no real data.

---

# 75. DEVELOPMENT DATA

Development and testing must use synthetic or de-identified data.

Never commit real patient reports to GitHub.

Never use real patient information in:

```text
screenshots
tests
fixtures
demo data
logs
README
```

---

# 76. README

README should explain:

```text
What the project does
Technology stack
How to run
Environment variables
Architecture
Medical safety limitations
3D asset licenses
How report processing works
```

---

# 77. DOCUMENTATION

Maintain:

```text
docs/ARCHITECTURE.md
docs/MEDICAL_MAPPINGS.md
docs/THIRD_PARTY_ASSETS.md
```

Whenever architecture changes materially, update the documentation.

---

# 78. FEATURE DEVELOPMENT PROCESS

For every feature:

```text
1. Understand request
2. Inspect current code
3. Identify affected components
4. Plan smallest implementation
5. Implement
6. Test
7. Check regression
8. Report changes
```

---

# 79. DO NOT OVER-ENGINEER

V1 should NOT include unnecessarily complex systems.

Avoid premature implementation of:

* microservices
* Kubernetes
* event-driven architecture
* complex AI agents
* distributed processing
* custom medical ontology engine
* real-time collaboration

unless the project actually requires them.

Start simple.

---

# 80. FREE-FIRST RULE

The application should remain usable without paid infrastructure during development.

Preferred order:

```text
Local
 ↓
Open source
 ↓
Free tier
 ↓
Paid service only if necessary
```

Before introducing a paid service, explain:

```text
Why it is needed
What free alternatives exist
What limitation prevents the free solution
```

Do not silently introduce paid APIs.

---

# 81. NO VENDOR LOCK-IN

Keep provider-specific logic isolated.

Bad:

```text
medical extraction logic directly inside OpenAI API calls
```

Preferred:

```text
MedicalExtractionService
        ↓
Provider adapter
```

This allows future replacement with:

* local model
* open-source model
* different provider

without rewriting the application.

---

# 82. OFFLINE FALLBACK

Where practical, core anatomy visualization should work without an AI API.

The 3D viewer must NOT depend on an AI request to:

```text
rotate body
select organ
zoom
change layer
view existing findings
```

These interactions should remain local.

**(v2)** The same applies to opening the organ detail view and switching Reported / Normal / Side-by-side.

---

# 83. NETWORK FAILURE

If the AI/report processing service fails:

The existing 3D viewer must continue working.

Show:

```text
Report processing is temporarily unavailable.
Your anatomy viewer is still available.
```

Do not crash the entire application.

---

# 84. MOBILE PERFORMANCE

On mobile:

Prefer:

```text
lower-poly model
compressed textures
fewer simultaneous layers
limited post-processing
```

Never attempt to render every anatomical structure simultaneously on a low-end phone.

**(v2)** On mobile, never render body and detailed organ models at full detail at the same time. Dim or pause the body scene while the organ view is open.

---

# 85. CAMERA BEHAVIOR

Camera transitions must be:

* short
* smooth
* interruptible

If the user manually rotates while an automatic focus animation is running, allow the user to take control.

Never lock the camera unnecessarily.

---

# 86. SELECTION BEHAVIOR

Selected anatomy should have a clear visual state.

Possible methods:

```text
outline
emission
slight scale
controlled transparency of surrounding anatomy
```

Do not distort anatomy excessively.

---

# 87. SURROUNDING ANATOMY

When focusing on one organ:

```text
Selected organ
    ↓
full visibility

Nearby anatomy
    ↓
slightly reduced opacity

Unrelated anatomy
    ↓
optional hidden/dimmed
```

Do not permanently hide anatomy unless the user requested it.

---

# 88. REPORT ↔ BODY LINK

Clicking a finding should highlight the relevant structure.

Clicking a structure should show relevant findings.

Therefore:

```text
Finding → Anatomy
```

and:

```text
Anatomy → Findings
```

must both work.

**(v2)** This link must also work inside the organ view: clicking a finding marks its region on the organ, and clicking a marked region shows its findings.

---

# 89. MULTIPLE STRUCTURES

Some findings may be associated with multiple structures.

Example:

```text
blood marker
 ↓
blood
 ↓
multiple systems
```

Do not force every finding into exactly one organ.

The data model must support:

```text
one finding → many anatomical structures
```

---

# 90. UNKNOWN MAPPINGS

If a finding cannot be mapped:

```text
Unknown / unmapped
```

Do not guess.

Store it for possible future mapping.

---

# 91. CONFLICTING INFORMATION

If two reports contain conflicting information:

Do not automatically determine which is correct.

Show:

```text
Report A
Value: X
Date: ...

Report B
Value: Y
Date: ...
```

and let the user see the source.

---

# 92. MEDICAL CONTENT SOURCES

When adding medical explanations or terminology:

Prefer authoritative medical references.

Do not use random social-media posts or unverified websites as the foundation for medical mappings.

Document important sources in:

```text
docs/MEDICAL_SOURCES.md
```

when appropriate.

---

# 93. NO MEDICAL CLAIMS FROM VISUAL STYLE

Never imply severity merely because:

```text
red = bad
large organ = severe
animation = dangerous
```

Visual effects must communicate information explicitly.

---

# 94. NO FALSE PRECISION

Do not display:

```text
87.43% organ damage
```

unless the underlying source genuinely provides such a measurement.

Never manufacture numerical precision.

---

# 95. NO FAKE 3D PATHOLOGY

The generic anatomy model represents anatomy.

It does NOT represent the user's actual internal anatomy unless actual patient-specific imaging has been processed.

Always distinguish:

```text
Generic anatomical model
```

from:

```text
Patient-specific reconstruction
```

**(v2)** Every organ view must carry a visible label: `Generic anatomical model — not your actual anatomy`. The marked area indicates where the report places a finding. It does not show the true size, shape, or extent of anything.

---

# 96. FUTURE PATIENT-SPECIFIC IMAGING

Potential future architecture:

```text
DICOM
 ↓
Image preprocessing
 ↓
Segmentation
 ↓
3D reconstruction
 ↓
Anatomical registration
 ↓
Patient-specific visualization
```

This is OUT OF SCOPE for initial V1 unless explicitly requested.

---

# 97. VERSIONING

Major versions:

```text
V1
Report → generic anatomy mapping
Two-level viewer (body → organ), normal reference,
curated explanations, demo mode

V1.5
Imaging report text → sub-organ regions, laterality

V2
More anatomy systems + timeline

V3
Imaging integration

V4
Patient-specific 3D reconstruction
```

Do not accidentally implement V4 complexity during V1.

---

# 98. PRIORITY ORDER

When making tradeoffs:

```text
1. Safety
2. Correctness
3. Existing functionality
4. Performance
5. Privacy
6. Usability
7. Visual polish
8. Additional features
```

A beautiful incorrect medical visualization is unacceptable.

---

# 99. WHEN REQUIREMENTS ARE AMBIGUOUS

Do not invent medical behavior.

If the ambiguity affects:

* medical interpretation
* data privacy
* anatomical mapping
* diagnosis
* report processing

stop and request clarification.

For ordinary UI details, choose the simplest consistent implementation.

---

# 100. FINAL CHECK BEFORE COMPLETING A TASK

Before saying a task is complete, verify:

```text
[ ] Existing functionality preserved
[ ] No unrelated files modified
[ ] No unnecessary dependencies added
[ ] No secrets exposed
[ ] No patient data logged
[ ] Medical claims are appropriately limited
[ ] Anatomical mapping is traceable
[ ] 3D interactions still work
[ ] Responsive layout still works
[ ] Build passes
[ ] Typecheck passes
[ ] Lint passes
[ ] Relevant tests pass
[ ] No obvious performance regression
```

**(v2)** Additional checks for viewer and explanation work:

```text
[ ] Body → organ → body navigation works
[ ] Organ view shows the "generic model" label
[ ] No invented location, size, or shape of a finding
[ ] Normal view is labeled as a generic reference
[ ] UI wording follows Section 114
[ ] Explanation content comes from curated data
[ ] New 3D asset license recorded in THIRD_PARTY_ASSETS.md
```

---

# 101. RESPONSE FORMAT FOR THE CODING AGENT

After completing a task, report only:

```text
Implemented:
- ...

Changed:
- ...

Tested:
- ...

Notes:
- ...
```

Do not provide long explanations unless requested.

---

# 102. MOST IMPORTANT RULE

The application must always remain:

```text
FAST
FLUID
SAFE
TRACEABLE
ACCURATE
MINIMAL
```

Never sacrifice correctness or existing functionality merely to add a new feature.

When uncertain:

```text
DO LESS
DO IT SAFELY
DO IT CORRECTLY
```

---

# V2 ADDITIONS (SECTIONS 103–118)

These sections extend the rules above. They do not replace them. If a v2 section appears to conflict with Sections 3, 4, 93, 94 or 95, the safety rule wins.

---

# 103. TWO-LEVEL VIEWER

The viewer has two levels.

```text
LEVEL 1: BODY VIEW                LEVEL 2: ORGAN VIEW
┌──────────────────────┐          ┌──────────────────────────────────────┐
│        ( )           │          │ REPORTED           NORMAL REFERENCE  │
│       /|||\          │  click   │ ┌──────────┐       ┌──────────┐      │
│        |||           │  ─────►  │ │  kidney  │       │  kidney  │      │
│     [K]   [K] ← glows│          │ │ ▓ marked │       │ cortex   │      │
│        / \           │          │ │   area   │       │ medulla  │      │
└──────────────────────┘          │ └──────────┘       │ pelvis   │      │
                                  │                    └──────────┘      │
                                  └──────────────────────────────────────┘
```

Rules:

* The body view shows organs associated with report findings, highlighted.
* Clicking a highlighted organ selects it and opens the summary panel (Section 42).
* An explicit "Open detailed view" action opens the organ view.
* The organ view has a clear "Back to body" control and supports the Escape key.
* Returning to the body view restores the previous camera position and selection.
* The organ view must not require any network request other than the one-time lazy load of the organ model (Section 10).

---

# 104. ORGAN DETAIL VIEW

The organ view shows one organ in more detail than the body model allows.

It must provide:

```text
Detailed 3D organ (rotate, zoom, reset)
Labeled parts of the organ (for example cortex, medulla, renal pelvis)
Reported area marker (when the report gives a location)
View mode toggle: Reported | Normal | Side by side
Reference range bar for numeric findings
Explanation panel
Source link for every finding shown
"Generic anatomical model — not your actual anatomy" label
```

Rules:

* Build one organ end to end first (kidney), then reuse the same components for others.
* Load organ models lazily and cache them after first load.
* If no detailed model exists for an organ, follow Section 37 and keep the body view association.
* An organ view must not show more anatomical parts than the model genuinely contains.

---

# 105. SUB-ORGAN REGION IDS

Regions inside an organ use stable IDs, the same way organs do (Section 12).

Examples:

```text
left_kidney_cortex
left_kidney_medulla
left_kidney_renal_pelvis
left_kidney_upper_pole
left_kidney_lower_pole
right_kidney_lower_pole
liver_right_lobe
liver_left_lobe
liver_segment_6
```

Region mapping file:

```json
{
  "left_kidney_lower_pole": {
    "parentStructure": "left_kidney",
    "displayName": "Left kidney, lower pole",
    "meshNames": ["LeftKidney_LowerPole"],
    "overlay": {
      "type": "sphere_marker",
      "anchor": "left_kidney",
      "position": [0.0, -0.6, 0.0],
      "radius": 0.25
    },
    "supportedBy": "mesh_or_overlay"
  }
}
```

Rules:

* A region is supported either by a real mesh in the model or by a documented overlay marker.
* If a region cannot be represented by either, the finding falls back to the parent organ (Section 107).
* Never create a region ID that the current model cannot display.
* Region names must come from a controlled list, not free text.
* Regions are data files, not hard-coded in components (Section 64).

---

# 106. FINDING DATA MODEL EXTENSION

Extend the finding model from Section 14.

```json
{
  "id": "finding_002",
  "findingType": "report_statement",
  "name": "Renal lesion",
  "statedBy": "report",
  "statementText": "2 cm cyst, lower pole, right kidney",
  "value": null,
  "unit": null,
  "referenceRange": null,
  "status": "REPORT_STATED",
  "anatomicalStructures": ["right_kidney"],
  "location": {
    "structure": "right_kidney",
    "region": "right_kidney_lower_pole",
    "laterality": "right",
    "specified": true,
    "textEvidence": "lower pole, right kidney"
  },
  "size": {
    "text": "2 cm",
    "specified": true
  },
  "system": "urinary",
  "source": {
    "documentId": "doc_001",
    "page": 1,
    "text": "2 cm cyst, lower pole, right kidney"
  },
  "confidence": "medium"
}
```

`findingType` values:

```text
lab_association      app maps a lab marker to an organ
report_statement     the report itself states a finding
```

Rules:

* `statedBy: "report"` means the wording is the report's own. It must be shown as a quote with source.
* `statedBy: "app"` means an app association. It must be shown as an association (Section 3).
* `location.specified` is `false` when the report gives no location. See Section 107.
* Size is stored as reported text. Do not convert it into a drawn 3D size (Section 107).
* One finding may reference multiple structures (Section 89).

---

# 107. LOCATION SPECIFICITY RULE

The marker must never claim more than the report says.

```text
Report gives                          3D shows
──────────────────────────────────────────────────────────
Lab value only                        Whole organ highlighted
                                      Label: "Location not specified
                                      in the report"

Organ named, no side or region        Organ highlighted
                                      (both sides if paired organ
                                      and side unknown)

Organ + side                          That side's organ highlighted

Organ + side + region                 Region marker on that organ

Region not supported by the model     Parent organ highlighted
                                      Label: "Region not available
                                      in the current model"
```

Rules:

* Never draw a lesion, cyst, tumor, scar, or damage shape.
* A region marker is a simple, clearly artificial marker (glow, tint, ring, or pin), never a realistic-looking abnormality.
* The marker communicates "the report places the finding here". It does not communicate size, shape, extent, or severity.
* If the report gives a size, show it as text next to the marker, not as marker geometry.
* If laterality is ambiguous, show both or none, and label it. Never guess a side.
* If two mappings disagree, show none as confirmed and follow Section 91.

---

# 108. EXPLANATION PANEL

The explanation panel answers "what is happening" using curated content, not free AI text.

Panel structure:

```text
┌ WHAT THE REPORT SAYS ─────────────────────────────────┐
│ Exact quote, value, unit, page (from the document)    │
├ WHAT THIS TEST OR TERM MEASURES ──────────────────────┤
│ Plain explanation from curated data                   │
├ WHAT OUT-OF-RANGE CAN BE ASSOCIATED WITH ─────────────┤
│ General possibilities, worded as possibilities        │
│ (shown only for out-of-range values)                  │
├ NEXT STEP ────────────────────────────────────────────┤
│ "Discuss this result with your doctor."               │
└───────────────────────────────────────────────────────┘
```

Rules:

* All explanation text lives in `data/medical/explanations/`, keyed by normalized term.
* Each entry records its source in `docs/MEDICAL_SOURCES.md` (Section 92).
* AI may only rephrase a curated entry for reading level (Simple / Technical, Section 45). It must not add causes, risks, or claims that are not in the curated entry.
* The "associated with" list must include ordinary non-disease causes where they exist (for example dehydration, medication, exercise for creatinine).
* The panel must never state severity, prognosis, urgency, or treatment.
* If no curated entry exists for a term, show only "What the report says" and the source, with the text: "No explanation is available for this term yet."
* The panel explains a test or term. It never states what the user's condition is.

---

# 109. VIEW MODES

The organ view supports three modes.

```text
REPORTED       Organ with the reported area marked
NORMAL         Same organ, no markers, labeled parts
SIDE BY SIDE   Both at once (desktop and tablet)
               Toggle only (mobile)
```

Rules:

* The normal view uses the same model and camera as the reported view, so the comparison is fair.
* Rotating or zooming one side in side-by-side mode rotates and zooms both.
* The normal view is labeled: `Generic normal reference`.
* The normal view shows anatomy, not the user's own normal values. It must not imply the user's organ looks like this.
* Switching modes is instant and local (Section 82).

---

# 110. REFERENCE RANGE BAR

For numeric lab findings, show where the value sits relative to the report's own range.

```text
Creatinine  2.8 mg/dL   ▲ above reported range

0.7 ├──────[█████]──────┤ 1.3
                              ● 2.8
```

Rules:

* Use the reference range printed in the report (Section 68).
* If the report gives no range, show the value only with: `Reference range unavailable.` Do not substitute a universal range (Section 69).
* Do not color the bar in a way that implies diagnosis or severity (Section 93).
* Do not compute percentages such as "how far above normal" unless the values are exact and the calculation is trivial and shown. Never present derived severity (Section 94).
* The bar must have a text equivalent for accessibility (Section 24).

---

# 111. IMAGING REPORT TEXT (V1.5)

Imaging reports (ultrasound, CT, MRI, X-ray) contain the location information that lab reports lack.

Extraction targets:

```text
Organ
Laterality (left / right / bilateral)
Region (lobe, pole, segment, quadrant)
Descriptor as written (for example "cyst", "lesion", "thinning")
Size as written
Impression / conclusion sentence
```

Rules:

* Extract the report's own words. Do not rewrite a descriptor into a diagnosis.
* Treat the Impression / Conclusion section as the report's stated conclusion and quote it, never re-derive it.
* Negations and uncertainty must be preserved ("no evidence of", "possible", "cannot exclude"). A negated finding is never visualized as present.
* Prior-study comparisons inside the text ("previously 1.5 cm") must not be treated as the current value.
* If extraction is unclear, mark the finding `NOT_INTERPRETED` and follow Section 39.
* Negated and uncertain findings need dedicated tests (Section 55).

---

# 112. 3D ASSET SELECTION AND FALLBACKS

Before choosing organ models, complete this checklist and record it in `docs/THIRD_PARTY_ASSETS.md`:

```text
[ ] License permits the intended use
[ ] Share-alike / copyleft effect on this project understood
[ ] Attribution text recorded
[ ] Organ is a separate, named mesh
[ ] Internal parts (for example cortex, medulla, pelvis) are separate
    meshes, or a fallback is chosen
[ ] Left/right organs are distinguishable
[ ] Polygon count and file size acceptable for mobile
[ ] Model converts cleanly to GLB
```

Fallback order when a model lacks internal parts:

```text
1. Use a model that has them
2. Use the organ mesh plus labeled overlay regions (Section 105)
3. Show the organ without internal detail, and say so
```

Never present an overlay or a simplified shape as accurate detailed anatomy (Section 7).

---

# 113. LATERALITY

Paired organs and structures (kidneys, lungs, adrenal glands, and others) require correct side handling.

Rules:

* Left and right refer to the patient's left and right, not the viewer's.
* Verify orientation of every model once and record it in the anatomy mapping data.
* Left/right swap is a critical bug and must have a test.
* If the report gives no side for a paired organ, show both sides with a label (Section 107).

---

# 114. UI WORDING RULES

Allowed in app-authored text:

```text
Reported
Reported area
Associated with
Above reported range
Below reported range
Within reported range
The report states
Location not specified in the report
Discuss this result with your doctor
```

Not allowed in app-authored text:

```text
Damaged
Diseased
Infected
Failing
Dangerous
Severe
Critical
You have <condition>
Your <organ> is <adjective about condition>
```

Rules:

* Words from the "not allowed" list may appear only inside an unaltered quote of the report, with the source shown.
* Wording rules apply to UI, tooltips, loading text, errors, exports, and notifications.
* Add a lint or test that scans app-authored strings for the disallowed list where practical.

---

# 115. BUILD ORDER

Recommended build order. Each step must work before the next begins.

```text
1. Body viewer: rotate, zoom, click organ, highlight (no reports)
2. Demo report loads and highlights organs (labeled DEMO / SAMPLE DATA)
3. Organ detail view for ONE organ (kidney): open, back, labeled parts
4. Normal reference view + Reported / Normal / Side-by-side toggle
5. Reference range bar + explanation panel from curated data
6. Real PDF text extraction for lab reports
7. Table extraction and unit handling
8. OCR fallback for scanned PDFs
9. Imaging report text extraction and region mapping (V1.5)
10. Additional organs, reusing the same components
```

Do not start step 6 or later before the viewer flow in steps 1–5 works with demo data.

---

# 116. CURATED CONTENT WORKFLOW

For every term with an explanation:

```text
1. Pick the normalized term
2. Draft plain explanation from an authoritative source
3. Record the source in docs/MEDICAL_SOURCES.md
4. List general associations, including non-disease causes
5. Add the entry to data/medical/explanations/
6. Review against Section 114 wording rules
7. Add a test that the term renders
```

Rules:

* Do not generate explanation content in bulk with AI and commit it without review.
* Content changes should be reviewable independently from code.
* Prefer fewer, correct entries over many uncertain ones.

---

# 117. PRIVACY IN THE ORGAN VIEW

* Organ models are static public assets. They contain no patient data.
* Reported markers and quotes are rendered from local session data.
* Do not send the report, findings, or region data to any third party to render the organ view.
* Screenshots or exports of the organ view must include the disclaimer and the generic-model label.
* Exports must not include patient identifiers unless the user explicitly chooses to.

---

# 118. OUT OF SCOPE FOR V1 / V1.5

Do not implement, even if it seems like a natural next step:

```text
Realistic-looking lesions, tumors, or damage rendering
Estimated organ size or extent from report text
Severity scoring or "health score"
Risk prediction
Disease name inference from lab patterns
Personalized treatment suggestions
DICOM loading or segmentation
Patient-specific 3D reconstruction
```

If a request seems to require one of these, stop and ask (Section 99).

---

# END OF AGENTS.MD
