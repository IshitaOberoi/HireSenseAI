# Implementation Plan - HireSense AI Premium AI-Native Redesign

Plan for developing the front-end layout and page components for **HireSense AI** based on our frozen, refined AI-native design specification.

## User Review Required

Please review the complete, refined AI-native spec document:
*   [premium_design_specification.md](file:///C:/Users/reach/.gemini/antigravity/brain/1f8cbe6f-2bcb-4b32-94ab-84d7353d4644/premium_design_specification.md) - Details the Command Center dashboard, versioned prompt maps, local vector math operations, and flagship ElevenLabs-style audio Mock Studio.

> [!IMPORTANT]
> Final Frozen Design Guidelines (No further iteration):
> 1. **Top Navigation Layout:** The global shell uses a clean top bar for navigation (Dashboard, Jobs, MockPrep) instead of a sidebar to maximize workspace width.
> 2. **Meaningful Level Labels:** Hero sections display descriptive candidate levels (e.g. *"Advanced Backend Candidate"*) instead of raw percentages.
> 3. **Today's Insight Card:** Replaces bullet points with a conversational, cohesive text analysis mapping suggestions to opportunities.
> 4. **Floating AI Assistant:** Interactive circular button at the bottom-right corner toggle-sliding a contextual help drawer.
> 5. **Editorial Resume Workspace:** A parsed-sheet-style reading layout containing score widgets, top strengths, improvements logs, experience blocks, and edit drawers.

## Proposed Changes (Milestone 3 Code Structure Setup)

Once you approve this design spec and implementation plan, we will execute the following code changes:

### 1. Frontend Restructure & Modularization
Restructure the `/frontend/src/` folder into:
*   `src/components/` - Presentational elements (SkillGapRadar, MatchReasoningCard, CommandPalette, FloatingAiAssistant).
*   `src/layouts/` - Page shells (Header, ShellLayout).
*   `src/pages/` - Decoupled workspace layouts (CandidateDashboard, RecruiterDashboard, JobMatchingWorkspace, InterviewStudio, ResumeAnalysis).
*   `src/services/` - API axios connection wrappers.

### 2. Design System & CSS Configuration
*   Update `src/index.css` to declare the custom dark color system variables, default Geist Sans font-family, and progress timeline scrollbars.

### 3. Page Construction (Milestone 3 Scope)
We will build the following pages conforming to the refined wireframe specifications:
*   **Candidate Dashboard (Command Center):** Greeting header with level labels, goal check cards, and the conversational "Today's Insight" card.
*   **Resume Upload Progress Track:** Status check logs mapping async parser tasks.
*   **Resume Analysis (Executive Summary):** Read-only editorial layout showing scores, strengths list, and parsed experiences.
*   **Career Roadmap:** Timelines mapping estimated learning sequences, course materials, and progress bars.
*   **Job Matching Workspace:** ranked pool lists, pgvector matching metrics, skill radar cards, explainable match reasoning, and confidence tags.
*   **Profile Page:** Minimal API configuration layout.

---

## Verification Plan

### Manual Verification
1. Verification of the design documents by the user.
2. Alignment on command-driven interaction and AI-insights model.
