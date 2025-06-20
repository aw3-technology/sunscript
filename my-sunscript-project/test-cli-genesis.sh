#!/bin/bash

echo "🔨 Building SunScript compiler..."
npm run build

echo -e "\n📝 Creating test genesis.sun file..."
cat > test-genesis.sun << 'EOF'
@project "CLI Test Project"
@version "0.0.1"
@author "Test Runner"
@source "./examples"
@output "./test-output"
@context demo application

# Test Project
Testing the "Let there be light" command

imports {
    hello-world.sun as Hello
}

build {
    targets: ["javascript"]
    minify: false
}
EOF

echo -e "\n🚀 Testing 'let there be light' command..."
echo "Running: npx ts-node bin/sunscript.ts let there be light -g test-genesis.sun"
npx ts-node bin/sunscript.ts let there be light -g test-genesis.sun

echo -e "\n🧹 Cleaning up..."
rm -f test-genesis.sun
rm -rf test-output

echo -e "\n✅ Test complete!"