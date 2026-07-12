# Project Scorpion Workflow

This is the beginner-safe process for changing Project Scorpion. Use it for one completed feature or fix at a time.

## What the main words mean

- **Local project:** the files on this computer that are open in VS Code.
- **Git:** the system that records changes and creates restore points.
- **Commit:** a named restore point containing a related set of changes.
- **GitHub:** the online copy of the Git repository.
- **Push:** send local commits to GitHub.
- **Vercel:** the service that deploys the GitHub version as a website.
- **Production:** the public version of the website people can visit.

Changing a local file does not immediately change GitHub or the public website.

```text
Edit locally → Review → Test → Commit → Push → Vercel deploys
```

## Before starting a step

- [ ] Save every open file in VS Code.
- [ ] Confirm the previous step is finished.
- [ ] State one clear outcome for the new step.
- [ ] Check that the Git working copy does not contain unexpected changes.
- [ ] Avoid editing the same file while Codex is actively changing it.

If Git already contains changes, identify who made them and why before continuing. Existing work should never be discarded just to make the status look clean.

## While making changes

- [ ] Keep the work limited to the current step.
- [ ] Preserve unrelated code and files.
- [ ] Explain any decision that changes the product direction.
- [ ] Do not add passwords, tokens, private keys, or other secrets.
- [ ] Do not commit, push, deploy, or delete important work without explicit approval.

## Review checklist

Before testing, review the change:

- [ ] List every changed file.
- [ ] Explain what changed in plain English.
- [ ] Confirm that no unrelated files changed.
- [ ] Check for formatting and whitespace errors.
- [ ] Run basic JavaScript syntax checks.
- [ ] Confirm that no secrets or temporary files were added.

Useful read-only commands:

```powershell
git status --short
git diff --check
git diff
```

These commands only show information. They do not change the project.

## Test checklist

The exact tests depend on the feature, but every change should cover the relevant items below:

- [ ] The dashboard loads without an error.
- [ ] Top Stories displays correctly.
- [ ] Every category card displays correctly.
- [ ] Story links open the expected articles.
- [ ] Loading and failure states remain understandable.
- [ ] The layout works on both a desktop-sized and phone-sized window.
- [ ] The browser console does not show a new error.
- [ ] Existing behavior outside the changed feature still works.

## Commit checklist

A commit is appropriate when one step is complete and tested.

- [ ] Review `git status --short` one final time.
- [ ] Stage only the files belonging to the completed step.
- [ ] Review the staged changes.
- [ ] Write a short commit message describing the outcome.
- [ ] Create the commit.
- [ ] Confirm that the commit succeeded.

Example commit messages:

```text
Organize project documentation
Repair live feed refresh
Add article publication timestamps
Improve headline deduplication
```

Avoid vague messages such as `update`, `changes`, or `stuff` because they do not explain what the restore point contains.

## Push and deployment checklist

Pushing can update the public website through Vercel, so it happens only after local review and testing.

- [ ] Confirm the correct commit is ready.
- [ ] Push the current branch to GitHub.
- [ ] Confirm GitHub received the commit.
- [ ] Wait for the Vercel deployment to finish.
- [ ] Open the deployed website.
- [ ] Perform a short production smoke test.

A smoke test is a quick check that the important parts still work after deployment.

## If something goes wrong

Do not panic and do not start clicking destructive Git options.

- [ ] Stop making additional changes.
- [ ] Save the visible error message or take a screenshot.
- [ ] Run `git status --short` to see what changed.
- [ ] Tell Codex what you expected and what happened instead.
- [ ] Review the differences before restoring or deleting anything.

Avoid commands such as `git reset --hard`, forced pushes, or bulk file deletion unless their consequences have been explained and the action is explicitly approved.

## How to ask Codex for a project change

A request can be simple:

```text
Start Phase 1, Step 1.
```

For an unplanned request, describe the outcome rather than trying to describe the code:

```text
I want each story to show the name of the website it came from.
```

Codex should then:

- [ ] Inspect the relevant existing code.
- [ ] Explain the intended change.
- [ ] Modify the project directly.
- [ ] Verify the result in proportion to its risk.
- [ ] List the changed files and explain the outcome.
- [ ] Wait for explicit approval before committing, pushing, or deploying.
