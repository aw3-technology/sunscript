# SunScript Quick Start Guide

Get up and running with SunScript in just 5 minutes! This guide will walk you through installation, your first program, and basic compilation.

## Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** or **yarn** package manager
- **AI Provider API Key** (OpenAI, Anthropic, or local LLM setup)

## Installation

### Build from Source (Currently Required)

Since SunScript is not yet published to npm, you'll need to build from source:

```bash
# Clone the repository
git clone https://github.com/aw3-technology/sunscript.git
cd sunscript

# Install dependencies
npm install

# Build the project
npm run build

# Link globally to use 'sunscript' command
npm link
```

### Alternative: Use npx with local path

If you don't want to link globally, you can use npx with the local path:

```bash
# From within the sunscript directory
npx ts-node bin/sunscript.ts run genesis.sun

# Or compile TypeScript first
npm run build
node dist/bin/sunscript.js run genesis.sun
```

## Setup AI Provider

SunScript requires an AI provider for compilation. Choose one:

### OpenAI (Recommended)

```bash
export OPENAI_API_KEY="your-api-key-here"
```

### Anthropic Claude

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Local LLM (Advanced)

```bash
export LOCAL_LLM_URL="http://localhost:8080"
```

## Your First SunScript Program

### 1. Create a Hello World Function

Create a file called `hello.sun`:

```sunscript
function greetUser {
    Display a friendly greeting message
    Include the current time
    Make it welcoming and personal
}

function main {
    Call greetUser to welcome the user
    Show application startup message
}
```

### 2. Compile Your Program

```bash
# Using the run command (works for any .sun file)
sunscript run hello.sun

# Or using the compile command with specific target
sunscript compile hello.sun --target javascript
```

This generates `hello.js`:

```javascript
function greetUser() {
    const currentTime = new Date().toLocaleTimeString();
    const greeting = `Hello! Welcome to our application. The current time is ${currentTime}. We're excited to have you here!`;
    console.log(greeting);
    return greeting;
}

function main() {
    console.log("🚀 Application starting...");
    greetUser();
    console.log("✅ Startup complete!");
}

// Run the main function
main();
```

### 3. Run Your Program

```bash
node hello.js
```

Output:
```
🚀 Application starting...
Hello! Welcome to our application. The current time is 2:30:45 PM. We're excited to have you here!
✅ Startup complete!
```

## Creating a Project with Genesis

For larger applications, use Genesis files to define project structure:

### 1. Create Genesis File

Create `genesis.sun`:

```sunscript
project HelloApp {
    description: "My first SunScript application"
    target: javascript
    framework: none
    output: "./dist"
}

dependencies {
    utilities: "date formatting, string manipulation"
}

structure {
    functions: "./src/functions"
    components: "./src/components"
    utilities: "./src/utils"
}
```

### 2. Initialize Project

```bash
sunscript let there be light --genesis genesis.sun
```

This creates:
```
my-app/
├── genesis.sun
├── src/
│   ├── functions/
│   ├── components/
│   └── utils/
├── dist/
└── package.json
```

### 3. Add Functions

Create `src/functions/calculator.sun`:

```sunscript
function addNumbers {
    Take two numbers as input
    Add them together
    Return the sum with proper formatting
}

function multiplyNumbers {
    Take two numbers as input  
    Multiply them together
    Handle edge cases like zero and negative numbers
    Return the product
}
```

### 4. Compile Project

```bash
sunscript let there be light
```

## Building a Simple Web Component

### 1. Create a Component

Create `src/components/UserCard.sun`:

```sunscript
@target javascript
@framework vanilla

component UserCard {
    Create a user profile card component
    Display user name, email, and avatar
    Include hover effects and responsive design
    Handle missing user data gracefully
}
```

### 2. Compile Component

```bash
sunscript compile src/components/UserCard.sun --target javascript
```

Generated `UserCard.js`:

```javascript
class UserCard {
    constructor(userData) {
        this.user = userData || {};
        this.element = this.createElement();
    }

