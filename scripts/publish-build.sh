#!/bin/bash

set -euo pipefail

BUILD_REPO_URL=${BUILD_REPO_URL:-https://gitlab.com/autolarisshop/shop-chat-web-build.git}
BUILD_REPO_DIR=${BUILD_REPO_DIR:-../shop-chat-web-build}
BUILD_BRANCH=${BUILD_BRANCH:-main}
AUTO_PUSH=${AUTO_PUSH:-1}
COMMIT_MESSAGE=${COMMIT_MESSAGE:-"Deploy standalone build"}

echo "Building standalone Next.js app..."
pnpm build

if [ ! -d ".next/standalone" ]; then
  echo "Missing .next/standalone. Make sure next.config.ts uses output: \"standalone\"."
  exit 1
fi

echo "Cloning repo if needed..."
if [ ! -d "$BUILD_REPO_DIR/.git" ]; then
  git clone "$BUILD_REPO_URL" "$BUILD_REPO_DIR"
fi

echo "Preparing clean orphan commit..."

# masuk repo build
cd "$BUILD_REPO_DIR"

# hapus semua history working branch (INI KUNCI UTAMA)
git fetch origin || true
SNAPSHOT_BRANCH="latest-build-$(date +%Y%m%d%H%M%S)-$$"
git checkout --orphan "$SNAPSHOT_BRANCH"

# hapus semua file tracked
git rm -rf . || true

# keluar ke root project untuk copy build
cd - > /dev/null

echo "Copying build output..."
rm -rf "$BUILD_REPO_DIR"/*

cp -R .next/standalone/. "$BUILD_REPO_DIR/"

mkdir -p "$BUILD_REPO_DIR/.next"
cp -R .next/static "$BUILD_REPO_DIR/.next/static"

if [ -d "public" ]; then
  cp -R public "$BUILD_REPO_DIR/public"
fi

if [ -f "ecosystem.config.js" ]; then
  cp ecosystem.config.js "$BUILD_REPO_DIR/ecosystem.config.js"
fi
if [ -f "scripts/deploy.sh" ]; then
  cp scripts/deploy.sh "$BUILD_REPO_DIR/deploy.sh"
  chmod +x "$BUILD_REPO_DIR/deploy.sh"
fi

cat > "$BUILD_REPO_DIR/README.md" <<'EOF'
# Build Artifact
Single snapshot build (always overwritten)
EOF

cd "$BUILD_REPO_DIR"

echo "Creating SINGLE commit only..."
git add -A

git commit -m "$COMMIT_MESSAGE"

echo "FORCE REPLACING remote branch history..."
if [ "$AUTO_PUSH" = "1" ]; then
  git push origin HEAD:$BUILD_BRANCH --force
else
  echo "AUTO_PUSH=0, skipping push."
fi

echo "Done - repository now contains ONLY 1 commit snapshot."
