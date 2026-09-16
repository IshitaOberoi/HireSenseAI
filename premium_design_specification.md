# HireSense AI – Premium AI-Native Design Specification
**Document Version:** 2.1.0 (Frozen Design Specification)  
**Author:** Head of Product Design  
**Benchmarks:** Cursor, Linear, Perplexity, ElevenLabs, Vercel, Stripe  
**Visual Palette:** Dark, high-density, editorial typography, zero-glow minimal elevation.

---

## 1. Product Design Philosophy (AI-Native Workflow)

HireSense AI is an **AI-native Career Intelligence Platform**. Instead of presenting empty tables and forms that wait for user inputs, the platform proactively guides the user. Every screen answers a single question: *"What should the user do next?"*

### AI-First Design Pillars:
*   **Proactive Guidance (The Command Center):** The interface greets the user with synthesized narrative summaries, highlighting current readiness and listing prioritized actions.
*   **Command Palette Navigation:** A global query overlay (`Ctrl + K` or `⌘ K`) serves as the primary navigation tool, allowing immediate document analysis, interview simulation triggers, or page routing.
*   **Top Navigation Layout:** Replaces the traditional side navigation layout with an ultra-clean, minimal top navigation bar. This maximizes horizontal space for dense content dashboards and provides a modern, premium SaaS feel.
*   **Conversational Today's Insights:** Transforms bullet-point AI readouts into a single cohesive "Today's Insight" narrative card, explaining recommendations and context.
*   **Contextual Floating AI Assistant:** A minimal floating action button triggers a contextual helper overlay. This assistant acts as a quick-query drawer to answer candidate questions about resume edits, matching reasons, or interview prep feedback on the fly, without taking over the workspace.

---

## 2. Global Design Tokens (Color & Typography)

### Color System
*   **Background:** `#050816` (Deepest Navy)
*   **Surface:** `#0F172A` (Slate 900)
*   **Primary:** `#2563EB` (Blue 600)
*   **Accent:** `#38BDF8` (Sky 400)
*   **Success:** `#10B981` (Emerald 500)
*   **Warning:** `#F59E0B` (Amber 500)
*   **Error:** `#EF4444` (Red 500)
*   **Primary Text:** `#F8FAFC` (Slate 50)
*   **Secondary Text:** `#94A3B8` (Slate 400)
*   **Borders:** `rgba(255,255,255,0.06)`

### Typography Scale
Primary Font: **Geist Sans** (or **Inter**) with tight tracking on titles.
*   `display-2xl`: `3.75rem (60px)` | Line height `1.1` | Weight `800` (Hero sections)
*   `display-lg`: `2.00rem (32px)` | Line height `1.2` | Weight `700` (Dashboard greetings)
*   `title-md`: `1.25rem (20px)` | Line height `1.3` | Weight `600` (Cards, summaries)
*   `body-md`: `0.875rem (14px)` | Line height `1.5` | Weight `400` (Paragraphs, readouts)
*   `caption-sm`: `0.75rem (12px)` | Line height `1.4` | Weight `500` (Short metadata, tag pills)
*   `code-mono`: `0.812rem (13px)` | Line height `1.0` | Weight `400` (Shortcodes, tokens)

---

## 3. Component Library Spec

### A. The Command Palette (`⌘ K`)
*   **Trigger:** Global keyboard listeners capture `Ctrl + K` or `⌘ K`.
*   **Visual Spec:** Backdrop blurred modal screen (`#050816` overlay). Search input with monospace border changes, presenting matching commands (e.g. `> Start Mock Interview`, `> Upload Resume`).
*   **Interaction:** Focus remains within input; items selectable via Arrow keys and `Enter`.

### B. Action Timelines
*   **Specification:** Left-aligned 1px border `rgba(255,255,255,0.06)`. Milestones marked by small, flat circular indicators (`#2563EB`). Completed stages marked with `#10B981` dots. Contains date, activity header, and secondary action links.

