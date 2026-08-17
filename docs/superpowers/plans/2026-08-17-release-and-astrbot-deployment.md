# DSH Knowledge QA Release and AstrBot Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one installable DSH knowledge-QA Bundle release and document the supported AstrBot-to-DSH deployment.

**Architecture:** Keep DSH as a separately installed Node.js service and keep AstrBot as the messaging host. Package the existing Workspace plugin, tool policy, and Web UI as one npm tarball: the package root supplies the Host plugin and Web Client declaration, while `./tool-policy` supplies the Agent-scoped policy. Verify that tarball against the registry release of DSH in a clean temporary installation rather than against the local DSH checkout.

**Tech Stack:** Node.js 24, pnpm 11, npm package tarballs, DeepSeek Harness Web RPC, GitHub Releases, AstrBot Python plugins.

---

### Task 1: Freeze the release package contract

**Files:**
- Modify: `packages/bundle/package.json`
- Modify: `packages/tool-policy/package.json`
- Modify: `packages/ui/package.json`
- Test: `packages/bundle/tests/nova-preset.spec.ts`

- [ ] **Step 1: Add a failing package-contract test**

Assert that the Bundle exports `./tool-policy` and `./client`, declares the Web Client metadata, keeps the internal source packages private, aligns all three workspace versions at `0.1.0`, and points repository metadata to the release repository.

- [ ] **Step 2: Run the Bundle test and observe the missing release metadata failure**

Run: `pnpm --filter dsh-knowledge-qa-bundle test`

Expected: the new release-contract assertion fails.

- [ ] **Step 3: Add release metadata and package-owned runtime entries**

Add these Bundle exports:

```json
"./tool-policy": {
  "types": "./dist/tool-policy.d.ts",
  "default": "./dist/tool-policy.js"
},
"./client": "./dist/client.js"
```

Add `repository`, `homepage`, and `bugs` metadata to all three workspace packages, keep their versions aligned at `0.1.0`, and mark the policy/UI source packages private.

- [ ] **Step 4: Minimize each package file list**

Include only the root Host entry, `tool-policy` subpath, Web Client bundle, public declarations, the Bundle patch, presets, and package README. Exclude `node_modules`, source maps, tests, caches, and development configuration from the release tarball.

- [ ] **Step 5: Re-run the Bundle test**

Run: `pnpm --filter dsh-knowledge-qa-bundle test`

Expected: PASS.

### Task 2: Add a reproducible release verifier

**Files:**
- Create: `scripts/verify-release.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add the release command**

Add a root `release:verify` script that builds all workspaces, packs the Bundle into `.release/`, verifies its contents and size, installs registry DSH `0.1.0-rc.7` in a new temporary directory, and installs the tarball through the real `dsh plugin --profile web add` command.

- [ ] **Step 2: Verify the installed profile**

Run the installed DSH executable with `--dump-config` and assert the effective tree contains `qa-workspace`, `qa-agent-presets`, `nova-qa`, read-only permission, and disabled `ui-deliverables`.

- [ ] **Step 3: Start the registry-installed DSH build**

Launch it on an unused loopback port with an isolated `DSH_HOME` and a temporary document root, wait for HTTP 200, call the real Web RPC endpoints, and always terminate the child process and remove the temporary installation.

- [ ] **Step 4: Enforce the minimal artifact**

Reject release archives containing `src/`, tests, source maps, any `node_modules`, or a packed size above 16 MB.

### Task 3: Document installation and AstrBot deployment

**Files:**
- Modify: `README.md`
- Modify: `packages/bundle/README.md`
- Create: `docs/astrbot-deployment.md`

- [ ] **Step 1: Replace development-only installation instructions**

Document the tagged GitHub Release tarball command and retain checkout linking only under a development section.

- [ ] **Step 2: Explain the AstrBot dependency boundary**

State that AstrBot `requirements.txt` installs Python dependencies only; it must not be used to install DSH or the QA Bundle. Require Node.js, pnpm, and DSH to be installed by the server image or provisioning layer.

- [ ] **Step 3: Document the production topology**

Show AstrBot calling DSH over loopback, stable QQ group-to-session mapping, `session.create` / `session.prompt` / `session.history`, optional `/api/events.mux`, and the rule that the native management API must not be exposed publicly.

- [ ] **Step 4: Document startup state**

List `DSH_HOME`, `DSH_QA_WORKSPACE`, the NOVA profile patch, process supervision, credentials placement, health checking, upgrade, and rollback commands.

### Task 4: Run release gates and registry integration smoke

**Files:**
- Verify only; no source file required.

- [ ] **Step 1: Run workspace checks**

Run: `pnpm test`, `pnpm typecheck`, and `pnpm build`.

Expected: all commands exit 0.

- [ ] **Step 2: Run the clean release verifier**

Run: `pnpm release:verify`.

Expected: the tarball is installed into registry DSH `0.1.0-rc.7`; the real profile boots and the RPC smoke completes without resolving the local DSH checkout.

- [ ] **Step 3: Inspect the final archive**

Run: `npm pack --dry-run --json packages/bundle` and inspect the release verifier's archive manifest.

Expected: one installable Bundle archive below 16 MB with only the root Host entry, tool-policy subpath, Client bundle, Presets, and metadata.

### Task 5: Publish v0.1.0 to GitHub

**Files:**
- Modify: Git history and GitHub repository state.

- [ ] **Step 1: Create the initial release commit**

Stage the reviewed plugin files and commit them as `feat: release NOVA knowledge QA bundle`.

- [ ] **Step 2: Create the GitHub repository and push the branch**

Create the public repository `whyself/dsh-knowledge-qa-plugin` when it does not already exist, add it as `origin`, and push the current branch without rewriting any remote history.

- [ ] **Step 3: Create and push the annotated tag**

Create `v0.1.0` only after every release gate passes, then push the tag.

- [ ] **Step 4: Create the GitHub Release**

Publish release `v0.1.0` with the verified Bundle tarball attached. Use the generated release URL in the final installation command.
