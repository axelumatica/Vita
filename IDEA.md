Vita — IDEA.md

Product vision, architecture intent, and implementation contract for Hermes

Status: Product/architecture brief
Purpose: Give Hermes enough context to understand what Vita is, what matters, what is already decided, what must not be violated, and what should be built next.

1. What Vita is

Vita is a private, local-first personal companion for capturing thoughts, reflecting, organizing memory, and turning explicit intentions into manageable actions.

The product combines:

a personal encrypted Vault;

a Diary for freeform reflection and raw expression;

a Task system designed to reduce overwhelm;

voice and text capture;

visual/document capture where supported;

semantic retrieval across personal memory;

Lior, an AI companion and organizer.

The central product problem is not simply “taking notes”.

Vita is intended to reduce the friction between:

I have a thought → I need to get it out → I need to find it again → I may eventually need to act on it.

The user should not have to decide the correct folder, tag, project, or organizational system before capturing something.

2. Core philosophy

2.1 Local-first

The default assumption is:

User data stays on the user's device.

Vita should not silently upload notes, voice recordings, diary entries, embeddings, behavioral data, or conversation history.

If any remote processing is ever introduced:

it must be explicit;

the user must know before data leaves the device;

the active execution mode must be visible;

there must never be a silent cloud fallback.

The UI must be able to display states such as:

LOCAL

REMOTE — EXPLICITLY ENABLED

PROCESSING UNAVAILABLE

Do not fake a local state when processing is remote.

2.2 Privacy is a product feature

Security and privacy are not hidden implementation details.

The product must avoid:

hidden behavioral telemetry;

eye tracking;

camera-based emotional inference;

covert user profiling;

silent AI/provider fallbacks.

Manual settings are preferred over surveillance-based adaptation.

For example:

low-stimulus mode can be manually enabled;

reduced motion can be manually enabled;

the interface can remember explicit preferences.

Do not infer these states from covert sensor analysis.

2.3 Preserve the source

AI-generated structure must never replace original user material.

For voice capture, conceptually keep:

the original audio, if retained;

the raw transcript;

AI-generated summaries;

extracted tasks;

extracted references;

tags or project associations.

These are related layers, not replacements for one another.

The user must always be able to inspect what they actually said.

2.4 ADHD-oriented, not ADHD-themed

The UX should reduce cognitive load.

Primary principles:

front-load the most important information;

avoid showing twenty equally important things;

progressive disclosure;

one obvious primary action;

no shame-based counters;

no aggressive “productivity streak” mechanics;

no notification spam;

preserve old ideas without keeping them visually noisy.

The interface should help with action and retrieval without requiring constant maintenance.

3. Lior

3.1 What Lior is

Lior is the central companion experience.

Lior should not feel like:

a generic chatbot;

a customer support bot;

a productivity robot;

a list generator.

The intended feeling is closer to:

A capable, attentive presence that can listen, reflect, remember context, and organize explicit information when useful.

Lior can move between modes depending on context.

Reflective mode

Useful when the user is:

thinking aloud;

venting;

reflecting;

exploring uncertainty;

discussing emotions;

processing experiences.

In this mode, Lior should not constantly interrupt to create tasks.

Brain-dump mode

When the user is rapidly dumping thoughts:

prioritize listening;

preserve the flow;

silently extract possible structure;

avoid interrupting with questions;

stage uncertain interpretations.

Organizational mode

Useful when the user explicitly asks to:

create tasks;

summarize;

organize;

retrieve memories;

connect notes;

plan.

The mode should not necessarily require a visible “mode selector”. It can be contextual, while remaining predictable.

4. Literal First: anti-hallucination architecture

This is a critical product rule.

Lior must distinguish between:

what the user explicitly said;

what can be safely structured from what was said;

what is uncertain;

what would be inference.

Do not turn ambiguous language into confident structured facts.

Examples of forbidden transformations:

a desire → an invented commitment;

an emotion → a diagnosis;

a vague possibility → a scheduled plan;

an ambiguous project reference → a confidently assigned project.

A suggested extraction model:

ExtractedItem
    id
    type
    literal_content
    source_reference
    source_span
    confidence
    destination
    requires_confirmation
    created_at

Possible type values:

task_candidate

diary_reference

idea

project_reference

quote

memory_reference

summary

The exact database model can differ, but the separation of literal source and interpretation should remain.

5. Confidence and confirmation

Automatic organization is acceptable only when the system is sufficiently confident.

Conceptual behavior:

new content
    ↓
local analysis
    ↓