### C. Floating AI Assistant (Drawer)
*   **Specification:** A clean, flat circle toggle button at the bottom-right corner (`bg-#2563EB`, text-white, no glowing drop-shadows). Clicking slides out a context-aware chat drawer from the right edge (`width: 380px`). It pre-populates based on the current page workspace context (e.g. "Ask about this resume rating").

---

## 4. AI-First Dashboard & Navigation Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HIRESENSE AI DESKTOP SHELL                      │
├────────────────────────────────────────────────────────────────────────┤
│ Header Topbar: [H] HireSense AI | Dashboard  Matches  MockPrep | ⌘ K  (O)│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Welcome, Ishita 👋                                                    |
│  Role Level: Advanced Backend Candidate                                │
│                                                                        │
│  ┌───────────────────────┐  ┌─────────────────────────┐                │
│  │   Daily Goals Core    │  │   Today's Insight Card  │                │
│  │   • Bullets check     │  │   "Adding Docker boosts │  [AI Helper]   │
│  │   • Mock Interview    │  │    match score by 10%   │   Button       │
│  │   • Review matches    │  │    for Vercel positions"│                │
│  │   └───────────────────┘  └─────────────────────────┘                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Page Wireframe Specifications

### 1. Candidate Dashboard (The Command Center)
The dashboard greets the candidate with an immediate status overview and clear daily objectives:

```text
+-----------------------------------------------------------------------+
|  [H] HireSense AI   Dashboard   Jobs   MockPrep     Search (⌘ K)  (O) |
+-----------------------------------------------------------------------+
|                                                                       |
|  Good Evening, Ishita 👋                                               |
|  Level: Advanced Backend Candidate                                    |
|  Insight: Your profile scores in the top 15% of applicants this week.  |
|                                                                       |
|  [ Continue Career Journey ]     [ View AI Insights ]                 |
|                                                                       |
|  Today's Guided Actions            Today's Insight                    |
|  +------------------------------+  +--------------------------------+ |
|  | [ ] Improve resume bullets   |  | Adding Docker to your profile  | |
|  | [ ] Practice database mock   |  | would improve your match score | |
|  | [ ] Review matched job posts |  | by 10% for the 14 new openings | |
|  +------------------------------+  | posted by Stripe and Vercel.   | |
|                                    +--------------------------------+ |
|                                                                       |
|  Activity Timeline                                                    |
|  o-- Resume parsed successfully (alex_mercer_cv.pdf) -- 12m ago       |
|  o-- Mock interview completed: Java Backend -- 1d ago                 |
|                                                                       |
|                                                          [?] AI Helper|
+-----------------------------------------------------------------------+
```

### 2. Upload Experience (Asynchronous Processing Flow)
Visual representation of the extraction task timeline:

```text
+-----------------------------------------------------------------------+
|  [H] HireSense AI   Dashboard   Jobs   MockPrep     Search (⌘ K)  (O) |
+-----------------------------------------------------------------------+
|                                                                       |
|      +---------------------------------------------------------+      |
|      |                                                         |      |
|      |                  [ Drop PDF Resume here ]               |      |
|      |                                                         |      |
|      +---------------------------------------------------------+      |
|                                                                       |
|      Processing pipeline status:                                      |
|      (✓) File Upload Complete                                         |
|      (✓) Text Segment Extraction                                      |
|      (•) Parsing Resume entities...                                   |
|      ( ) Generating Vector Embeddings                                 |
|      ( ) Semantic Analysis Matching                                   |
+-----------------------------------------------------------------------+
```

### 3. Resume Analysis (Editorial Executive Summary)
Presents parsed results as a clean, read-only document layout with quick-edit actions.

