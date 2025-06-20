#!/bin/bash

echo "🔨 Building SunScript compiler..."
npm run build

echo -e "\n⚡ Testing incremental compilation..."

# Create test project structure
TEST_DIR="./test-incremental"
mkdir -p "$TEST_DIR/src"

echo -e "\n📁 Creating test project..."

# Create genesis.sun
cat > "$TEST_DIR/genesis.sun" << 'EOF'
@project "Incremental Test"
@version "1.0.0"
@source "./src"
@output "./build"
@context testing

imports {
    utils.sun as Utils
    calculator.sun as Calculator
}

build {
    targets: ["javascript"]
}
EOF

# Create test SunScript files
cat > "$TEST_DIR/src/utils.sun" << 'EOF'
@context utility functions

function formatNumber {
    take a number and format it with commas
    add proper decimal places
    return the formatted string
}

function validateInput {
    check if the input is a valid number
    return true if valid, false otherwise
}
EOF

cat > "$TEST_DIR/src/calculator.sun" << 'EOF'
@context calculation functions

function add {
    take two numbers and add them together
    use validateInput to check the numbers are valid
    use formatNumber to format the result
    return the formatted sum
}

function multiply {
    take two numbers and multiply them
    validate the inputs first
    format and return the result
}
EOF

cd "$TEST_DIR"

echo -e "\n1️⃣ First build (full compilation)..."
time npx ts-node ../bin/sunscript.ts let there be light -v

echo -e "\n2️⃣ Second build (no changes - cache hit)..."
time npx ts-node ../bin/sunscript.ts let there be light -v

echo -e "\n3️⃣ Modifying one function..."
# Modify the add function
cat > "src/calculator.sun" << 'EOF'
@context calculation functions

function add {
    take two numbers and add them together
    use validateInput to check the numbers are valid
    use formatNumber to format the result
    also log the operation for debugging
    return the formatted sum
}

function multiply {
    take two numbers and multiply them
    validate the inputs first
    format and return the result
}
EOF

echo "Modified calculator.sun - added logging to add function"
time npx ts-node ../bin/sunscript.ts let there be light -v

echo -e "\n4️⃣ Adding a new function..."
cat > "src/utils.sun" << 'EOF'
@context utility functions

function formatNumber {
    take a number and format it with commas
    add proper decimal places
    return the formatted string
}

function validateInput {
    check if the input is a valid number
    return true if valid, false otherwise
}

function logOperation {
    take an operation name and values
    write them to the console for debugging
    include timestamp
}
EOF

echo "Added new logOperation function to utils.sun"
time npx ts-node ../bin/sunscript.ts let there be light -v

echo -e "\n5️⃣ Testing full rebuild flag..."
time npx ts-node ../bin/sunscript.ts let there be light --full -v

echo -e "\n6️⃣ Testing cache clearing..."
npx ts-node ../bin/sunscript.ts let there be light --clear-cache
time npx ts-node ../bin/sunscript.ts let there be light -v

echo -e "\n🧹 Cleaning up..."
cd ..
rm -rf "$TEST_DIR"

echo -e "\n✅ Incremental compilation test completed!"
echo -e "\n💡 Notice how subsequent builds are much faster!"
echo -e "   - Cache hits are nearly instant"
echo -e "   - Small changes only rebuild affected parts"
echo -e "   - Full rebuilds are only used when necessary"