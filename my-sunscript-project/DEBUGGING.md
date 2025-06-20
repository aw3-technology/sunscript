# SunScript Debugging Guide

## 🐛 Overview

SunScript provides comprehensive debugging capabilities that bridge the gap between natural language programming and traditional debugging. The debugger translates runtime errors into plain English and provides AI-powered suggestions for fixes.

## 🚀 Getting Started

### Basic Debugging Session

1. **Compile your SunScript first:**
   ```bash
   sunscript compile myapp.sun -o ./dist
   ```

2. **Start debugging:**
   ```bash
   sunscript debug myapp.sun -t ./dist/myapp.js
   ```

3. **Interactive debugging:**
   ```
   sunscript-debug> help
   sunscript-debug> break 15 when user input is empty
   sunscript-debug> vars
   sunscript-debug> suggest
   ```

### Auto-discovery of Target Files

If you don't specify a target file, the debugger will automatically look for compiled output in common locations:
- `./dist/[filename].js`
- `./build/[filename].js`
- `./out/[filename].js`
- `./[filename].js`

## 🗺️ Source Mapping

The debugger creates intelligent mappings between your natural language SunScript and the compiled target code:

```
SunScript Line → Target Line | Context
─────────────────────────────────────────
   5 → 12      | validate user input
   8 → 18      | calculate discount amount
  12 → 25      | save order to database
```

### AI-Powered Mapping

The system uses AI to understand the semantic relationship between your natural language intentions and the compiled code, providing meaningful context for each mapping.

## 🔴 Breakpoints

### Setting Breakpoints

```bash
# Set a simple breakpoint
break 15

# Set a conditional breakpoint in natural language
break 20 when user count is greater than 10
break 8 if the result is empty
break 35 when database connection fails
```

### Natural Language Conditions

The debugger translates your natural language conditions into executable code:

- `"when user count is greater than 10"` → `userCount > 10`
- `"if the result is empty"` → `result === null || result === undefined || result.length === 0`
- `"when database connection fails"` → `dbConnection === null || dbConnection.status === 'failed'`

## 🚨 Error Translation

### Runtime Error Analysis

When errors occur, the debugger provides:

1. **Natural Language Translation:**
   ```
   Technical: TypeError: Cannot read property 'name' of undefined
   Natural Language: Something is undefined when you try to use it. This happened in: "get the user's name from the profile"
   ```

2. **Error Categories:**
   - `logic` - Your program logic doesn't match intentions
   - `syntax` - Code structure issues
   - `type` - Wrong data types being used
   - `runtime` - Errors during execution
   - `ai-interpretation` - AI misunderstood your natural language

3. **Severity Levels:**
   - `critical` - Application cannot continue
   - `high` - Major functionality broken
   - `medium` - Feature not working correctly
   - `low` - Minor issues or warnings

### Example Error Translation

```
🚨 Error Analysis:
Technical: ReferenceError: userName is not defined
Natural Language: A variable called 'userName' is being used but it hasn't been created or defined yet
Type: syntax
SunScript Location: Line 8
Suggestions:
  • Make sure you've defined the userName variable before using it
  • Check if the variable name is spelled correctly
  • Verify the variable is available in the current scope
```

## 📊 Variable Inspection

### Natural Language Variable Descriptions

The debugger explains your variables in plain English:

```
LOCAL userCount: 42
    The total number of registered users in the system

GLOBAL currentUser: {"name": "John", "email": "john@example.com"}
    The user object containing information about who is currently logged in

LOCAL isAuthenticated: true
    Whether the current user has successfully logged in
```

## 🔍 Debugging Commands

### Essential Commands

```bash
help                     # Show all available commands
map                      # Show source mappings
break <line> [condition] # Set breakpoint
breakpoints             # List all breakpoints
error <message> <line>  # Simulate error for testing
explain <line>          # Explain what code does at specific line
vars                    # Show current variables
suggest                 # Get AI debugging suggestions
fix                     # Get automated fix suggestions
trace                   # Show execution stack trace
context <line>          # Show code context around line
condition <expression>  # Test natural language condition
session                 # Show debug session info
quit                    # End debugging session
```

### Advanced Usage

```bash
# Explain code behavior
explain 15
# Output: Line 15 validates user input by checking if the provided name contains only letters

# Get debugging suggestions
suggest
# Output: 
#   1. Check if all variables have expected values
#   2. Variable "userInput" is empty, this might be causing issues
#   3. Review the conditions in your logic

# Test conditions
condition "when the user age is greater than 18"
# Output: Compiled: userAge > 18
```

## 🤖 AI-Powered Features

### Intelligent Error Analysis

The debugger uses AI to:
- Translate technical errors into natural language
- Suggest fixes based on common patterns
- Provide educational content about error types
- Generate context-aware debugging suggestions

### Automated Fix Suggestions

```
🔧 Possible Fixes:
  1. Add input validation (95% confidence)
     Change: "check if user input is not empty before processing"
  
  2. Add error handling (87% confidence) 
     Change: "handle the case when operation fails"
     
  3. Improve variable naming (72% confidence)
     Change: "rename variable to be more descriptive"
```

### Educational Content

When errors occur, the debugger provides educational explanations:

