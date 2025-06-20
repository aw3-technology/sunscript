#!/bin/bash

echo "🔨 Building SunScript compiler..."
npm run build

echo -e "\n🧪 Testing GitHub import functionality..."

# Create a test directory
TEST_DIR="./test-import-demo"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo -e "\n📦 Testing import with a simple repository..."
echo "Note: This requires OPENAI_API_KEY to be set"

# Test with a simple JavaScript project
REPO_URL="https://github.com/sindresorhus/is-odd"

echo "Running: npx ts-node ../bin/sunscript.ts import $REPO_URL"
npx ts-node ../bin/sunscript.ts import "$REPO_URL"

echo -e "\n📁 Generated files:"
find . -name "*.sun" -o -name "genesis.sun" | head -10

echo -e "\n🧹 Cleaning up test directory..."
cd ..
rm -rf "$TEST_DIR"

echo -e "\n✅ Import test complete!"
echo -e "\n💡 To test with a real repository:"
echo "   1. Set your OPENAI_API_KEY environment variable"
echo "   2. Run: sunscript import https://github.com/owner/repo"