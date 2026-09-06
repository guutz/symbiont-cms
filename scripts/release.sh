#!/usr/bin/env bash
#
# Cut a release tag that consumers can actually install.
#
#   bash scripts/release.sh 1.1.2
#
# WHY THIS SCRIPT EXISTS
#   Consumers install this package from a GitHub tag
#   ("symbiont-cms": "github:guutz/symbiont-cms#v1.1.9"), which resolves to the
#   raw git tarball -- NOT to an npm-packed artifact. So whatever is committed at
#   the tag is exactly what they get.
#
#   dist/ MUST BE IN THE TAG.
#     Every `exports` entry points at ./dist/*, but dist/ is gitignored for
#     day-to-day work. A tag without it installs with no error and then fails on
#     first import. There is no longer any fallback: the `prepare` script was
#     removed when the package stopped using SvelteKit, so pnpm has nothing to
#     run on the consumer's side even if it wanted to build. Committing dist/ at
#     the tag is the whole mechanism.
#
#     This is approach 1 from
#     .docs/2026-04-03-symbiont-git-tag-release-playbook.md ("fastest, simplest
#     for now"). This script makes it automatic so it cannot be forgotten -- four
#     consecutive tags (v1.1.1 through v1.1.4) shipped broken before it existed.
#
#   pnpm-workspace.yaml is still checked, but is now belt-and-braces.
#     With no `prepare` script, pnpm should extract the tarball without running a
#     nested install at all, so its `allowBuilds: esbuild: true` may no longer be
#     load-bearing. Keeping the check costs nothing and protects against the case
#     where pnpm decides to build anyway. `symbiont:verify-tag` in the consumer
#     is the arbiter -- if it passes with that entry removed from the consumer's
#     pnpm-workspace.yaml, this gate can go too.
#
#   BUILD IS NOW PLAIN tsc.
#     `pnpm build` runs `tsc -p tsconfig.build.json && publint`. svelte-package
#     was dropped along with the rest of the SvelteKit toolchain: this package
#     has no .svelte files and exports no components, and svelte2tsx refuses to
#     run under TypeScript 7, which blocked releases entirely.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: bash scripts/release.sh <version>   e.g. 1.1.2" >&2
  exit 2
fi
VERSION="${VERSION#v}"
TAG="v${VERSION}"

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "error: tag $TAG already exists." >&2
  exit 1
fi

# Belt-and-braces since the `prepare` script was removed (see header): pnpm
# should no longer run a nested install when preparing this dependency. Warn
# rather than fail, so a deliberate cleanup of this file is not blocked.
if [ ! -f pnpm-workspace.yaml ] || ! grep -q "esbuild" pnpm-workspace.yaml; then
  echo "warning: pnpm-workspace.yaml missing or has no esbuild entry." >&2
  echo "         Probably fine now that there is no 'prepare' script, but confirm" >&2
  echo "         with 'pnpm run symbiont:verify-tag' in a consumer before relying" >&2
  echo "         on it." >&2
fi

# The build must not silently fall back to a stale checkout of the old toolchain.
if [ -f svelte.config.js ] || [ -d .svelte-kit ]; then
  echo "error: svelte.config.js or .svelte-kit/ is present." >&2
  echo "       This package was de-svelted; those should be gone. A stale" >&2
  echo "       .svelte-kit/__package__ has previously been picked up by the test" >&2
  echo "       runner and graded as if it were current." >&2
  exit 1
fi

echo "==> version -> $VERSION"
npm --no-git-tag-version version "$VERSION" >/dev/null

# Clear build output BEFORE testing. Vitest is scoped to src/ (see the test
# block in vite.config.ts), but a stale dist/ has previously been picked up and
# graded as if it were current -- reporting failures for code that was already
# fixed. Removing it first makes that impossible rather than merely unlikely.
echo "==> clean"
rm -rf dist

echo "==> test"
pnpm test

echo "==> build"
pnpm build

for f in dist/index.js dist/index.d.ts dist/server.js dist/server.d.ts; do
  if [ ! -f "$f" ]; then
    echo "error: build did not produce $f -- refusing to tag." >&2
    exit 1
  fi
done
echo "    dist/ looks complete"

echo "==> commit"
# -f because dist/ is gitignored for day-to-day work.
git add -f dist
git add -A
git commit -m "release: $TAG"

echo "==> tag"
git tag "$TAG"

cat <<EOF

Staged locally. Nothing has been pushed yet.

  git push origin HEAD --tags

Then, in a consumer:

  # package.json
  "symbiont-cms": "github:guutz/symbiont-cms#$TAG"

  pnpm run symbiont:unlink      # drop the local dev symlink first
  pnpm install
  pnpm run symbiont:verify-tag  # proves the tag actually installs and imports

EOF