```text
+-----------------------------------------------------------------------+
|  [H] HireSense AI   Dashboard   Jobs   MockPrep     Search (⌘ K)  (O) |
+-----------------------------------------------------------------------+
|                                                                       |
|  Resume Health: Excellent (82/100)                     [ Edit Section ]|
|                                                                       |
|  Executive Summary                                                    |
|  High-performing Junior Engineer with solid microservices experience.  |
|                                                                       |
|  Top Strengths                        Recommended Improvements         |
|  +---------------------------------+  +------------------------------+ |
|  | • Core Spring Boot competency   |  | • Missing Docker definitions | |
|  | • Complex DB schemas mapping    |  | • Expand cloud deployments   | |
|  +---------------------------------+  +------------------------------+ |
|                                                                       |
|  Technical Skill Matrix                                               |
|  Languages: Java, Python, SQL                                         |
|  Frameworks: Spring Boot, FastAPI, Hibernate                          |
|                                                                       |
|  Experience Timeline                                                  |
|  Software Intern @ Tech Solutions Corp (June 2025 - Present)          |
|  • Developed clean, modular Spring Boot REST endpoints.               |
|                                                                       |
|                                                          [?] AI Helper|
+-----------------------------------------------------------------------+
```

### 4. Job Matching Dashboard
Answers *"Why am I a match?"* using comparative metrics:

```text
+-----------------------------------------------------------------------+
|  [H] HireSense AI   Dashboard   Jobs   MockPrep     Search (⌘ K)  (O) |
+-----------------------------------------------------------------------+
|                                                                       |
|  Stripe - Senior React Developer                                      |
|  Candidate Match Rating: 94%           Confidence: 0.91               |
|                                                                       |
|  Match Metrics                                                        |
|  +-----------------------------+  +---------------------------------+ |
|  | Skill Coverage: 85%         |  | Experience Match: Strong        | |
|  | Semantic Cosine: 91%        |  | Education Match: Verified       | |
|  +-----------------------------+  +---------------------------------+ |
|                                                                       |
|  Explainable AI Reasoning                                             |
|  • Candidate built Stripe-based checkouts.                            |
|  • Gaps: Lacks background in Celery tasks and Redis cache setups.     |
|                                                                       |
|  Recommended Learning Path                                            |
|  - Read: Getting started with Celery tasks and Redis in Python.       |
|                                                                       |
|                                                          [?] AI Helper|
+-----------------------------------------------------------------------+
```

### 5. Career Roadmap (Skill Gap Redesign)
Transforms static lists into active learning sequences with estimated completion timelines.