high confidence?
    ├── yes → auto-route according to product rules
    └── no  → neutral staging / confirmation

For uncertain project association:

“Link this to Vita?”

Actions:

Yes

No

Choose another project

Leave unassigned

The confirmation should be discreet and should not interrupt a conversation unless the decision is immediately necessary.

The previous design discussion used a conceptual threshold around 80% confidence. Treat that as a product starting point, not a mathematically final universal constant. The implementation should allow the threshold/policy to evolve.

6. Global navigation

The core navigation has five destinations:

Home → Diary → Lior → Tasks → Vault

Lior is the central destination.

Conceptually:

┌────────┬────────┬────────────┬────────┬────────┐
│ Home   │ Diary  │    Lior    │ Tasks  │ Vault  │
└────────┴────────┴────────────┴────────┴────────┘

On mobile:

bottom navigation is appropriate;

Lior is visually emphasized in the center;

top-level destinations must remain discoverable;

do not hide core destinations inside an overflow menu.

7. Screen specifications

7.1 Home

Purpose

The grounding screen.

When opening Vita, the user should quickly understand:

where they left off;

what matters now;

how to immediately capture something.

Recommended hierarchy

Lior contextual briefing;

quick capture;

today's anchor;

memory/context;

recent activity.

Hero

Example:

“You have one focus task and three next steps.”

The briefing should be short.

Do not produce an essay every time the app opens.

Quick capture

Visible options:

Voice

Text

Diary

Potential future capture options can include image/document capture, but the initial hierarchy should remain simple.

Today's anchor

Show one primary focus item.

Do not show a giant priority matrix.

The user should be able to:

complete it;

open it;

replace it;

break it into smaller steps.

7.2 Diary

Purpose

A place for free expression.

The user should not have to classify content before writing.

Supported capture concepts:

typing;

voice;

attachments where supported.

Important rule:

Expression first, organization second.

AI-generated summaries or extracted tasks must not overwrite the original entry.

Diary should support:

drafts;

chronological history;

opening individual entries;

searching/retrieving related content.

7.3 Lior

Primary concept

A presence-first conversational screen with a live scratchpad.

Suggested structure:

┌───────────────────────────────┐
│ Execution state / privacy     │
├───────────────────────────────┤
│                               │
│           LIOR                │
│        animated presence      │
│                               │
│      Listening / Thinking     │
│                               │
├───────────────────────────────┤
│ LIVE SCRATCHPAD               │
│                               │
│ Key points                    │
│ Memory references             │
│ Staged task candidates        │
│ Raw transcript access         │
│                               │
├───────────────────────────────┤
│ Mic | State | End session     │
└───────────────────────────────┘

Scratchpad

The scratchpad is a temporary working context.

Possible card types:

key point;

referenced memory;

task candidate;

summary;

quote;

project association.

Behavior:

high-confidence items can be routed according to policy;

uncertain items remain staged;

manually pinning an item is always possible;

transient cards may disappear after a session if not pinned or saved;

the end of a session should provide a concise summary of what changed.

Do not automatically dump every conversational sentence into the permanent Vault.

7.4 Tasks

Purpose

Turn intention into manageable action without becoming an anxiety-inducing task manager.

Recommended structure:

Focus of the Day
    ↓
Next Steps
    ↓
Ready for Later
    ↓
Archived / Inactive

Focus of the Day

Maximum one primary item visible.

Next Steps

Small, bounded list.

Target: roughly 3–5 visible items.

Ready for Later

Contains things that matter but do not currently deserve visual priority.

It should be collapsible or visually secondary.

Task decomposition

Large tasks should be breakable into smaller executable steps.

Example:

“Build Vita”

→ Review wireframe
→ Define data model
→ Implement navigation
→ Prototype Vault

Do not assume every decomposition should happen automatically without showing the user what was created.

7.5 Vault

Purpose

The encrypted long-term memory system.

The Vault is not simply a folder tree.

It should support:

local search;

semantic retrieval;

categories;

project hubs;

raw voice clips;

diary entries;

notes/pages;

visual/document material.

Search

Example intent:

“That time I was anxious about Vita…”

The search system should eventually retrieve semantically related content rather than requiring exact keywords.

The search UI should be immediately available.

Bento presentation

The Vault can use adaptive Bento cards.

Possible card types:

project hub;

diary entry;

voice dump;

visual note;

OCR/document note.

Project hubs

Projects should be contextual clusters rather than rigid nested folders.

A project hub can contain:

notes;

tasks;

diary references;

voice clips;

related extracted ideas.

Opening a hub filters the current memory universe to relevant context.

