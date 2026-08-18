---
name: save-tokens
description: Minimizes Cursor token and Auto usage by restricting tool calls, file reads, subagents, MCP, and verbose replies. Use in every conversation, every new chat, and every new agent, and when the user mentions tokens, usage, plan limits, kam token, or saving quota.
disable-model-invocation: true
---

# Save tokens

Context is billed. Do less. If this rule is already in context, do not re-read this file.

## Do not spend tokens

- No tools when the answer is already in context or is a simple explanation.
- No Task/subagents, Explore, or parallel "study the whole repo" sweeps for a local edit.
- No TodoWrite unless the task has 5+ distinct steps.
- No browser, screenshots, Figma, or MCP unless the user asked or the task cannot be done without them.
- Do not load other skills unless the request clearly matches. Never load `ui-ux-pro-max` for small UI tweaks on existing screens.
- Never read `package-lock.json`, `routeTree.gen.ts`, `node_modules`, binaries, images, `.jsonl` transcripts, or whole directories.
- Do not re-read a file already in this turn's context.
- Do not git status/diff/log unless committing, pushing, or the user asked about git.

## Cheap tools first

1. Grep or Glob to find the path.
2. Read only the needed lines (`offset` / `limit`). Default max ~120 lines.
3. Batch independent tool calls in one turn.
4. Stop searching after the first sufficient hit.

## Cheap work

- Edit only files required to finish the request. No extra docs, comments, or refactors.
- One fix path. If blocked, say so — do not try three alternative architectures.
- After the request is done, stop. No "also consider" implementations.

## Cheap replies

- Lead with the result. Short complete sentences. No preamble, no recap of the prompt.
- Cite code only when the user must see the exact lines.
- Do not paste large logs, diffs, or file dumps.
