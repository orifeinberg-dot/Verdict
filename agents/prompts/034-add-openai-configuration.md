# Milestone 034 — Add the OpenAI Configuration Boundary

## Objective

Introduce a typed configuration module for the future OpenAI integration.

The module should validate and normalize environment-based configuration while remaining completely disconnected from the current perception pipeline.

No SDK is installed.

No API call occurs.

Production behavior remains unchanged.

---

## Background

Current architecture:

OpenAIPerceptionEngine
        ↓
OpenAIClient
        ↓
stub error

Future architecture:

OpenAIPerceptionEngine
        ↓
OpenAIClient
        ↓
OpenAI configuration
        ↓
OpenAI SDK
        ↓
OpenAI API

Configuration should be resolved in one place rather than through scattered `process.env` reads or transport-layer magic constants.

---

## Deliverables

### 1. Create

```text
lib/verdict/openai/config.ts