8. Auto-routing policy

Lior can organize content, but organization must be conservative.

Examples:

Explicit actionable intention
    → Task candidate

Reflection / experience
    → Diary or diary-linked memory

Idea
    → Vault idea / project context

Uncertain
    → Scratchpad / staging

A user should also be able to manually route an item.

Manual actions should be simple:

Pin

Move

Save to…

Leave temporary

Avoid forcing the user through a multi-step folder picker for every thought.

9. Notifications

Notifications should be useful, sparse, and non-shaming.

Suggested behavior:

Morning

One discreet notification for the primary focus, if enabled.

Secondary work

Grouped reminders within user-defined time windows.

Missed work

Do not show:

“YOU FAILED”

giant overdue counts;

escalating guilt notifications.

Instead:

roll the task forward;

offer “return to later”;

preserve the task.

10. Archive and cognitive cleanup

Old items should not necessarily be deleted.

Conceptually distinguish:

Active
Ready for Later
Archived / Inactive

The previous product discussion included the concept of an “Unconscious Archive”: old untouched tasks or ideas can recede from the active interface without being destroyed.

Any automatic archival policy should be transparent and reversible.

Before implementing automatic movement:

define inactivity rules;

preserve search access;

allow restoration;

avoid destructive deletion.

11. Search and semantic memory

The long-term architecture should support local semantic retrieval.

The implementation should conceptually separate:

UI
↓
Search service interface
↓
Lexical search / semantic search implementations
↓
Local index

Do not tightly couple UI code to one embedding provider or vector database.

The user-facing search should be capable of combining:

exact keyword matches;

semantic similarity;

recency;

explicit project context.

Ranking policies should be testable.

12. Security model

The system concept includes:

Master password
    ↓
Password key derivation
    ↓
Root encryption key access
    ↓
Encrypted Vault

The product discussion established:

Argon2id as the intended password-derivation direction;

AES-256-GCM as the intended encryption direction;

Android Keystore / StrongBox for platform-backed key handling where available;

biometrics as an unlock convenience rather than the root of trust.

Do not invent recovery guarantees.

Recovery UX and backup policy need an explicit threat-model pass.

13. Execution-state transparency

Every AI-dependent operation should conceptually expose:

requested
    ↓
processing
    ↓
local success

or:

requested
    ↓
remote processing explicitly approved
    ↓
remote success

or:

requested
    ↓
unavailable / failed

Never silently transform:

local unavailable → upload user data → continue

The UI must have a state model for this.

14. Visual language

Dark

Primary:

Deep Midnight Blue
#0B132B

Surface:

#151F3D

Primary light accent:

Warm Cream
#F7F4EA

Light

Invert the dominant relationship:

Warm Cream background
Deep Midnight Blue text/accent

The aesthetic should be:

calm;

tactile;

warm;

precise;

not neon;

not cyberpunk;

not overly sterile.

15. Motion and haptics

Lior

The central visual can use an organic animated orb/presence.

States:

idle
listening
thinking
speaking
unavailable

Motion should communicate state, not exist purely for decoration.

Low-stimulus mode

Should reduce:

unnecessary motion;

decorative animation;

visual density.

Haptics

Use sparingly:

task completion;

capture confirmation;

session state transitions.

Avoid noisy, game-like feedback.

Sound

No artificial UI sounds by default.

16. Recommended Android architecture

Target direction:

Kotlin
Jetpack Compose
Android 10+

Recommended high-level architecture:

Presentation
    Compose UI
    ViewModel
        ↓
Domain
    Use cases / policies
        ↓
Data
    Repositories
    Local storage
    AI adapters

Do not let Compose screens directly own:

encryption logic;

AI model implementation;

vector index details;

audio engine details.

Use interfaces.

17. Recommended technology categories

These are implementation recommendations, not blindly fixed dependency versions.

UI

Jetpack Compose

Material 3

Navigation

Navigation Compose

State

ViewModel

StateFlow

Dependency injection

Hilt

Structured persistence

Room

Serialization

kotlinx.serialization

Background work

WorkManager

Audio

Media3 and/or appropriate Android native audio APIs

Images

Coil

Security

Android Keystore

StrongBox where available

vetted cryptographic libraries/primitives

Testing

JUnit

Compose UI tests

instrumentation tests

repository/domain unit tests

18. AI architecture requirement

Do not hardcode the app around one model.

Use capability-oriented interfaces.

Example:

interface SpeechToTextEngine {
    suspend fun transcribe(input: AudioInput): TranscriptResult
}

interface ConversationEngine {
    suspend fun respond(context: ConversationContext): ConversationResult
}

