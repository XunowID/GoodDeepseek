# KonteksFlow Product Roadmap

## Product direction

KonteksFlow extends DeepSeek with user-controlled context, practical work tools, and reviewable actions. It is a browser workspace around an existing model, not a new model or a claim to remove the model's limits.

## Product principles

- **Local-first:** keep memory and settings in the browser profile by default.
- **Context on demand:** send selected, relevant context rather than entire folders or unrelated data.
- **User control:** make the context being sent visible and allow users to pause or change it.
- **Review before writes:** show proposed file or service changes before applying them.
- **Clear capabilities:** distinguish implemented features from prompts, prototypes, and future integrations.
- **Least privilege:** ask only for permissions a feature needs and explain why.

## Current capabilities

- Persistent memory and configurable personality/system instructions.
- Custom skills, skill browsing, Auto Skill, and an explicit GitHub skill installer.
- Speech-to-text with a live transcript preview and insert/stop controls.
- Local workspace search with reviewable file changes.
- DOCX, XLSX, and PPTX generation, plus SVG illustrations.
- Prompt-based workflows, conversation export, and multilingual UI.

Current limitations: workspace retrieval is keyword-based; Workflow Studio prepares prompts for the chat rather than executing an autonomous workflow; the extension does not provide a native DeepSeek tool API, cloud terminal, web-research engine, remote MCP server, or external-service connector. Do not describe these as available until their full permission, error handling, and review flows are implemented.

## Roadmap

### 1. Improve trust and context controls

- Show which memories, skills, and workspace snippets will be included with a message.
- Add per-message controls to pause memory or exclude selected context.
- Improve file exclusions, path visibility, and change review.
- Validate generated documents and keep user-visible limitations accurate.

### 2. Make the workspace more capable

- Improve local retrieval with persistent indexing and more relevant ranked snippets.
- Add artifact previews, iteration history, and reliable restore for generated files.
- Make Auto Skill selection explainable and easy to override.
- Add workflow checkpoints and clear input/output status.

### 3. Add integrations incrementally

- Pilot a read-only connector with narrow OAuth scopes and an explicit disconnect control.
- Add write actions only after previews, per-action approval, verification, and recovery are available.
- Add sourced web research only when claims can be tied to retrieved URLs.
- Consider a separate optional MCP service for compatible AI clients; it is independent of the browser extension.

## Success criteria

- Users can inspect and control context before it is sent.
- Local search returns useful snippets without sharing an entire project folder.
- No external write action runs without visible user approval.
- Generated files open correctly and can be reviewed before download.
- The UI distinguishes available capabilities from planned integrations.
