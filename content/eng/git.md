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

### simple
Git keeps a history of your project as a series of snapshots called commits, each one pointing back to the one before it. Before a snapshot is taken, you choose what goes into it by staging changes, like laying items on a table before taking a photo. A branch is just a movable bookmark on one of those snapshots, so you can try something new without disturbing the main line of work.

### interview
- **Three places**: the working tree (your files), the staging area or index (what the next commit will contain) and the repository (the commits). `git add` copies changes into the index; `git commit` turns the index into a commit.
- **A commit is a snapshot** of the whole tree plus metadata (author, date, message) and a pointer to its parent(s); its id is a hash of all of that.
- **Branches are labels**: a branch is a file holding one commit id, and `HEAD` says which branch you are on. Committing moves the current branch forward.
- **The commit graph** is a directed acyclic graph: most commits have one parent, merge commits two, the first commit none.
- **Everyday commands**: `status`, `add`, `commit`, `diff` (unstaged) and `diff --staged`, `log --oneline --graph`, `switch -c` to create a branch.
- **Good habits**: small commits that do one thing, messages that say why, a `.gitignore` for build output and secrets.

### deep
#### Intuition

Git asks two questions at every commit: what exactly goes into the snapshot (the staging area answers that), and which snapshot came before (the parent pointer). Everything else, branches included, is a name for some commit in the resulting graph.

#### A first repository

A real session in a scratch directory. The names and dates were fixed with `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` (one hour apart from 1 September 2026, 09:00), so the same commands with the same names, dates and file contents produce the same hashes; with your own name or clock, yours will differ. The path `/work/shop` is this machine's.

```text
$ git init shop
Initialized empty Git repository in /work/shop/.git/
$ echo '# Shop' > README.md
$ git status
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	README.md

nothing added to commit but untracked files present (use "git add" to track)
$ git add README.md
$ git status --short
A  README.md
$ git commit -m "Add README"
[main (root-commit) aaacbf9] Add README
 1 file changed, 1 insertion(+)
 create mode 100644 README.md
$ echo 'int main() {}' > main.cpp
$ echo 'A tiny order tracker.' >> README.md
$ git status --short
 M README.md
?? main.cpp
$ git add main.cpp README.md
$ echo 'Build: g++ -std=c++20 main.cpp' >> README.md
$ git status --short
MM README.md
A  main.cpp
$ git diff
diff --git a/README.md b/README.md
index 6a69648..040515a 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,3 @@
 # Shop
 A tiny order tracker.
+Build: g++ -std=c++20 main.cpp
```

`git status --short` has two columns: the left is the index, the right is the working tree. `A` is a new file in the index, ` M` a change not yet staged, `??` an untracked file. The edit after `git add` made `MM`: one version of README.md is staged and a newer one is not, and `git diff` shows only the unstaged line. A commit takes what is in the index, not what is on disk, so the build line waited for the next commit.

```text
$ git commit -m "Add main program"
[main 7075208] Add main program
 2 files changed, 2 insertions(+)
 create mode 100644 main.cpp
$ git add README.md
$ git commit -m "Explain how to build"
[main 117a812] Explain how to build
 1 file changed, 1 insertion(+)
$ git log --oneline
117a812 Explain how to build
7075208 Add main program
aaacbf9 Add README
$ git switch -c cart
Switched to a new branch 'cart'
$ echo '// cart: empty' >> main.cpp
$ git commit -am "Show the cart"
[cart 5d58e45] Show the cart
 1 file changed, 1 insertion(+)
$ git switch main
Switched to branch 'main'
$ echo shop > .gitignore
$ git add .gitignore
$ git commit -m "Ignore the binary"
[main 84ded52] Ignore the binary
 1 file changed, 1 insertion(+)
 create mode 100644 .gitignore
$ git log --oneline --graph --all
* 84ded52 Ignore the binary
| * 5d58e45 Show the cart
|/  
* 117a812 Explain how to build
* 7075208 Add main program
* aaacbf9 Add README
```

#### Reading the graph

`switch -c cart` made a new label on `117a812`, and the commit on `cart` moved only that label. Back on `main`, another commit moved `main`. The graph now forks at `117a812`:

```text
aaacbf9 <- 7075208 <- 117a812 <- 84ded52   (main, HEAD)
                          ^
                          +---- 5d58e45    (cart)
```

Arrows point from child to parent, which is how Git stores them: a commit knows its parents, never its children. That is why history is cheap to add to and why rewriting an old commit changes every hash after it.

#### Common mistakes

