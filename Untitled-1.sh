#!/usr/bin/env bash
# url=https://github.com/LorenzoColitta/Brotherhood-KOS
# Rewrites commits replacing Copilot/bot author/committer entries with the specified user.
# WARNING: This rewrites history and will force-push. Read the comments above before running.
set -euo pipefail

# --- Configuration: edit these if you want different replacement values ---
NEW_NAME="Lorenzo Colitta"
NEW_EMAIL="dev.lorenzo@hotmail.com"

# Comma-separated lists of bad author names / emails to replace
BAD_NAMES=("Copilot" "copilot-swe-agent[bot]" "Copilot-SWE-Agent" "Copilot-SWE-Agent[bot]")
BAD_EMAILS=("198982749+Copilot@users.noreply.github.com" "198982749+copilot-swe-agent@users.noreply.github.com" "198982749+Copilot@users.noreply.github.com")

# --- End configuration ---

if [ "$#" -ne 0 ] && [ "$1" = "--dry-run" ]; then
  echo "Dry-run mode: listing matching commits (no rewrite)"
  git fetch origin
  echo "Authors in the repo:"
  git log --format='%an <%ae>' | sort -u
  echo
  echo "Commits authored/committed by suspected Copilot emails:"
  for e in "${BAD_EMAILS[@]}"; do
    echo "Matches for ${e}:"
    git log --all --pretty=format:'%h %an <%ae> %s' --grep="${e}" || true
    # also search by author/committer email with filter:
    git log --all --pretty=format:'%h %an <%ae> %s' --author="${e}" || true
    echo
  done
  exit 0
fi

read -p "This will rewrite all history and force-push to origin. Have you backed up your repo and confirmed branch-protection/CI implications? (type 'YES' to proceed) " confirm
if [ "$confirm" != "YES" ]; then
  echo "Aborting. Type YES (all caps) if you want to proceed."
  exit 1
fi

# Ensure git-filter-repo is installed
if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo not found. Installing (pip install --user git-filter-repo)..."
  if ! command -v pip >/dev/null 2>&1; then
    echo "pip not found. Please install Python pip or install git-filter-repo manually."
    exit 1
  fi
  pip install --user git-filter-repo
  export PATH="$HOME/.local/bin:$PATH"
fi

REPO_SSH=$(git remote get-url origin || true)
if [ -z "$REPO_SSH" ]; then
  echo "No origin remote found. Please run this from a clone of your repository with origin set."
  exit 1
fi

# Create a temporary mirror clone
WORKDIR=$(mktemp -d)
echo "Cloning mirror into $WORKDIR/repo.git ..."
git clone --mirror "$REPO_SSH" "$WORKDIR/repo.git"
cd "$WORKDIR/repo.git"

# Create inline python commit-callback for git-filter-repo
# This callback replaces author/committer name/email when matches are found.
PY_CALLBACK=$(cat <<'PY'
def replace_identity(commit):
    bad_names = {bn for bn in [b"Copilot", b"copilot-swe-agent[bot]", b"copilot-swe-agent", b"copilot"] }
    bad_emails = {be for be in [b"198982749+Copilot@users.noreply.github.com", b"198982749+copilot-swe-agent@users.noreply.github.com"] }

    new_name = b'__NEW_NAME__'
    new_email = b'__NEW_EMAIL__'

    if commit.author_name in bad_names or commit.author_email in bad_emails:
        commit.author_name = new_name
        commit.author_email = new_email
    if commit.committer_name in bad_names or commit.committer_email in bad_emails:
        commit.committer_name = new_name
        commit.committer_email = new_email

def commit_callback(commit):
    replace_identity(commit)
PY
)

# Substitute new name/email into the python code (bytes literal)
PY_CALLBACK="${PY_CALLBACK//__NEW_NAME__/$NEW_NAME}"
PY_CALLBACK="${PY_CALLBACK//__NEW_EMAIL__/$NEW_EMAIL}"
# But need bytes literal form for git-filter-repo; wrap as b'...' — ensure ascii only
# Write final callback to file
echo "Writing commit-callback to $WORKDIR/commit-callback.py"
cat > "$WORKDIR/commit-callback.py" <<PYCB
$PY_CALLBACK
PYCB

# Run git-filter-repo with the callback
echo "Running git-filter-repo (this may take a while)..."
git filter-repo --force --commit-callback "exec(open('$WORKDIR/commit-callback.py').read())"

echo "Rewrite complete. Pushing rewritten history back to origin (force push mirror)..."
# Push everything (branches + tags) forcefully. This will overwrite remote history.
git push --force --mirror origin

echo "Done. Rewritten mirror pushed to origin."
echo "IMPORTANT: All collaborators must reclone or run 'git fetch --all' and reset to the rewritten branches."
echo "Example for each collaborator: git fetch origin && git reset --hard origin/main"
echo "Temporary backups left in: $WORKDIR (do not delete until you verify)."