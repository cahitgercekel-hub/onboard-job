# ONboard Monetization Strategy

## Executive Summary
This document outlines the subscription and monetization model for ONboard, an AI-powered job tracking and career assistant platform. The pricing is structured to acquire users through a generous Free tier while driving revenue through a Pro tier that unlocks advanced AI capabilities and unlimited usage, ensuring sustainable margins based on underlying LLM token costs.

## AI Cost Economics (Google Gemini Flash)
The core operating cost of ONboard is the AI inference provided via Supabase Edge Functions connecting to the Gemini API.

**Estimated Token Usage per Feature:**
*   **Job Ingestion (Extract):** ~1,000 input / 150 output tokens.
*   **CV Analyzer:** ~2,500 input / 300 output tokens.
*   **Skill Translator / Tone Polish:** ~1,000 input / 250 output tokens.
*   **Interview Prep:** ~1,500 input / 400 output tokens.

**Estimated Cost (Gemini Flash Approximation):**
*   Assuming an active "Pro" user runs 150 AI operations per month (e.g., 20 CV scans, 50 job ingestions, 80 assistant tasks).
*   Total tokens: ~250,000 input / ~40,000 output.
*   Total cost per active user: **< $0.50 / month**.
*   *Conclusion:* Even heavy AI usage is extremely cheap. The subscription price should be based on **value provided to the user** (saving time, getting a higher salary) rather than strict cost-plus pricing.

## Proposed Tiers

### 1. Free Tier ("Job Seeker")
**Goal:** User acquisition and onboarding. Let them experience the "Aha!" moment of the Kanban board and basic AI feedback.
*   **Price:** $0
*   **Active Job Slots:** Up to 30 active jobs (forces power users to upgrade or aggressively clean up).
*   **CV Analyzer:** Limited to 3 scans per day. Basic feedback only.
*   **AI Auto-Add:** 10 total uses per month.
*   **Assistant Tools:** Restricted (e.g., grammar polish only, no cover letter rewrites).
*   **Data:** No CSV export.

### 2. Pro Tier ("Career Strategist")
**Goal:** Monetize users actively engaged in a serious job hunt who need a competitive edge.
*   **Price:** $9.99 / month (or $79 / year).
*   *Rationale:* Cheaper than Netflix, but highly justifiable as an "investment" during a job search.
*   **Active Job Slots:** Unlimited.
*   **CV Analyzer:** Unlimited scans + Detailed ATS parsing simulation.
*   **AI Auto-Add:** Unlimited.
*   **Assistant Tools:** Full access (Tone Analyzer, Interview Prep, Bulk Rewrites).
*   **Data:** Full CSV export and data portability.
*   **Support:** Priority support.
