# NEUROATLAS

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the owner, learning independently and building knowledge toward practical brain–computer interfaces (BCI), neural decoding, computational neuroscience, and AI/ML research. This audience was confirmed during Impeccable initialization on 2026-10-13.

The product must make a large interdisciplinary subject understandable without requiring the learner to master every neighboring discipline before starting a project. A broader public-learning audience is not the current primary audience.

## Product Purpose

NEUROATLAS organizes the knowledge needed to study neurocybernetics and related sciences, especially for creating brain–computer interfaces. It connects foundational subjects to specialist methods, projects, and research paths.

Success means the learner can understand why a topic matters, identify its prerequisites, choose a useful next step, and demonstrate a skill using a checkable practical result. Finishing a course or marking a module complete is not itself proof of competence.

## Positioning

The central mechanism is an explorable dependency graph linked directly to the curriculum. Every node represents a learning module or scientific area; directed connections run from prerequisite knowledge to the topic it enables.

The graph is paired with practical outcomes, five goal-based learning routes, projects, and links to official educational resources. It distinguishes a first prototype, research capability, and the multidisciplinary requirements of clinical systems. Do not invent exclusivity, market comparisons, performance claims, or clinical authority.

## Operating Context

- Independent study on desktop and mobile browsers.
- Russian-language curriculum and interface.
- Start with an overview, choose a route or search a module, inspect prerequisites, read the learning card, follow an external resource, and undertake a practical project.
- Use the 3D map to explore relationships; use the curriculum and text-based map when reading or keyboard navigation is more appropriate.
- Assess readiness through module outcomes and staged practical work.
- Learning status, completed projects, selected route, and motion preference are stored in the current browser. They are not synchronized between devices.

## Capabilities and Constraints

Existing implementation:

- Eight views: overview, curriculum, 3D dependency map, learning routes, practice, resources, full lectures and study schedule.
- 116 learning modules across 10 directions, with 293 directed prerequisite connections.
- Five learning routes, 13 practical projects, 18 resource entries, and a comparison of 11 registration/interface modalities.
- Search, category/status filters, topic details, prerequisite and successor navigation, path highlighting, and self-reported completion.
- 116 individual Russian lectures with worked examples, exercises and solutions, misconceptions, quizzes and primary sources. A dedicated reading view includes contents navigation, notes, print styles and progress in the current lecture.
- A prerequisite-aware study plan for five routes or the entire atlas, 2–24 hours per week and 2–6 study days, with estimated dates, calendar export and browser-local backup/import. Existing progress keys are preserved.
- A scroll-synchronised Anime.js/Three.js teaching scene explains neural activity, acquisition, decoding and control. It uses four actual 3D compositions, responsive rendering budgets, explicit motion reduction and cleanup.
- Camera rotation, zoom, focus, reset, optional auto-rotation, hover labels, and a distance-based transition from points to spheres and directed particle streams.
- Spherical spatial organization of modules, a 360° procedural cosmic background with 32,000 distant stars, 3,500 instanced star spheres and 112 additional surrounding objects (reduced counts on mobile), world-space galaxies, nebulae, a black hole, pulsar, quasar, ringed planet and comets; GPU-animated prerequisite-to-dependent particle streams, detailed spheres, and a collapsible topic panel.
- An immersive fullscreen map mode with a single exit control, Escape support, focus restoration and an edge-to-edge fallback when native fullscreen is unavailable.
- Topic spheres have subtle geometric relief and seamless procedural color/bump textures: ten surface families with three variations each. An additional 6,800 ambient particles (2,600 on mobile) move in slow, opposing three-dimensional tidal currents around the map; all use the existing reduced-motion clock.
- A text representation of the same map, WebGL fallback, keyboard controls, responsive layouts, and reduced-motion support.

Technical constraints:

- Existing static HTML/CSS/JavaScript site, using local Three.js and Anime.js assets. Preserve the functioning codebase rather than introducing a new framework without a concrete need.
- Site identity is recorded in `.openai/hosting.json`; retain that project and its access configuration when updating the website.
- Preserve existing progress keys and data compatibility.
- New clinical, hardware, account, synchronization, assessment, or sandbox features are separate scope decisions. They are not implied by the current product.
- Structural, DOM and scene-geometry checks run locally, including planner budgets, prerequisite ordering, notes, quizzes, backup import/export and reduced-motion cleanup. Actual browser rendering, animation smoothness and mobile visual behavior remain unverified: browser observation/navigation was denied in this session. Do not represent unit tests as visual or clinical validation.

## Brand Commitments

NEUROATLAS is the established product name. The site's subject is neurocybernetics and BCI, with a substantial connection to computational neuroscience and AI/ML.

Use precise, approachable educational language. Preserve real scientific terminology and distinguish a suggested learning path from a mandatory prerequisite or certified qualification. Visual-system documentation is outside this product record.

## Evidence on Hand

- `dist/data.json`: curriculum topics, explicit dependencies, outcomes, routes, projects, resources, modalities, metrics, research pitfalls, and milestones.
- `generate-data.py`: source generator for the curriculum dataset.
- `dist/app.js`: existing reading, navigation, learning, and progress workflows.
- `dist/graph.js`: existing interactive graph and rendering behavior.
- `check.mjs`: runnable checks for curriculum integrity, route references, assets, and Site configuration.
- Resource links point to official educational materials, documentation, data archives, and research publications; describe their role without claiming complete training coverage or guaranteed results.

There are no user testimonials, accreditation, controlled learning-outcome studies, or clinical validation attached to this product. Do not fabricate them.

## Product Principles

1. Explain relationships before prescribing an exhaustive linear sequence.
2. Let the learner start practical work with the relevant subset of the foundation, then deepen knowledge for a chosen task.
3. Evaluate progress through explainable, reproducible, checkable outcomes rather than completion counts alone.
4. Use motion to clarify spatial relationships and state changes while keeping routine study quick and comfortable.
5. Preserve scientific accuracy: decoding quality is not proof of a neural mechanism, and a prototype is not a clinically validated system.

## Accessibility & Inclusion

The owner explicitly requested a responsive, user-friendly experience. Preserve mobile readability, usable touch targets, visible keyboard focus, labeled controls, and the accessible text-based map.

Respect both system reduced-motion preferences and the saved user preference. Nonessential effects should pause when offscreen or hidden. The essential learning tasks must remain available without WebGL and without spatial camera interaction.
