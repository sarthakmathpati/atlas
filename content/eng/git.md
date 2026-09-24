---
topic: eng.git
name: "Git"
subject: eng
order: 1
prereqs: []
---

## eng.git.git-basics
name: "Git basics"
importance: must
scope: "commits, staging, branches, the commit graph"

## eng.git.merging-vs-rebasing
name: "Merging vs rebasing"
importance: must
prereqs: [eng.git.git-basics]
scope: "when to use each, resolving conflicts"

## eng.git.undoing-things
name: "Undoing things"
importance: important
prereqs: [eng.git.git-basics]
scope: "reset, revert, restore, stash"

## eng.git.collaboration-workflow
name: "Collaboration workflow"
importance: important
prereqs: [eng.git.merging-vs-rebasing]
scope: "pull requests, code review, cherry-pick"

## eng.git.git-internals
name: "Git internals"
importance: advanced
prereqs: [eng.git.git-basics]
scope: "objects, content-addressed hashing, the DAG"
