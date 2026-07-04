## Context

The workspace browser already provides directory navigation, file creation, rename/copy/move/delete, direct file viewing, and a full-screen text editor overlay. The editor overlay is currently a plain textarea with a Markdown preview toggle. It can save UTF-8 text through `/api/workspace/file`, but it has no syntax highlighting, no language-aware editing, no file size guard, no binary detection, and no stale-save protection.

The app is a React/Vite frontend served by an Express backend. Deployment requires restarting the `nexus` service and verifying the service remains reachable after restart.

## Goals / Non-Goals

**Goals:**
- Use a stable community editor package for workspace text editing.
- Provide syntax highlighting for SQL, Python, JavaScript, TypeScript, Markdown, JSON, HTML, CSS, shell/config text, and plain text.
- Preserve existing workspace browser navigation and direct file view/download behavior.
- Keep Markdown preview available while improving Markdown editing.
- Add backend safety boundaries for editable files: size limit, binary detection, metadata, and conflict detection.
- Cover the change with focused tests and pass existing frontend/backend checks.

**Non-Goals:**
- Full IDE features such as language servers, project-wide search, refactoring, diagnostics, or formatting.
- Multi-user real-time collaboration or merge conflict resolution.
- Editing non-UTF-8 encodings or large/binary files in the browser.
- Changing authentication, workspace URL synchronization, or the `/workspace?path=...` direct viewing endpoint.

## Decisions

### D1. Use CodeMirror 6 for the editor surface

Use CodeMirror 6 with `@uiw/react-codemirror` as the React integration. Add official language packages for the first supported language set.

Rationale:
- CodeMirror 6 is modular, well maintained, MIT licensed, and fits a lightweight React/Vite app.
- It supports editing and highlighting in one component, unlike highlight-only packages.
- It avoids Monaco's heavier worker and bundle complexity, which is unnecessary for this scope.

Alternatives considered:
- Monaco Editor: excellent for VS Code-like behavior, but heavier and more complex for this workspace overlay.
- Ace: mature but less attractive for a modern React/Vite integration.
- highlight.js/Prism/Shiki: useful for rendering highlighted code, but not sufficient for editing.

### D2. Put language detection in a small frontend helper

Map filenames/extensions to CodeMirror language extensions in a dedicated helper/module. Treat `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.sql`, `.py`, `.md`, `.markdown`, `.json`, `.html`, `.htm`, `.css`, `.sh`, `.bash`, `.zsh`, common config files, and extensionless files as editable text.

Rationale:
- Tests can cover language detection without rendering the full workspace browser.
- The workspace browser component stays focused on interaction state.
- Adding later languages is a localized change.

### D3. Keep Markdown preview as a separate preview mode

Markdown editing uses CodeMirror's Markdown language support. Preview mode continues to use the existing `marked + DOMPurify` rendering path.

Rationale:
- This preserves existing user behavior while improving the editing side.
- Sanitized preview remains separate from the editor's text model.

### D4. Make backend file editability explicit

The backend should define helper logic for editable workspace files:
- Normalize the path using the existing workspace resolution behavior.
- Reject directories and missing files.
- Reject files above a conservative editable size limit.
- Reject buffers that look binary before converting to UTF-8 text.
- Return file metadata with content: size and mtime.
- On save, optionally require the caller's last-known mtime and return a conflict status when the file changed since it was opened.

Rationale:
- CodeMirror makes it easier to open source files, so the API needs clearer safety guarantees.
- File metadata enables stale-save detection without introducing a new persistence layer.
- The existing direct view/download endpoint remains available for large or binary files.

### D5. Keep conflict handling simple

When saving with an older mtime, the backend returns HTTP 409 and the frontend keeps the editor open with an error. The user can close and reopen the file to load the latest content.

Rationale:
- This prevents silent overwrites.
- It avoids building a merge UI in this change.

## Risks / Trade-offs

- [Risk] CodeMirror increases frontend bundle size. -> Mitigation: use only needed language packages and keep Monaco out of scope.
- [Risk] The editor may behave differently on mobile than textarea. -> Mitigation: preserve the existing full-screen editor layout and font-size pinch controls where practical, then test mobile-width rendering.
- [Risk] Binary detection may reject unusual text files containing NUL bytes. -> Mitigation: prefer safe rejection; users can still download/direct-view files.
- [Risk] mtime precision can vary by filesystem. -> Mitigation: compare with a small tolerance or use exact `mtimeMs` consistently from Node stat metadata.
- [Risk] Existing uncommitted changes are present in the worktree. -> Mitigation: keep edits scoped to workspace editor/API files and avoid reverting unrelated files.

## Migration Plan

1. Add frontend editor dependencies and update the lockfile.
2. Implement the editor helper/component and integrate it into the workspace browser overlay.
3. Harden `/api/workspace/file` read/write behavior while preserving the existing route shape.
4. Add and run focused tests plus existing frontend build/tests relevant to the touched areas.
5. Restart the `nexus` service after deployment and verify the service is reachable.
6. If restart verification fails, roll back the deployed code to the previous version immediately and verify reachability again.

## Open Questions

- None for this scope.
