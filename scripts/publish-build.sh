#!/bin/bash

set -euo pipefail

BUILD_DIR=${BUILD_DIR:-../chat-app-build}

echo "Building standalone Next.js app..."
pnpm build

if [ ! -d ".next/standalone" ]; then
  echo "Missing .next/standalone. Make sure next.config.ts uses output: \"standalone\"."
  exit 1
fi

echo "Preparing standalone folder: $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "Copying build output..."
cp -R .next/standalone/. "$BUILD_DIR/"

mkdir -p "$BUILD_DIR/.next"
cp -R .next/static "$BUILD_DIR/.next/static"

if [ -d "public" ]; then
  cp -R public "$BUILD_DIR/public"
fi

cp ecosystem.config.js "$BUILD_DIR/ecosystem.config.js"
cp scripts/deploy.sh "$BUILD_DIR/deploy.sh"
chmod +x "$BUILD_DIR/deploy.sh"

cat > "$BUILD_DIR/README.md" <<'EOF'
# Build Artifact
Single snapshot build (always overwritten)
EOF

echo "Standalone build created at: $BUILD_DIR"
