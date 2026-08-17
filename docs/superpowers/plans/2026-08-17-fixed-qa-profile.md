# Fixed QA Profile Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the dedicated product profile that always uses one configured document Workspace, one QA Agent Preset, and a non-interactive read-only Web surface.

**Architecture:** The existing `nova-web` Profile composes the native base and Web bundles with `dsh-knowledge-qa-bundle`. The Bundle patch owns product assembly: it validates and registers the one Workspace, aligns the host filesystem and sandbox defaults, replaces the permission table with one read-only entry, fixes the default Preset, disables the native Workspace and Preset pickers, and mounts a thin QA UI in their slots. The QA Preset remains the sole owner of the `glob`, `grep`, and `read` root through `qa-tool-policy.config.root`; the Host Workspace does not derive or override that tool root.

**Tech Stack:** TypeScript, Cordis patch YAML, React slots, Vitest, pnpm.

---

### Task 1: Remove the abandoned generic permission lock

**Files:**

- Restore all modified files under `C:\Users\11588\Desktop\deepseek-harness\packages\interaction\permission-presets`, `packages\client`, `packages\core\session`, and generated catalogs to `HEAD`.
- Delete `C:\Users\11588\Desktop\deepseek-harness\.agents\notes\implemented\feature\2026-08-17-agent-preset-permission-lock*`.
- Delete the `permission-lock` ACP fixture, configs, and snapshots.

- [x] Remove `permission/lock`, `PermissionPresetService.lock()`, and `PermissionSelect.locked` without changing the existing permission preset behavior.
- [x] Remove only the `permission-lock` snapshot registration and files; preserve `dsh-everything-is-plugins.html`.
- [x] Run focused permission, client, and snapshot registration tests after restoration.

### Task 2: Restore the fixed Workspace assembly

**Files:**

- Modify `packages/bundle/cordis.patch.yml`.
- Modify `packages/bundle/src/index.ts`.
- Add `packages/bundle/tests/bundle.spec.ts`.
- Modify `packages/bundle/package.json`.

- [x] Configure `qa-workspace.root`, `fs-sandbox.cwd`, and `sandbox-policy.workspaceRoot` from `process.env.DSH_QA_WORKSPACE`.
- [x] Register the validated directory as the single durable Workspace titled `知识库` through `workspaceRegistry.create(root, title)`.
- [x] Replace the permission table with one `read-only` entry and make it the default.
- [x] Fix `agent-presets.config.default` to `nova-qa`, disable `ui-workspace` and `ui-agent-preset`, and mount `dsh-knowledge-qa-ui`.
- [x] Restore only the native `tool-fs` and `tool-fs-search` host rows required by the QA Preset.

### Task 3: Restore the fixed QA Web surface

**Files:**

- Add `packages/ui/package.json`, TypeScript/build configuration, client entry, components, locales, README, and tests.
- Restore the generic composer replacement seats in the Harness `ui-conversation` slot contract, InputBar, slot catalog, README, and tests.

- [x] Keep the native Sidebar shell, new-session action, Conversation, Composer, Settings, model selector, and tool rendering.
- [x] Replace only the Workspace browser with a flat Session list and fixed knowledge-base information.
- [x] Replace the command launcher with an occupied empty seat and the permission selector with static `Read Only` text.
- [x] Render a disabled `知识问答` selector on the blank state and a static label in an existing Session header.
- [x] Register Chinese and English strings for the QA-owned Session list.

### Task 4: Keep tool paths Preset-owned

**Files:**

- Modify `presets/nova-qa/agent.cordis.yml`.
- Modify `packages/bundle/presets/knowledge-qa/agent.cordis.yml`.
- Modify `packages/bundle/tests/nova-preset.spec.ts`.

- [x] Remove `dsh-agent-access-policy` from both Presets and remove the package from the workspace.
- [x] Keep `tool-fs`, `tool-fs-search`, and `dsh-knowledge-qa-tool-policy` inside each Preset.
- [x] Keep `qa-tool-policy.config.root: !!js process.env.DSH_QA_WORKSPACE` in each Preset as the only configuration that controls `glob`, `grep`, and `read` paths.
- [x] Assert that the Profile fixes `nova-qa`, the Bundle fixes the Workspace and UI, and Presets own the tool root.

### Task 5: Update product documentation and verify

**Files:**

- Modify the root README, Bundle README, tool-policy README, NOVA Profile README, and development plan.
- Replace the obsolete selectable-Preset plan with this fixed-profile plan.
- Regenerate `pnpm-lock.yaml`.

- [x] Document that Web users cannot add or switch Workspace, Agent Preset, permission mode, or slash commands in this Profile.
- [x] Document that API callers address stable Session IDs and use the same fixed Profile assembly; they do not configure paths per request.
- [x] Run plugin `typecheck`, focused tests, build, relevant Harness tests/typecheck/lint, and both repositories' diff checks.

## Self-review

- The fixed Workspace and fixed Agent mode are deployment composition, not new generic DSH state.
- `glob`, `grep`, and `read` still obtain their root only from Preset YAML.
- Native Web behavior remains unchanged for Profiles that do not load this Bundle.
- The plan introduces no compatibility layer and does not modify vendored code.