```text
+-----------------------------------------------------------------------+
|  [H] HireSense AI   Dashboard   Jobs   MockPrep     Search (⌘ K)  (O) |
+-----------------------------------------------------------------------+
|                                                                       |
|  Current Level: Intermediate       Target: Senior Backend Platform    |
|                                                                       |
|  Learning Timeline Recommendations                                    |
|  +-----------------------------------------------------------------+  |
|  | 1. Celery Task Processing (Redis, Queues) -- Est: 4h            |  |
|  |    [ Resource: FastAPI Celery Integrations Guide ]               |  |
|  |                                                                 |  |
|  | 2. PostgreSQL Vector Database (pgvector HNSW) -- Est: 6h        |  |
|  |    [ Resource: Practical pgvector Setup and Indexing ]          |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

### 6. Interview Studio (Flagship Recording Space)
An ElevenLabs-inspired mock interview console:

```text
+-----------------------------------------------------------------------+
|  [H] Mock Studio  /  Java Backend Screening            Timer: 02:40   |
+-----------------------------------------------------------------------+
|                                                                       |
|  Question 1 of 5                                                      |
|  "Explain the difference between optimistic and pessimistic locking   |
|  in JPA. When would you choose one over the other?"                    |
|                                                                       |
|  Waveform Visualizer:                                                 |
|  ..||...|||||...|||...||||...|||||||...|||...||||...|||||...||..       |
|                                                                       |
|                     [ RECORD ]      [ MUTE ]                          |
|                                                                       |
|  Live Streaming Transcript:                                           |
|  "For optimistic locking, we use version attributes..."               |
+-----------------------------------------------------------------------+
```

### 7. Post-Interview Report
Detailed feedback console for candidate evaluation:

```text
+-----------------------------------------------------------------------+
|  [H] HireSense AI   Dashboard   Jobs   MockPrep     Search (⌘ K)  (O) |
+-----------------------------------------------------------------------+
|                                                                       |
|  Overall Rating: 82%                                                  |
|                                                                       |
|  Metrics:                                                             |
|  Technical: 84%      Communication: 80%      Confidence: High         |
|  Speech Rate: 130 WPM (Optimal)       Filler Words: 3% (Low)          |
|                                                                       |
|  Key Strengths & Opportunities                                        |
|  +-----------------------------+  +---------------------------------+ |
|  | Strengths:                  |  | Opportunities:                  | |
|  | • Explained lock collision. |  | • Missed isolation details.     | |
|  +-----------------------------+  +---------------------------------+ |
|                                                                       |
|  [ Download PDF Report ]                    [ Review Video Capture ]  |
+-----------------------------------------------------------------------+
```

### 8. Recruiter Dashboard (Modern ATS)
High-density applicant comparisons dashboard:

```text
+-----------------------------------------------------------------------+
|  [H] Recruit Portal  Jobs   TalentPool   Analytics     Search (⌘ K)(O)|
+-----------------------------------------------------------------------+
|  Job: Senior React Developer                                          |
|  Search Talent: [ React developers with AWS cloud credentials... | ]  |
|                                                                       |
|  Candidate Spotlights:                                                |
|  +-----------------------------------------------------------------+  |
|  | 1. Sarah Jenkins -- Match: 94% -- Latency check: Verified       |  |
|  |    Highlights: Strong frontend background, 3 years at Stripe.     |  |
|  |                                                                 |  |
|  | 2. Michael Chang -- Match: 87% -- Skill Gap: Needs Python        |  |
|  |    Highlights: Strong Spring Boot backend, lacks React framework|  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

### 9. Command Palette Modal (⌘ K Overlay)
Displays keyboard shortcuts, page searches, and command filters:

```text
+-----------------------------------------------------------------------+
|  Search Commands or Pages... (Esc to exit)                            |
+-----------------------------------------------------------------------+
|                                                                       |
|  Search results:                                                      |
|  > Start Mock Interview                                        [Enter]|
|  > Upload New Resume File                                             |
|  > Navigate to Matches                                                |
|  > Profile Configuration Details                                      |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## 6. Premium Empty States & Skeletons

### A. Empty State (Recruiter Jobs Empty List)
*   **Headline:** No active job posts listed yet.
*   **Body:** Post your first position specification to enable pgvector candidate matching.
*   **Primary CTA:** `[ Post Position ]`

### B. Empty State (Candidate Interviews List)
*   **Headline:** No mock sessions completed yet.
*   **Body:** Practice technical questions to get speech rate, filler, and technical assessments.
*   **Primary CTA:** `[ Open Studio ]`

---

## 7. Loading States & Progress Indicators

*   **Fast API callbacks:** Replaces generic spinners with cascading checks (`(✓) File upload -> (•) Parsing resume -> ( ) Embeddings`).
*   **Dashboard load:** Skeletons pulse softly (`#0F172A` to `#1E293B` back and forth) over a duration of `1.2s`.
*   **AI text readouts:** Simulates real-time streaming output typing animations for reasoning text boxes, giving an interactive feel.

---

## 8. Microinteractions

*   **Link Click:** Transitions elements using `transition: 80ms cubic-bezier(0.16, 1, 0.3, 1)`.
*   **Active selection states:** Card items scale slightly (`scale-98`) on clicks, providing tactile feedback.
*   **Palette overlays:** command palettes slide down `15px` from top inside `100ms`, returning on Escape commands.
