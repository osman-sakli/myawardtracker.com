#!/usr/bin/env bash
# Builds the Lambda deployment directory (backend/build) that Terraform zips.
# Both Lambdas share this package and differ only by handler entrypoint.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Cleaning build dirs"
rm -rf build dist
mkdir -p build dist

echo "==> Copying source"
cp -r src/handlers src/app build/

echo "==> Installing dependencies (Lambda target: python3.12 / arm64)"
python3 -m pip install \
  --requirement requirements.txt \
  --target build \
  --platform manylinux2014_aarch64 \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  --upgrade --quiet

echo "==> Slimming package"
find build -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

echo "==> Done — backend/build is ready for packaging."