```
📚 Learning: Type Errors
Type errors occur when data is used in an unexpected way. In natural language programming, this often happens when:
1. A variable that should contain text actually contains nothing
2. You try to do math with words instead of numbers
3. You attempt to access properties of something that doesn't exist

Best practices:
- Always check if data exists before using it
- Be clear about what type of data you expect
- Use descriptive variable names that indicate data types
```

## 📝 Example Debugging Session

```bash
$ sunscript debug examples/debugging-example.sun -t examples/debugging-demo.js

🐛 Starting SunScript Debug Session
📄 SunScript: examples/debugging-example.sun
🎯 Target: examples/debugging-demo.js
✅ Debug session started: debug_1703123456789_abc123
📍 Generating source mappings...
✅ Source map created with 15 mappings

sunscript-debug> break 8 when user input is empty
✅ Breakpoint set at line 8
   Condition: "when user input is empty"
   Compiled: userInput === null || userInput === undefined || userInput.length === 0

sunscript-debug> error "Cannot read property 'length' of null" 8
🚨 Error Analysis:
Technical: Cannot read property 'length' of null
Natural Language: You're trying to check the length of something that doesn't exist or is empty
Type: type
SunScript Location: Line 8

💡 Suggestions:
  • Check if the variable exists before using its properties
  • Add a condition to handle empty values
  • Verify the data is available before processing

🔧 Possible Fixes:
  1. Add null check (90% confidence)
     Change: "if the value exists then check its length"

sunscript-debug> suggest
🔍 Debugging Suggestions:
  1. Check if the user input variable is properly initialized
  2. Add validation to ensure input is not null or undefined
  3. Consider what should happen when no input is provided
  4. Review the logic that sets the user input value

sunscript-debug> context 8
📄 Context around line 8:
   6: function validateUserInput {
   7:     check if the user provided their name
→  8:     verify the name is not empty
   9:     ensure the name contains only letters
  10:     return true if valid otherwise false

sunscript-debug> quit
👋 Debug session ended
```

## 🎯 Best Practices

### Writing Debuggable SunScript

1. **Use descriptive natural language:**
   ```sunscript
   # Good
   check if the user's email address is valid
   
   # Less helpful for debugging
   validate input
   ```

2. **Break complex logic into steps:**
   ```sunscript
   # Good
   function processPayment {
       verify the credit card number is valid
       check if sufficient funds are available
       process the transaction securely
       send confirmation to the user
   }
   
   # Harder to debug
   function processPayment {
       handle payment processing
   }
   ```

3. **Add context with comments:**
   ```sunscript
   # This handles edge case where user profile is incomplete
   if the user profile is missing required fields then
       show the profile completion form
   ```

### Debugging Strategies

1. **Start with error translation** - Always check what the error means in natural language
2. **Use breakpoints liberally** - Set breakpoints at key decision points
3. **Inspect variables regularly** - Check that data matches your expectations
4. **Ask for suggestions** - The AI can often spot patterns you might miss
5. **Test edge cases** - Use the error simulation to test failure scenarios

## 🔧 Integration with Development Workflow

### IDE Integration (Future)

The debugging system is designed to integrate with popular IDEs:
- Visual Studio Code extension
- IntelliJ/WebStorm plugins
- Vim/Neovim integrations

### Continuous Integration

Use debugging in CI/CD pipelines:
```yaml
# .github/workflows/debug-tests.yml
- name: Run SunScript Debug Tests
  run: |
    sunscript compile src/app.sun
    sunscript debug src/app.sun --test-mode --output debug-report.json
```

## 🚀 Advanced Features

### Custom Error Handlers

Define custom error handling in your SunScript:

```sunscript
config {
    errorHandling: {
        onValidationError: "show user-friendly message"
        onDatabaseError: "retry operation up to 3 times"
        onNetworkError: "switch to offline mode"
    }
}
```

### Debug Hooks

Add debugging hooks in your code:

```sunscript
function complexCalculation {
    debug: "Starting calculation with input: {input}"
    perform the mathematical operations
    debug: "Intermediate result: {result}"
    apply business rules
    debug: "Final result: {finalResult}"
    return the calculated value
}
```

## 📚 Troubleshooting Common Issues

### "No source mappings found"
- Ensure your SunScript file was compiled recently
- Check that the target file path is correct
- Verify the AI provider is configured (needs OPENAI_API_KEY)

### "Cannot translate error"
- The AI service might be unavailable
- Check your internet connection
- Verify API key is valid

### "Breakpoint not hit"
- Check if the line number corresponds to executable code
- Verify the condition syntax is correct
- Ensure the code path is actually executed

## 🎓 Learning Resources

- [SunScript Language Guide](./README.md)
- [Error Patterns Reference](./docs/error-patterns.md)
- [Debugging Best Practices](./docs/debugging-best-practices.md)
- [AI Integration Guide](./docs/ai-integration.md)

---

The SunScript debugger makes debugging as natural as the language itself. By translating technical errors into plain English and providing AI-powered insights, it helps developers focus on solving problems rather than deciphering cryptic error messages.

For more help: `sunscript debug --help` or visit our documentation at [sunscript.dev/debugging](https://sunscript.dev/debugging)