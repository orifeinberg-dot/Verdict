# 003 - Build Analyze Page

## Objective

Create the `/analyze` page layout for Verdict.

This milestone is UI-only. Do not add validation logic, AI integration, database, auth, or real analysis behavior yet.

## Requirements

Create a focused workspace page where the user can upload a static Meta creative and provide campaign context.

The page should include:

- Page route: `/analyze`
- Static creative upload area
  - Drag-and-drop style visual container
  - Upload icon or minimal visual cue
  - Helper text for supported formats, but no validation logic yet
- Form fields:
  - Brand
  - Website
  - Industry
  - Campaign objective
  - Target audience optional
- Primary CTA:
  - “Analyze”
- Secondary navigation:
  - subtle link back to landing page
- Premium minimal design
- Apple-inspired spacing and typography
- Responsive desktop and mobile layout

## UX Direction

The page should feel like a calm professional workspace, not a generic web form.

The upload area should feel important, polished, and central to the experience.

Use mock/non-functional behavior only where needed.

## Acceptance Criteria

- `/analyze` loads successfully
- Upload area is visible and polished
- All form fields are present
- Analyze button is present
- No validation logic yet
- No AI integration
- No database/auth
- Page is responsive
- App runs with `npm run dev`
- No console errors