interface ExtractionEngine {
    suspend fun extract(source: SourceMaterial): ExtractionResult
}

interface EmbeddingEngine {
    suspend fun embed(text: String): FloatArray
}

The actual interfaces may change.

The principle must remain:

The UI depends on capabilities and states, not on a specific AI provider.

This allows:

local engines;

future engines;

optional remote engines;

testing fakes.

19. Suggested data domains

Do not collapse all content into one generic blob.

Potential domains:

VaultItem
DiaryEntry
Task
ProjectHub
ConversationSession
Transcript
AudioAsset
Extraction
EmbeddingReference

Relationships should preserve source lineage.

For example:

ConversationSession
    └── Transcript
            └── Extraction(s)
                    ├── Task
                    ├── VaultItem
                    └── Project association

A Task created from speech should know where it came from.

20. Critical invariants

Hermes must preserve these unless explicitly instructed otherwise.

Invariant 1

No silent cloud fallback.

Invariant 2

Original user material is never overwritten by AI interpretation.

Invariant 3

Uncertain extraction is not presented as fact.

Invariant 4

The user should not need to organize everything before capturing it.

Invariant 5

Lior should not be implemented as a generic chatbot UI.

Invariant 6

Tasks should reduce overwhelm rather than expose an infinite wall of obligations.

Invariant 7

Core navigation remains:

Home → Diary → Lior → Tasks → Vault

Invariant 8

Privacy state must be understandable by a non-technical user.

21. Known open decisions

Do not treat these as finalized requirements.

Memory decay

Still requires a final policy.

Questions:

automatic fade?

manual archive?

inactivity threshold?

review before archival?

Hybrid AI

The desired experience requires high-quality conversation.

The final contract between:

local models;

remote models;

user consent;

context transmission;

still needs to be finalized.

Backup and recovery

Encrypted export and peer-to-peer sync concepts require a threat-model and UX design pass.

Exact task selection logic

Task decomposition is important.

The final balance between:

automatic focus selection;

user choice;

contextual/energy-based assistance;

remains open.

22. What Hermes should build first

Do not attempt to build every AI subsystem immediately.

Recommended sequence:

Phase 1 — Product shell

Build:

app theme;

five-tab navigation;

Home;

Diary;

Lior visual shell;

Tasks;

Vault Bento shell.

Use realistic fake repositories.

Phase 2 — State and persistence

Add:

Room models;

repositories;

ViewModels;

navigation state;

basic local persistence.

Phase 3 — Capture

Implement:

text capture;

basic voice capture pipeline;

raw source preservation.

Do not allow AI extraction to mutate permanent data yet.

Phase 4 — Scratchpad and staging

Implement:

temporary session cards;

pinning;

explicit confirmation;

routing previews.

Phase 5 — Extraction

Implement Literal First extraction with extensive tests.

Priority tests should include:

ambiguous statements;

wishes vs commitments;

emotional statements;

uncertain project references;

incomplete speech.

Phase 6 — Vault retrieval

Implement:

keyword search;

then semantic search behind an abstraction.

Phase 7 — Lior intelligence

Connect the conversational engine only after:

privacy state;

source preservation;

extraction safety;

routing boundaries;

are stable.

23. Definition of “done enough” for the first prototype

The first usable prototype should allow a user to:

unlock/open the app;

navigate all five sections;

create a Diary entry;

create a Task;

enter the Lior screen;

simulate or perform capture;

see scratchpad items;

pin/reroute a scratchpad item;

browse Vault content;

search local mock/real content;

understand whether processing is local or remote.

The first prototype does not need:

perfect AI;

production semantic search;

production backup/sync;

every possible capture format.

24. Reference artifact

A companion HTML wireframe has been produced for this project.

It contains representative screens and interaction demonstrations for:

Home;

Diary;

Lior;

Tasks;

Vault;

privacy/security;

behavioral flows;

visual system;

technical recommendations.

Use that wireframe as a UX reference.

However:

This IDEA.md is the behavioral and architectural contract.
The HTML is the visual reference.

If they conflict, flag the conflict instead of silently choosing one.

25. Final instruction to Hermes

Build Vita as a system where:

capture is effortless, memory is recoverable, organization is helpful but conservative, and the AI never pretends to know more than the user actually gave it.

Optimize for clarity and cognitive relief.

Do not optimize for feature count.

Do not introduce hidden intelligence.

Do not silently move private data off-device.

When uncertain:

preserve the source;

stage the interpretation;

show uncertainty;

ask only when necessary.

That is Vita.
