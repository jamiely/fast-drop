# Agents Notes

- Commit after each change.
- Commit often in small, logical checkpoints (prefer multiple small commits over one large commit).
- If work spans multiple tasks, commit at least after each completed sub-task before moving on.
- Before each commit, consider whether `README.md` or `docs/` should be updated.
- Use `RESEARCH.md` for project context.
- Use `PLAN.md` for implementation planning and execution order.
- Update `README.md` when applicable.
- When adding or changing tooling/workflow gates (e.g., Husky hooks, CI checks, coverage thresholds), document them in `README.md` and/or `docs/dev-setup.md` in the same change.
- Add a `docs/` folder with human/developer documentation (features, dev setup, etc.) when applicable.
- After adding each feature, take a couple of representative screenshots that show what was implemented.
- `README.md` should always include a few representative screenshots of menu and gameplay.
- Store feature screenshots (and related historical artifacts like old research/prompt files) in `docs/history/timestamp-x/`, where `x` describes the feature that was added.
- After adding features, deploy updates to GitHub (when remote access is available).
- For each major feature completed, add at least one focused end-to-end regression test to prevent regressions.
