SKMCIS V1.5 — BATCH 8 GOLD CHAPTERS
Prepared: 06 Aug 2026

PURPOSE
One-upload content bundle for adding multiple Gold Chapters without guessing legacy IDs.

EXPECTED BASELINE
Existing deployed Gold Chapters visible in recovered project evidence:
1 Sciatica / Gridhrasi
2 Cervical Radiculopathy
3 Mechanical Low Back Pain
4 Lumbar Disc Herniation / PIVD or Lumbar Spinal Stenosis deployment sequence is already beyond one-by-one early builds.
Because screenshots show deployments through Lumbar Spinal Stenosis V1.4, this batch starts proposed numbering at 5 and does NOT overwrite existing chapter files.

NEW CHAPTERS
05 Cervical Spondylosis
06 Degenerative Cervical Myelopathy
07 Lumbar Spondylolysis
08 Adult Lumbar Spondylolisthesis
09 Vertebral Compression Fracture
10 Scoliosis
11 Native Vertebral Osteomyelitis / Discitis
12 Spinal Metastases / Metastatic Spinal Cord Compression

STATUS
Modern medicine: NEW_SOURCE_CHECKED_DRAFT => AMBER clinician review.
Ayurveda: GRAY_UNVALIDATED_CORRELATION.
Recovered legacy material: NONE claimed in these 8 chapters.
DIS-0006 through DIS-0015: UNTOUCHED.

DIRECT INTEGRATION
1. Keep the currently deployed PWA as the base.
2. Upload this package's gold-chapters folder plus gold-batch-manifest.json.
3. Merge master-index-import.json into the current Master Disease Index by canonicalId (append only; no renumbering).
4. Update the Gold Chapter loader once to read gold-batch-manifest.json instead of hard-coding every chapter.
5. Preserve GREEN/AMBER/RED/BLUE/GRAY UI classes already used by the PWA.
6. Bump service-worker/cache version.
7. Deploy once.
8. Regression test all 8 names: search -> open chapter -> back -> source links -> offline reload.
9. Keep all eight AMBER until clinician review; do not mark GREEN automatically.

SAFETY
Study-library content only; not an automatic prescribing system.
Red-flag pathways override routine conservative pathways.
