Please update the relevant docs to include image upload requirements and validation for Verdict Phase 1.

## Accepted formats

* JPG / JPEG
* PNG
* WEBP

## File size

* Maximum file size: 10MB

## Supported creative shapes

Verdict is intended for static Meta ad creatives. It should support common static ad formats:

* 1:1 square
* 4:5 portrait
* 9:16 vertical
* 1.91:1 landscape

## Validation behavior

Use hard validation for:

* unsupported file type
* file larger than 10MB
* unreadable/corrupted image

Use soft warnings for:

* unusual aspect ratio
* low resolution
* image that appears too small for reliable review

Do not over-block users in the MVP. If an uploaded image is valid but not ideal, allow analysis and show a clear warning.

Please reflect this in:

* PRODUCT_SPEC.md
* UI_SPEC.md
* ARCHITECTURE.md
* DEVELOPMENT_PLAN.md

Also recommend where validation should happen in the code: client-side before analysis, and later server-side before AI processing.