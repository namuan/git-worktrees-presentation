# Git worktrees — command cheatsheet

A worktree is an extra working directory attached to one Git repository. It shares the object database, refs, and most Git data with the main checkout, but keeps its own working files, `HEAD`, and index. This lets you keep several branches checked out at once.

Run every command from inside any worktree of the repository (or its main checkout).

## Create

| Command | What it does |
|---|---|
| `git worktree add ../feat` | New worktree; **convenience**: creates a new branch named after the final path component (`feat`) from `HEAD` |
| `git worktree add -b feature/search ../shop-search main` | New branch `feature/search` created from `main`, checked out into a new directory |
| `git worktree add ../shop-hotfix hotfix/login` | Attach an **existing** branch `hotfix/login` (fails if it is already checked out in another worktree) |
| `git worktree add --track -b feature/x ../shop-x origin/main` | New branch tracking `origin/main` |
| `git worktree add --detach ../shop-bisect v2.4.1` | Detached `HEAD` worktree — inspect/build/test a specific commit or tag without a branch |
| `git worktree add --detach ../shop-bisect HEAD~3` | Detached worktree at an arbitrary revision |
| `git worktree add -f ../reused main` | `-f/--force`: create anyway when the path is not empty or the branch is checked out elsewhere (last resort) |

## Inspect

| Command | What it does |
|---|---|
| `git worktree list` | Paths of all worktrees with branch and `HEAD` commit |
| `git worktree list --porcelain` | Machine-readable output (useful in scripts) |
| `git worktree list | grep feature` | Find which directory a branch is checked out in |
| `git rev-parse --git-dir` | Administrative directory of the current worktree |
| `git rev-parse --git-common-dir` | Shared Git directory (`.git` of the main worktree) |
| `git status` / `git log` | Work exactly as normal inside a worktree |

## Maintain

| Command | What it does |
|---|---|
| `git worktree remove ../shop-hotfix` | Remove a clean worktree (directory + registration) |
| `git worktree remove -f ../shop-hotfix` | Force removal despite modified or untracked files |
| `git worktree prune` | Delete stale administrative records for directories removed outside Git |
| `git worktree prune -n` | Dry run — show what would be pruned |
| `git worktree prune --expire 2.weeks.ago` | Prune only records older than the expiry |
| `git worktree lock ../shop-bisect --reason "on external drive"` | Prevent automatic pruning of a worktree that is temporarily unavailable |
| `git worktree unlock ../shop-bisect` | Remove the lock |
| `git worktree move ../shop-search ../search-v2` | Move a worktree to a new path (and update its registration) |
| `git worktree repair` | Fix worktree metadata after the repository or worktrees were moved, or copied without a proper clone |

## Per-worktree configuration

Git normally reads one shared config for the whole repository, but you can opt into per-worktree config:

```sh
# Enable (one time, in the main worktree)
git config extensions.worktreeConfig true

# Then set config for just this worktree
git config --worktree user.name "Alice"
git config --worktree core.ignorecase false
```

This is useful for worktree-specific settings such as user identity, `core.sparseCheckout`, or ignore rules.

## Typical workflow

```sh
# Feature work lives in its own directory
git worktree add -b feature/search ../shop-search main
cd ../shop-search
# ...edit, commit, push...

# An urgent fix arrives — no stash, no checkout dance
git worktree add -b hotfix/login ../shop-hotfix main
cd ../shop-hotfix
# ...fix, commit, push, open a PR...

# Back to the feature — the hotfix directory still exists but does not block anything
cd ../shop-search

# After the hotfix branch is merged and no longer needed
git worktree remove ../shop-hotfix
```

## Aliases worth setting up

Aliases turn `git worktree ...` into short, memorable commands. Two kinds: **Git aliases** (configure once, work in every repo) and **shell functions** (for things Git aliases cannot do, like changing directory).

### Git aliases

```sh
# The big one: wt = worktree
git config --global alias.wt worktree

# Now these work:
git wt list
git wt add -b feature/search ../shop-search main
git wt remove ../shop-hotfix
```

More specific shortcuts, if you prefer:

```sh
git config --global alias.wtl 'worktree list'
git config --global alias.wtr 'worktree remove'
git config --global alias.wtp 'worktree prune'
```

### One-command new worktree (`!` aliases run a shell snippet)

```sh
# git wtn <branch> -> creates the branch AND ../<branch> worktree in one step
git config --global alias.wtn '!f() { git worktree add -b "$1" "../$1"; }; f'

git wtn feature/search   # == git worktree add -b feature/search ../feature/search
```

The `!` prefix means the rest runs in your shell, so you can script with `$1`, `$2`, and friends. Quote the arguments — branch names containing `/` are fine.

### Jump to a worktree from anywhere (shell function)

Git aliases cannot change the current directory, so this lives in `~/.zshrc` (or `~/.bashrc`):

```sh
# gwt <branch> — cd into the worktree that has <branch> checked out
gwt() {
   local dir
   dir=$(git worktree list | grep -F "[$1]" | awk '{print $1}' | head -n 1)
   [ -n "$dir" ] && cd "$dir" || echo "No worktree found for branch: $1"
 }
```

Usage:

```sh
gwt hotfix/login    # cd ../shop-hotfix
gwt feature/search  # cd ../shop-search
```

`git worktree list` prints the checked-out branch in brackets (`[feature/search]`); `grep -F` matches that literal text, so `gwt` finds the right directory even when you are in a completely different folder.

### Manage your aliases

```sh
git config --global --get-regexp '^alias\.wt'   # list your worktree aliases
git config --global --unset alias.wtn           # remove one
git config --global --edit                      # inspect or tweak everything
```

Aliases are personal configuration (`--global`); they are not shared with teammates unless you keep them in a dotfiles repo.

## Gotchas

- **One branch, one worktree.** `git worktree add ../x main` fails with `fatal: 'main' is already checked out at '...'` while `main` is open elsewhere. Create a new branch instead — do not bypass this with `-f`.
- **A worktree is not a clone.** It shares history with the main checkout. A `git gc` in one place affects the others; `git worktree remove` deletes only the extra checkout, never shared commits.
- **Removing the directory yourself leaves stale records.** If you delete a worktree folder outside Git, run `git worktree prune` (or rely on automatic pruning for locked/unavailable worktrees).
- **Dirty worktrees refuse removal.** `git worktree remove` protects modified and untracked files; you must clean up or use `-f` deliberately.
- **Not everything is isolated.** Ports, dependencies, databases, caches, and other external state are shared by default — two app instances from two worktrees can collide.
- **`git add` on a new file in the wrong worktree** stages it there; each worktree has its own index, so double-check `git worktree list` before committing to a specific directory.

## Sources

- [Git reference: git-worktree](https://git-scm.com/docs/git-worktree)
- [Git reference: gitworktrees](https://git-scm.com/docs/gitworktrees)
- [Pro Git: Git worktrees](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging#_git_worktrees)
