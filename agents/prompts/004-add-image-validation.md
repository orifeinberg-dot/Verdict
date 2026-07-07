# 004 - Add Image Validation

## Objective

Add client-side image upload validation to the `/analyze` page.

This milestone should not add AI integration, database, auth, or real analysis behavior yet.

## Requirements

Validate uploaded static creatives before analysis.

## Accepted formats

- JPG / JPEG
- PNG
- WEBP

## File size

- Maximum file size: 10MB

## Hard-block errors

Show a clear error and prevent upload if:

- File type is unsupported
- File size is over 10MB
- Image is unreadable or corrupted

## Soft warnings

Allow upload, but show a warning if:

- Aspect ratio is unusual for static Meta creatives
- Resolution is low
- Image may be too small for reliable review

## Supported/common aspect ratios

Use these as preferred reference ratios:

- 1:1
- 4:5
- 9:16
- 1.91:1

## UX requirements

- Keep error/warning messages clear and friendly.
- Do not make the UI feel technical.
- Show accepted file name after successful upload.
- Preserve the premium minimal design.
- Do not over-block users in the MVP.

## Acceptance Criteria

- Valid JPG, PNG, and WEBP files can be selected.
- Unsupported files are rejected with a clear message.
- Files over 10MB are rejected.
- Low-quality/unusual images show warnings but are still allowed.
- App runs with `npm run dev`.
- No console errors.