    createElement() {
        const card = document.createElement('div');
        card.className = 'user-card';
        
        const avatar = this.user.avatar || 'https://via.placeholder.com/64';
        const name = this.user.name || 'Unknown User';
        const email = this.user.email || 'No email provided';
        
        card.innerHTML = `
            <div class="user-avatar">
                <img src="${avatar}" alt="${name}" onerror="this.src='https://via.placeholder.com/64'">
            </div>
            <div class="user-info">
                <h3 class="user-name">${name}</h3>
                <p class="user-email">${email}</p>
            </div>
        `;
        
        // Add responsive design and hover effects
        card.style.cssText = `
            display: flex;
            align-items: center;
            padding: 16px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            max-width: 300px;
            margin: 8px;
        `;
        
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        
        return card;
    }

    render(container) {
        if (container) {
            container.appendChild(this.element);
        }
        return this.element;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserCard;
}
```

## Working with AI Directives

Enhance your code with AI directives:

### 1. Performance Optimization

```sunscript
@optimize for speed
@cache results for 5 minutes
@minimize memory usage

function searchProducts {
    Search through large product catalog
    Filter by category, price, and availability  
    Sort results by relevance
    Return paginated results efficiently
}
```

### 2. Security Focus

```sunscript
@secure input validation
@sanitize user data
@encrypt sensitive fields

function processUserLogin {
    Validate username and password safely
    Check against database securely
    Handle failed attempts appropriately
    Generate secure session token
}
```

### 3. Testing Integration

```sunscript
@test edge cases
@generate unit tests
@mock external dependencies

function calculateShipping {
    Calculate shipping cost based on weight and distance
    Handle international shipping rules
    Apply discounts and promotions
    Return detailed cost breakdown
}
```

## Next Steps

Now that you have SunScript running, explore these topics:

### 🏗️ **Building Applications**
- [Your First App](first-app.md) - Build a complete todo application
- [Web Applications](../applications/web-apps.md) - Create web apps with SunScript
- [REST APIs](../applications/rest-apis.md) - Build backend services

### 📖 **Language Deep Dive**
- [Functions](../language/functions.md) - Master SunScript functions
- [Components](../language/components.md) - Build reusable components
- [AI Directives](../language/directives.md) - Control AI compilation

### 🔧 **Tools & Configuration**
- [CLI Reference](../compiler/cli-reference.md) - Master the command line
- [Debugging](../compiler/debugging.md) - Debug SunScript applications
- [IDE Integration](../advanced/ide-integration.md) - Set up your editor

### 📚 **Tutorials**
- [Todo App Tutorial](../tutorials/todo-app.md) - Complete application walkthrough
- [REST API Tutorial](../tutorials/rest-api.md) - Build a backend service
- [Component Library](../tutorials/component-library.md) - Create reusable components

## Common Commands Reference

```bash
# Compile a single file
sunscript compile myfile.sun --target javascript

# Compile with specific AI provider
sunscript compile myfile.sun --provider openai --target typescript

# Initialize project with Genesis
sunscript let there be light --genesis genesis.sun

# Watch for changes and recompile
sunscript compile myfile.sun --watch

# Debug a SunScript file
sunscript debug myfile.sun --target myfile.js

# Import from GitHub repository
sunscript import https://github.com/user/repo --output ./imported

# Show help
sunscript help

# Show version
sunscript --version
```

## Troubleshooting

### Common Issues

**Error: "AI Provider not configured"**
```bash
# Set your API key
export OPENAI_API_KEY="your-key-here"
```

**Error: "Command not found: sunscript"**
```bash
# Install globally or use npx
npm install -g sunscript-compiler
# OR
npx sunscript-compiler compile myfile.sun
```

**Error: "Compilation failed"**
- Check your AI provider API key
- Verify internet connection
- Review SunScript syntax in your file

### Getting Help

- 📖 [FAQ](../troubleshooting/faq.md)
- 🐛 [Common Issues](../troubleshooting/common-issues.md)
- 💬 [Community Support](../troubleshooting/support.md)
- 📋 [GitHub Issues](https://github.com/sunscript/sunscript-compiler/issues)

---

**Congratulations!** 🎉 You've successfully set up SunScript and created your first programs. Ready to build something amazing? Continue with [Your First App](first-app.md) tutorial!