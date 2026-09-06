#!/usr/bin/env bash
#
# Cut a release tag that consumers can actually install.
#
#   bash scripts/release.sh 1.1.2
#
# WHY THIS SCRIPT EXISTS
#   Consumers install this package from a GitHub tag
#   ("symbiont-cms": "github:guutz/symbiont-cms#v1.1.2"). Two things have to be
#   true for that to work, and v1.1.1 satisfied neither:
#
#   1. dist/ MUST BE IN THE TAG.
#      Every `exports` entry in package.json points at ./dist/*, but dist/ is
#      gitignored. A tag without it installs without error and then fails on
#      first import. Relying on the consumer to build it does not work either:
#      `prepare` is only `svelte-kit sync`, which does not emit dist -- the build
#      is in `prepack`, which does not run on a git install.
#
#   2. pnpm-workspace.yaml MUST BE IN THE TAG.
#      pnpm prepares a git dependency by running a NESTED `pnpm install` inside a
#      temp checkout. That install does not see the consumer's pnpm config, so it
#      needs this package's own `allowBuilds: esbuild: true`. Without it the
#      nested install dies with ERR_PNPM_IGNORED_BUILDS and the whole dependency
#      fails to prepare.
#
#   Committing dist/ is approach 1 from
#   .docs/2026-04-03-symbiont-git-tag-release-playbook.md ("fastest, simplest
#   for now"). This script makes it the automatic path so it cannot be forgotten.

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

# pnpm-workspace.yaml is load-bearing for consumers (see header). Refuse to tag
# without it rather than shipping another dependency that cannot be prepared.
if [ ! -f pnpm-workspace.yaml ]; then
  echo "error: pnpm-workspace.yaml is missing. Consumers' nested install needs" >&2
  echo "       'allowBuilds: { esbuild: true }' from this file." >&2
  exit 1
fi
if ! grep -q "esbuild" pnpm-workspace.yaml; then
  echo "error: pnpm-workspace.yaml does not mention esbuild." >&2
  echo "       The nested install pnpm runs when preparing a git dependency" >&2
  echo "       will fail with ERR_PNPM_IGNORED_BUILDS." >&2
  exit 1
fi

echo "==> version -> $VERSION"
npm --no-git-tag-version version "$VERSION" >/dev/null

echo "==> test"
pnpm test

echo "==> build"
rm -rf dist
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