- **`git add .` without a `.gitignore`** commits build output, editor files and sometimes secrets. Add the `.gitignore` first.
- **Huge commits** mix unrelated changes and are hard to review or revert. Stage part of a file with `git add -p`.
- **Editing after `git add`** and expecting the commit to include it: stage again.
- **Messages like "fix"**: say what changed and why in the first line, within about 50 characters.

Connects to: [merging vs rebasing](#/concept/eng.git.merging-vs-rebasing), [undoing things](#/concept/eng.git.undoing-things), [Git internals](#/concept/eng.git.git-internals), [graph representations](#/concept/dsa.graph-basics.graph-representations).

### questions
Q: What is the staging area in Git?
A: The index: a snapshot of what the next commit will contain. git add copies the current version of a file into it, and git commit records exactly the index, so edits made after staging are not included until you stage them again.

Q: What is a branch in Git?
A: A movable label that holds one commit id. Committing on a branch moves that label to the new commit; creating a branch is just writing a new label, which is why branches are cheap.

Q: What does a commit contain?
A: A snapshot of the whole tree (through a tree object), the parent commit ids, the author and committer with dates, and the message. Its id is a hash of all of that, so changing anything, even a parent, gives a new id.

Q: What is the difference between git diff and git diff --staged?
A: git diff compares the working tree with the index, showing changes not yet staged. git diff --staged compares the index with the last commit, showing what the next commit will contain.

Q: Why is Git history a directed acyclic graph?
A: Each commit points to its parents, which already existed when it was made, so edges always point back in time and can't form a cycle. Ordinary commits have one parent, merges two or more, and the first commit none.

## eng.git.merging-vs-rebasing
name: "Merging vs rebasing"
importance: must
prereqs: [eng.git.git-basics]
scope: "when to use each, resolving conflicts"

### simple
When two branches have moved on separately, you can bring them together in two ways. Merging ties the two lines of history together with a new commit that has both as parents, like a road junction. Rebasing replays your commits on top of the other branch, as if you had started your work later, which gives a straight line but rewrites your commits.

### interview
- **Fast-forward**: if the target branch has no commits of its own since the fork, merging just moves its label forward; no new commit.
- **Three-way merge**: otherwise Git compares both tips with their common ancestor (the merge base) and makes a merge commit with two parents.
- **Rebase** copies each of your commits onto the new base, giving them **new hashes**; the old ones are left behind (reachable through the reflog for a while).
- **Golden rule**: don't rebase commits other people already have. Rebase your own local or unshared branch; merge shared ones.
- **Conflicts** happen when both sides changed the same lines. Git writes both versions between `<<<<<<<`, `=======` and `>>>>>>>` markers; you edit, `git add` the file, then `git commit` (merge) or `git rebase --continue` (rebase). `--abort` undoes the attempt.
- **Choosing**: merge keeps true history and is safe for shared branches; rebase gives a linear history that is easier to read and bisect. Many teams rebase feature branches and merge them with a pull request.

### deep
#### Intuition

A merge answers "combine these two histories" and records that it happened. A rebase answers "pretend I started from the latest version" and rewrites your commits to make it true. Both end with the same files when there are no conflicts; they differ in the shape of history and in whether existing commits change.

#### Merge: three-way and fast-forward

Continuing the shop repository from [Git basics](#/concept/eng.git.git-basics), where `main` and `cart` had forked (fixed names and dates again, so the hashes repeat; `-q` only hides the one-line commit summaries):

```text
$ git merge cart -m "Merge the cart"
Merge made by the 'ort' strategy.
 main.cpp | 1 +
 1 file changed, 1 insertion(+)
$ git log --oneline --graph -5
*   a5dd14e Merge the cart
|\  
| * 5d58e45 Show the cart
* | 84ded52 Ignore the binary
|/  
* 117a812 Explain how to build
* 7075208 Add main program
$ git switch -c docs
Switched to a new branch 'docs'
$ echo 'Run: ./shop' >> README.md
$ git commit -qam "Say how to run"
$ git switch main
Switched to branch 'main'
$ git merge docs
Updating a5dd14e..769f098
Fast-forward
 README.md | 1 +
 1 file changed, 1 insertion(+)
```

The first merge made commit `a5dd14e` with two parents. The second found `main` already contained everything before `docs`'s commit, so it just moved the label: "Fast-forward", no merge commit. `git merge --no-ff` forces a merge commit anyway, which some teams use to keep a record of each feature.

#### A conflict, resolved

Two branches now change the same line of README.md:

```text
$ git switch -c price HEAD~1
Switched to a new branch 'price'
$ sed -i 's/order tracker/price list/' README.md
$ git commit -qam "Call it a price list"
$ git switch main
Switched to branch 'main'
$ sed -i 's/order tracker/stock counter/' README.md
$ git commit -qam "Call it a stock counter"
$ git merge price
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
Automatic merge failed; fix conflicts and then commit the result.
$ git status --short
UU README.md
$ cat README.md
# Shop
<<<<<<< HEAD
A tiny stock counter.
=======
A tiny price list.
>>>>>>> price
Build: g++ -std=c++20 main.cpp
Run: ./shop
$ sed -i -e '/^<<<<<<<\|^=======\|^>>>>>>>/d' -e '/stock counter/d' README.md
$ git add README.md
$ git commit --no-edit
[main 37570b7] Merge branch 'price'
```

`UU` means "unmerged, both modified". Between the markers, the top half is `HEAD` (our branch, `main`) and the bottom is `price`. Resolving means leaving the file as it should be, with no markers: in an editor you would delete them and the line you don't want; here `sed` makes that edit. `git add` marks it resolved, and the commit finishes the merge. Always build and run the tests before that commit: a clean textual merge can still be wrong.

#### Rebase

A branch made from `docs` has one commit. Rebasing it onto `main` replays it on top:

```text
$ git switch -c receipt docs
Switched to a new branch 'receipt'
$ echo 'total: 0' > receipt.txt
$ git add receipt.txt
$ git commit -qm "Print a receipt"
$ git log --oneline -2
de98ba5 Print a receipt
769f098 Say how to run
$ git rebase main
Successfully rebased and updated refs/heads/receipt.
$ git log --oneline --graph -5
* b68400b Print a receipt
*   37570b7 Merge branch 'price'
|\  
| * d8a6ae7 Call it a price list
* | 14c0a79 Call it a stock counter
* | 769f098 Say how to run
|/  
$ git switch main
Switched to branch 'main'
$ git merge receipt
Updating 37570b7..b68400b
Fast-forward
 receipt.txt | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 receipt.txt
```

The commit "Print a receipt" was `de98ba5`; after the rebase it is `b68400b`, a new commit with the same change and a different parent. Anyone who had fetched `de98ba5` now has a commit that no branch points to, and if they had built on it, their next pull would duplicate the change. That is why you rebase only work that is still yours. After the rebase, merging into `main` is a fast-forward and history stays a straight line.

#### When to use which

| situation | use |
|---|---|
| updating your own feature branch with the latest `main` | rebase (or merge, if the branch is shared) |
| finishing a feature on a shared branch | merge (often through a pull request) |
| tidying your own commits before review | interactive rebase: `git rebase -i` |
| a branch others have pulled | merge; never rebase |

Connects to: [Git basics](#/concept/eng.git.git-basics), [collaboration workflow](#/concept/eng.git.collaboration-workflow), [undoing things](#/concept/eng.git.undoing-things).

### questions
Q: What is the difference between merging and rebasing?
A: Merging joins two histories with a merge commit that has both tips as parents, leaving existing commits unchanged. Rebasing copies your commits onto a new base, creating new commits with new hashes, which gives a linear history but rewrites what you had.

Q: When does Git do a fast-forward merge?
A: When the branch you merge into has no commits of its own since the other branch forked from it. Git then only moves the branch label forward; no merge commit is needed unless you ask for one with --no-ff.

Q: Why shouldn't you rebase a branch that others have pulled?
A: Rebasing replaces its commits with new ones. Others still have the old commits, so their next pull or push mixes old and new copies of the same changes, which causes duplicate commits and confusing conflicts.

Q: How do you resolve a merge conflict?
A: Open each conflicted file, decide what the result should be, and remove the conflict markers. Then git add the file to mark it resolved and commit (or git rebase --continue during a rebase). Build and test before committing, because a merge with no textual conflict can still break the code.

Q: What is the merge base?
A: The most recent common ancestor of the two branch tips. A three-way merge compares each tip with it to see what each side changed; a change made on only one side is taken, and a line changed differently on both sides is a conflict.

## eng.git.undoing-things
name: "Undoing things"
importance: important
prereqs: [eng.git.git-basics]
scope: "reset, revert, restore, stash"

### simple
Git has a different undo for each kind of mistake. You can throw away an edit you haven't staged, take a file back out of the staging area, move your branch back to an earlier commit, or add a new commit that cancels an old one. Choosing well is like choosing between an eraser, which rubs out your own draft, and a correction note, which leaves the original visible for everyone who already has a copy.

### interview
- **`git restore <file>`** discards unstaged edits; **`git restore --staged <file>`** unstages but keeps the edit.
- **`git reset <commit>`** moves the current branch: `--soft` keeps the changes staged, `--mixed` (the default) keeps them unstaged, `--hard` throws them away.
- **`git revert <commit>`** adds a new commit that undoes an old one; history is kept, so it is safe on shared branches.
- **`git stash`** shelves uncommitted work and cleans the tree; `git stash pop` brings it back.
- **`git reflog`** lists where `HEAD` has been, so commits "lost" to a reset or rebase can be recovered (entries expire after about 90 days by default, 30 for unreachable ones).
- Rule of thumb: rewrite (reset, amend) only commits nobody else has; revert commits that are already pushed and shared.

### deep
#### Intuition

Ask two questions. Is the mistake committed? If not, `restore` fixes the working tree or the index. If it is, has anyone else got the commit? If not, `reset` (or `commit --amend`) can move the branch back as if it never happened. If they have, `revert` records a new commit that cancels it, because rewriting shared history breaks other people's copies.

| mistake | command | what changes |
|---|---|---|
| bad edit, not staged | `git restore file` | working tree |
| staged by mistake | `git restore --staged file` | index |
| last commit, keep the work | `git reset --soft HEAD~1` | branch |
| last commit, throw it away | `git reset --hard HEAD~1` | branch, index, working tree |
| a pushed commit | `git revert <commit>` | a new commit |
| switch tasks mid-edit | `git stash`, later `git stash pop` | a stash entry |

#### A session

Continuing the shop repository from [merging vs rebasing](#/concept/eng.git.merging-vs-rebasing), with fixed names and dates:

```text
$ git log --oneline -2
b68400b Print a receipt
37570b7 Merge branch 'price'
$ echo 'oops' >> main.cpp
$ git status --short
 M main.cpp
$ git restore main.cpp
$ git status --short
$ echo 'debug notes' > notes.txt
$ git add notes.txt
$ git restore --staged notes.txt
$ git status --short
?? notes.txt
$ rm notes.txt
$ echo 'tax: 5%' >> receipt.txt
$ git commit -qam "Add tax"
$ git reset --soft HEAD~1
$ git status --short
M  receipt.txt
$ git reset
Unstaged changes after reset:
M	receipt.txt
$ git status --short
 M receipt.txt
$ git reset --hard
HEAD is now at b68400b Print a receipt
$ git status --short
$ echo 'tax: 5%' >> receipt.txt
$ git commit -qam "Add tax"
```

`--soft` moved `main` back but left the change staged (`M ` in the left column); a plain `reset` also unstaged it (` M`), and `--hard` discarded it. Now the dangerous case, and the way back:

```text
$ git reset --hard HEAD~1
HEAD is now at b68400b Print a receipt
$ git log --oneline -1
b68400b Print a receipt
$ git reflog -3
b68400b HEAD@{0}: reset: moving to HEAD~1
b6e06ec HEAD@{1}: commit: Add tax
b68400b HEAD@{2}: reset: moving to HEAD
$ git reset --hard HEAD@{1}
HEAD is now at b6e06ec Add tax
$ git log --oneline -1
b6e06ec Add tax
$ git revert --no-edit HEAD
[main 9b4ceaf] Revert "Add tax"
 Date: Tue Sep 1 23:00:00 2026 +0530
 1 file changed, 1 deletion(-)
$ git log --oneline -3
9b4ceaf Revert "Add tax"
b6e06ec Add tax
b68400b Print a receipt
$ cat receipt.txt
total: 0
$ echo 'total: 12' > receipt.txt
```

The reflog kept the commit `b6e06ec` after the hard reset, so `HEAD@{1}` brought it back. `revert` then added `9b4ceaf`, whose change is the exact opposite of "Add tax"; both stay in history, which is what you want once others have the commit. (Git 2.43 prints the author date in the summary of every revert.) Last, the stash:

```text
$ git stash
Saved working directory and index state WIP on main: 9b4ceaf Revert "Add tax"
$ git status --short
$ git stash list
stash@{0}: WIP on main: 9b4ceaf Revert "Add tax"
$ git stash pop
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   receipt.txt

no changes added to commit (use "git add" and/or "git commit -a")
Dropped refs/stash@{0} (d16e855c38b2756bdcd4994cc3190680fe10c0ed)
```

#### Pitfalls

- **`reset --hard` and `restore` destroy uncommitted work**, which no reflog can bring back. Commit or stash first when in doubt.
- **Resetting a pushed branch** means the next push is rejected; forcing it rewrites everyone else's history. Prefer `revert`, or use `git push --force-with-lease` on a branch only you use.
- **Reverting a merge** needs `-m 1` to say which parent is the mainline, and re-merging the same branch later needs the revert reverted first.
- **Stashes pile up**: `git stash list` shows them; name them with `git stash push -m "why"`.

Connects to: [Git basics](#/concept/eng.git.git-basics), [collaboration workflow](#/concept/eng.git.collaboration-workflow), [Git internals](#/concept/eng.git.git-internals).

### questions
Q: What is the difference between git reset and git revert?
A: Reset moves the branch pointer back, so later commits disappear from the branch; it rewrites history. Revert adds a new commit that undoes an earlier one and keeps history intact, so it is the safe choice for commits others already have.

Q: What do --soft, --mixed and --hard do in git reset?
A: All three move the current branch to the given commit. Soft keeps the undone changes staged, mixed (the default) keeps them in the working tree but unstaged, and hard throws them away from both the index and the working tree.

Q: How do you recover a commit after git reset --hard?
A: Look it up in git reflog, which records every position HEAD has had, then reset or branch to it, for example git reset --hard HEAD@{1}. This works only for committed work and only until the reflog entries expire.

Q: When would you use git stash?
A: When you must switch tasks, such as fixing an urgent bug on another branch, but your current changes are not ready to commit. Stash shelves them and cleans the working tree; stash pop brings them back later.

Q: How do you unstage a file without losing your edits?
A: git restore --staged file (or the older git reset file). It copies the committed version back into the index and leaves the working tree untouched.

## eng.git.collaboration-workflow
name: "Collaboration workflow"
importance: important
prereqs: [eng.git.merging-vs-rebasing]
scope: "pull requests, code review, cherry-pick"

### simple
When a team shares one repository, everyone works on their own branch and asks for it to be merged through a pull request, where teammates read the change and automated checks run before it lands. It is like submitting an article to an editor instead of printing it straight into the newspaper. Cherry-pick lets you copy one specific fix onto another branch without bringing everything else along.

### interview
- **Remotes**: `origin` is the shared copy; `fetch` downloads its commits into remote-tracking branches like `origin/main`, `pull` is fetch plus merge (or rebase), `push` uploads and is rejected if it isn't a fast-forward of the remote branch.
- **Feature-branch flow**: branch from `main`, commit, push the branch, open a pull request (PR), let CI run and reviewers comment, push fixes, then merge and delete the branch.
- **Merge options for a PR**: a merge commit (keeps every commit), squash (one commit per PR), or rebase and merge (linear, keeps commits).
- **Keeping up to date**: `git pull --rebase` replays your unpushed commits on top of what others pushed, avoiding needless merge commits.
- **Cherry-pick** copies one commit onto the current branch as a new commit; `-x` records where it came from. Typical use: backporting a fix to a release branch.
- **Protect `main`**: require reviews and green CI before merging, and never force-push to shared branches.

### deep
#### Intuition

Every clone is a full repository. Collaboration is agreeing on one shared copy (the remote) and on rules for changing it: nobody writes to `main` directly, every change arrives as a reviewed branch, and history on shared branches is only ever added to, never rewritten.

#### Two people, one remote

A bare repository (one without a working tree, like a server's copy) stands in for the hosting service. Asha pushes the shop repository from [undoing things](#/concept/eng.git.undoing-things); Ben clones it (his commits use his own name). Names and dates are fixed, so hashes repeat; the paths are this machine's.

```text
$ git init --bare -q /work/origin.git
$ git remote add origin /work/origin.git
$ git push -u origin main
To /work/origin.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
$ cd /work
$ git clone -q /work/origin.git ben
$ cd ben
$ git config user.name 'Ben Das'
$ git config user.email ben@example.com
$ git switch -c discount
Switched to a new branch 'discount'
$ echo 'discount: 10%' >> receipt.txt
$ git commit -qam "Add a discount line"
$ git push -u origin discount
To /work/origin.git
 * [new branch]      discount -> discount
branch 'discount' set up to track 'origin/discount'.
$ cd /work/shop
$ echo 'Tests: none yet' >> README.md
$ git commit -qam "Mention tests"
$ git push
To /work/origin.git
   9b4ceaf..f570ab0  main -> main
```

Pushing `discount` is the first half of a pull request: the branch is now on the server, and a hosting service such as GitHub or GitLab would offer to open a PR from it, run CI on it and show the diff for review. Meanwhile Ben also committed on `main` directly, which a protected `main` would forbid:

```text
$ cd /work/ben
$ git switch main
Switched to branch 'main'
Your branch is up to date with 'origin/main'.
$ echo 'paid: yes' >> receipt.txt
$ git commit -qam "Mark as paid"
$ git push
To /work/origin.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to '/work/origin.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
$ git pull --rebase
From /work/origin
   9b4ceaf..f570ab0  main       -> origin/main
Successfully rebased and updated refs/heads/main.
$ git log --oneline -3
064ff51 Mark as paid
f570ab0 Mention tests
9b4ceaf Revert "Add tax"
$ git push
To /work/origin.git
   f570ab0..064ff51  main -> main
```

The server refused a push that would have dropped Asha's "Mention tests". `pull --rebase` fetched it and replayed Ben's commit on top as `064ff51`; the next push was a fast-forward.

#### Backporting with cherry-pick

Version 1.0 was released from `b68400b`. A later fix on `main` should reach it without the features in between:

```text
$ cd /work/shop
$ git pull -q
$ sed -i 's/main.cpp/-O2 main.cpp/' README.md
$ git commit -qam "Build with optimizations"
$ git switch -c release-1.0 b68400b
Switched to a new branch 'release-1.0'
$ git cherry-pick -x main
Auto-merging README.md
[release-1.0 4417170] Build with optimizations
 Date: Wed Sep 2 04:00:00 2026 +0530
 1 file changed, 1 insertion(+), 1 deletion(-)
$ git log --format='%h %s%n%b' -1
4417170 Build with optimizations
(cherry picked from commit 790b6d9bbeed692eeb74382131d6e00be816e33e)

$ git log --oneline --graph --all -6
* 4417170 Build with optimizations
| * 790b6d9 Build with optimizations
| * 064ff51 Mark as paid
| * f570ab0 Mention tests
| | * 81fc432 Add a discount line
| |/  
| * 9b4ceaf Revert "Add tax"
```

The fix now exists twice, as `790b6d9` on `main` and `4417170` on `release-1.0`: same change, different parent, so a different hash. The `-x` line tells a reader where it came from. Cherry-picking a chain of dependent commits one by one is fragile; if you need many, merge or rebase instead.

#### A pull request that reviews well

- Small: a few hundred changed lines at most, one purpose.
- A description: what and why, how it was tested, screenshots for UI changes, and anything the reviewer should look at first.
- Green checks before asking for review; answer every comment, even with "done".
- Update it by pushing new commits to the same branch; rebase it on `main` only if the team agrees, since that rewrites what reviewers already saw.

Connects to: [merging vs rebasing](#/concept/eng.git.merging-vs-rebasing), [code review etiquette](#/concept/eng.practice.code-review-etiquette), [CI/CD](#/concept/eng.devops.ci-cd).

### questions
Q: What is the difference between git fetch and git pull?
A: fetch downloads new commits from the remote and updates remote-tracking branches such as origin/main without touching your work. pull does a fetch and then merges (or rebases, with --rebase) the remote branch into your current branch.

Q: Why was a git push rejected, and how do you fix it?
A: The remote branch has commits you don't have, so your push isn't a fast-forward and would drop them. Fetch and integrate them first, with git pull --rebase or a merge, then push again. Don't force-push over other people's work.

Q: What happens in a typical pull request workflow?
A: You branch from main, commit, push the branch and open a pull request. CI runs, reviewers comment, you push fixes to the same branch, and once it is approved and green it is merged (as a merge, a squash or a rebase) and the branch is deleted.

Q: When would you use git cherry-pick?
A: To copy one specific commit to another branch, most often to backport a bug fix to a release branch without bringing along unreleased features. The copy is a new commit with a new hash; -x records the original.

Q: What is the difference between squash merging and a merge commit for a pull request?
A: A squash merge turns the whole PR into one commit on main, which keeps history short but loses the individual commits. A merge commit keeps all of them and adds a commit joining the branch, which preserves detail at the cost of a busier history.

## eng.git.git-internals
name: "Git internals"
importance: advanced
prereqs: [eng.git.git-basics]
scope: "objects, content-addressed hashing, the DAG"

### simple
Inside the `.git` folder, Git is a small database where every piece of content is stored under a name made from its own fingerprint, a hash. File contents, folder listings and commits are all such objects, and each one refers to others by their hashes. Change one byte anywhere and the fingerprints change all the way up, like a wax seal that shows any tampering.

### interview
- **Four object types**: a **blob** (a file's bytes), a **tree** (a directory: mode, name and id of each entry), a **commit** (a tree id, parent ids, author, committer, message) and an annotated **tag**.
- **Content addressing**: an object's id is the SHA-1 of `"<type> <size>\0"` followed by its content, so equal content is stored once and ids can be checked on read.
- **A Merkle structure**: a commit id covers its tree, which covers every blob, and its parents, which cover all earlier history. Tampering anywhere changes the tip's id.
- **Branches and tags are refs**: small files (or lines in `packed-refs`) holding an id; `HEAD` usually names a branch.
- **Storage**: loose objects are zlib-compressed files in `.git/objects/xx/…`; `git gc` packs them into packfiles with delta compression.
- **Hash choice**: Git uses SHA-1 with collision detection; repositories can also be created with SHA-256 (`git init --object-format=sha256`), though support across hosting tools is still limited.

### deep
#### Intuition

Git is a key-value store where the key is computed from the value. Build a snapshot bottom-up: hash each file into a blob, hash each directory's list of (mode, name, id) into a tree, and hash the top tree with its parents and metadata into a commit. The commits then form a graph whose edges are parent ids, and because a child's id depends on its parents' ids, the graph can never contain a cycle.

#### Looking inside

A fresh repository whose first commit uses the same file, names and date as the shop repository in [Git basics](#/concept/eng.git.git-basics):

```text
$ git init -q tiny
$ cd tiny
$ echo '# Shop' > README.md
$ git hash-object README.md
a00621bb3a9b990ee018f8d04c2d3140800d6ca6
$ git add README.md
$ git commit -q -m "Add README"
$ git rev-parse HEAD
aaacbf9db81210d65adb41cce0abf394e650513a
$ git cat-file -t HEAD
commit
$ git cat-file -p HEAD
tree ce14015646f00b4e1ecee1454e50d510e5c62043
author Asha Rao <asha@example.com> 1788233400 +0530
committer Asha Rao <asha@example.com> 1788233400 +0530

Add README
$ git cat-file -p 'HEAD^{tree}'
100644 blob a00621bb3a9b990ee018f8d04c2d3140800d6ca6	README.md
$ find .git/objects -type f | sort
.git/objects/a0/0621bb3a9b990ee018f8d04c2d3140800d6ca6
.git/objects/aa/acbf9db81210d65adb41cce0abf394e650513a
.git/objects/ce/14015646f00b4e1ecee1454e50d510e5c62043
$ echo 'int main() {}' > main.cpp
$ git add main.cpp
$ git commit -q -m "Add main program"
$ git cat-file -p HEAD
tree 1302a05adf0d347be5753b324f49ced78d1c9822
parent aaacbf9db81210d65adb41cce0abf394e650513a
author Asha Rao <asha@example.com> 1788237000 +0530
committer Asha Rao <asha@example.com> 1788237000 +0530

Add main program
$ git cat-file -p 'HEAD^{tree}'
100644 blob a00621bb3a9b990ee018f8d04c2d3140800d6ca6	README.md
100644 blob 237c8ce181774d991a9dbdd8cacf1a5fb9f199f1	main.cpp
```

It got the same commit id, `aaacbf9…`, as the shop repository's first commit, in a different directory and at a different moment: the id depends only on content, names and the recorded dates. Three objects exist after one commit (blob, tree, commit). The second commit's tree lists the README blob `a00621b…` again: unchanged files are shared between snapshots, never copied.

#### Recomputing the ids

The program implements SHA-1 and builds the same bytes Git hashes. It checks itself on the standard's test vector for "abc" first.

```cpp
// SHA-1 as specified in FIPS 180-4: pad the message to a multiple of 64 bytes, then mix each
// block into five 32-bit words over 80 rounds.
string sha1(const string& msg) {
    uint32_t h[5] = {0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0};
    string m = msg + char(0x80);
    while (m.size() % 64 != 56) m += char(0);
    uint64_t bits = uint64_t(msg.size()) * 8;
    for (int i = 7; i >= 0; --i) m += char(bits >> (8 * i));  // big-endian length
    for (size_t off = 0; off < m.size(); off += 64) {
        uint32_t w[80];
        for (int i = 0; i < 16; ++i) {
            w[i] = 0;
            for (int j = 0; j < 4; ++j) w[i] = w[i] << 8 | uint8_t(m[off + 4 * i + j]);
        }
        for (int i = 16; i < 80; ++i) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
        uint32_t a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
        for (int i = 0; i < 80; ++i) {
            uint32_t f = i < 20 ? (b & c) | (~b & d)
                       : i < 40 || i >= 60 ? b ^ c ^ d
                       : (b & c) | (b & d) | (c & d);
            uint32_t k = i < 20 ? 0x5A827999 : i < 40 ? 0x6ED9EBA1
                       : i < 60 ? 0x8F1BBCDC : 0xCA62C1D6;
            uint32_t t = rotl(a, 5) + f + e + k + w[i];
            e = d, d = c, c = rotl(b, 30), b = a, a = t;
        }
        h[0] += a, h[1] += b, h[2] += c, h[3] += d, h[4] += e;
    }
    string hex;
    for (uint32_t x : h) hex += format("{:08x}", x);
    return hex;
}

// A Git object is "<type> <size>\0<body>", and its id is the SHA-1 of exactly those bytes.
string object(const string& type, const string& body) {
    return type + " " + to_string(body.size()) + '\0' + body;
}
string raw(const string& hex) {  // 40 hex digits -> the 20 bytes a tree entry stores
    string bytes;
    for (size_t i = 0; i < hex.size(); i += 2) bytes += char(stoi(hex.substr(i, 2), nullptr, 16));
    return bytes;
}

int main() {
    printf("sha1(\"abc\") = %s\n", sha1("abc").c_str());  // the standard's test vector
    string readme = sha1(object("blob", "# Shop\n"));
    string tree = sha1(object("tree", "100644 README.md" + string(1, '\0') + raw(readme)));
    string who = "Asha Rao <asha@example.com> 1788233400 +0530";
    string commit = sha1(object("commit", "tree " + tree + "\nauthor " + who + "\ncommitter " +
                                              who + "\n\nAdd README\n"));
    printf("blob   %s\ntree   %s\ncommit %s\n", readme.c_str(), tree.c_str(), commit.c_str());
    string mainCpp = sha1(object("blob", "int main() {}\n"));
    string tree2 = sha1(object("tree", "100644 README.md" + string(1, '\0') + raw(readme) +
                                           "100644 main.cpp" + string(1, '\0') + raw(mainCpp)));
    printf("blob   %s (main.cpp)\ntree   %s (both files)\n", mainCpp.c_str(), tree2.c_str());
}
```

Output:

```text
sha1("abc") = a9993e364706816aba3e25717850c26c9cd0d89d
blob   a00621bb3a9b990ee018f8d04c2d3140800d6ca6
tree   ce14015646f00b4e1ecee1454e50d510e5c62043
commit aaacbf9db81210d65adb41cce0abf394e650513a
blob   237c8ce181774d991a9dbdd8cacf1a5fb9f199f1 (main.cpp)
tree   1302a05adf0d347be5753b324f49ced78d1c9822 (both files)
```

Every id matches the ones Git printed. Two details matter: a tree entry stores the raw 20-byte id, not 40 hex characters, and the entries are sorted by name (uppercase "README.md" before "main.cpp" in byte order). The commit's timestamp is seconds since 1970 in UTC (1788233400 is 09:00 at +05:30 on 1 September 2026) plus the offset.

#### Consequences

- **Integrity**: a corrupted object no longer matches its name; `git fsck` finds it.
- **Cheap branches and dedup**: identical files and directories anywhere in history are one object.
- **Rewriting history changes ids**: amending a message or rebasing gives new commits, and every descendant changes too, which is why rewritten branches conflict with other people's copies.
- **Signatures cover everything**: signing a commit id vouches for the whole tree and history below it.

Connects to: [Merkle trees](#/concept/sysd.building-blocks.merkle-trees), [hashing and digital signatures](#/concept/cn.security.hashing-and-digital-signatures), [graph representations](#/concept/dsa.graph-basics.graph-representations), [merging vs rebasing](#/concept/eng.git.merging-vs-rebasing).

### questions
Q: What are Git's object types?
A: Blobs hold file contents, trees hold a directory listing (mode, name and object id for each entry), commits hold a tree id, parent ids, author, committer and message, and annotated tags point at another object with a message. Branches are not objects; they are refs.

Q: How does Git compute an object's id?
A: It hashes a header of the type, a space, the size in bytes and a NUL byte, followed by the content, with SHA-1 (or SHA-256 in repositories created that way). The same content always gets the same id, which is what content-addressed means.

Q: Why does changing an old commit change every later commit's id?
A: A commit's content includes its parents' ids, so a new id for a parent changes the child's bytes and therefore its id, and so on up to the branch tip. That makes history tamper-evident, like a Merkle tree.

Q: Why don't unchanged files take extra space in a new commit?
A: The new tree refers to the existing blob by its id, so the file is stored once however many commits contain it. Git also packs objects with delta compression, so even changed files usually cost little.

Q: Why can't the commit graph have a cycle?
A: A commit's id depends on its parents' ids, so a parent must exist before its child. A cycle would require a commit to contain its own id inside its content, which a hash function makes practically impossible.
