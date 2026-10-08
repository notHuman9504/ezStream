## Pick the subagent model by task

The main agent runs on Opus. When spawning subagents (the Agent tool), always
set `model` explicitly; don't let it inherit Opus by default. Choose by what
the subtask needs most, using these ratings (out of 10):

| Model  | Logic / decisions | Taste | Speed |
|--------|-------------------|-------|-------|
| opus   | 9                 | 9     | 5     |
| sonnet | 7                 | 7.5   | 7     |
| haiku  | 4                 | 4     | 9.5   |

**haiku**: mechanical, well-specified work where speed matters and little
judgment is needed.

- Searching code or files, finding usages, mapping where things live.
- Reading files or docs and summarizing or extracting facts.
- Running commands or tests and reporting the output.
- Simple, fully specified edits (renames, formatting, boilerplate).

**sonnet**: the default for most delegated work.

- Implementing a clearly scoped change or feature.
- Writing tests, routine refactors, docs.
- Research that needs some judgment to filter and compare sources.
- Reviewing straightforward diffs.

**opus**: only when the subtask needs top logic or taste.

- Architecture and design decisions, tradeoff analysis.
- Debugging subtle or cross-cutting issues, security review.
- UI / visual design and user-facing writing.
- Final review of work produced by other subagents.

**How to apply:**

- Split mixed tasks: haiku gathers, sonnet builds, opus (or the main agent)
  decides and reviews.
- Run independent subagents in parallel for quicker work.
- If unsure between two models, pick the stronger one; redoing work costs
  more than the price gap.
- The main agent owns final decisions. Check subagent output before acting on
  it, especially haiku's.
