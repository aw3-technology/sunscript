# SunScript Frequently Asked Questions (FAQ)

## General Questions

### What is SunScript?

SunScript is an AI-native programming language that allows developers to write software using natural language constructs. It bridges the gap between human intent and executable code by leveraging artificial intelligence to transform natural language descriptions into traditional programming language code.

### How does SunScript work?

SunScript uses a multi-stage compilation process:
1. **Lexical Analysis**: Tokenizes SunScript source code
2. **Syntax Parsing**: Builds an Abstract Syntax Tree (AST)
3. **AI Processing**: Sends natural language to AI providers for code generation
4. **Code Generation**: Combines structured syntax with AI-generated code
5. **Output**: Produces clean, executable code in target languages

### What languages can SunScript compile to?

SunScript currently supports compilation to:
- **JavaScript** (ES6+, Node.js, Browser)
- **TypeScript** (with full type definitions)
- **Python** (3.8+, async/await support)
- **Java** (Java 11+, Spring Boot integration)
- **Go** (Modern Go with modules)
- **Rust** (Safe systems programming)
- **C#** (Modern C# with .NET support)

More languages are being added based on community demand.

### Is SunScript production-ready?

SunScript is actively developed and used in production environments. However, as with any AI-powered tool:
- **Review generated code** before deployment
- **Test thoroughly** with your specific use cases
- **Use version control** to track changes
- **Start with non-critical components** to gain confidence

## Installation & Setup

### How do I install SunScript?

Since SunScript is not yet published to npm, you need to build from source:

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

After linking, you can use the `sunscript` command globally:
```bash
sunscript run genesis.sun
sunscript let there be light
```

### What AI providers are supported?

- **OpenAI GPT-4**: Recommended for production use
- **Anthropic Claude**: Alternative with different strengths
- **Local LLM**: Privacy-focused local processing (Ollama, etc.)
- **Custom Providers**: Implement your own AI provider interface

### How do I configure my AI provider?

**OpenAI:**
```bash
export OPENAI_API_KEY="your-api-key-here"
```

**Anthropic:**
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

**Local LLM:**
```bash
export LOCAL_LLM_URL="http://localhost:11434"
```

### Can I use SunScript without an internet connection?

Yes, if you have a local LLM setup:
1. Install Ollama or similar local LLM server
2. Download a compatible model (e.g., Llama 2, CodeLlama)
3. Configure SunScript to use the local endpoint
4. SunScript will work entirely offline

## Language & Syntax

### What's the difference between functions and components?

**Functions** are for business logic and data processing:
```sunscript
function calculateTax {
    Calculate tax based on income and tax brackets
    Apply deductions and credits
    Return the final tax amount
}
```

**Components** are for UI elements and reusable interfaces:
```sunscript
component UserProfile {
    Display user information in a card format
    Include avatar, name, email, and edit button
    Handle user interactions for editing
}
```

### How specific should my natural language be?

**Good - Specific and actionable:**
```sunscript
function validateEmail {
    Check if email format is valid using regex
    Verify domain has MX record
    Return true if valid, false otherwise
}
```

**Avoid - Too vague:**
```sunscript
function doEmailStuff {
    Handle email things
}
```

### Can I mix natural language with traditional code?

Yes! SunScript supports hybrid approaches:

```sunscript
function processPayment {
    // Traditional structured approach
    when payment validation succeeds then {
        Charge the credit card through payment gateway
        Send confirmation email to customer
        Update order status to paid
        Log transaction for accounting
    }
    
    when payment validation fails then {
        Log the validation error
        Send failure notification
        Return user-friendly error message
    }
}
```

### How do AI directives work?

AI directives provide hints to guide code generation:

```sunscript
@optimize for speed
@secure input validation
@test edge cases
@target react components

function searchProducts {
    Create fast product search with security validation
    Handle edge cases like empty queries
    Return results optimized for React display
}
```

## Compilation & Build

### Why is compilation slow?

Several factors affect compilation speed:
- **AI provider latency**: Network requests to AI services
- **Code complexity**: More complex descriptions take longer
- **Cache misses**: First-time compilation is slower
- **Project size**: Larger projects take more time

**Speed optimization tips:**
- Enable caching: `--cache`
- Use incremental compilation: `--incremental`
- Use local LLM for faster responses
- Break large functions into smaller ones

### How can I speed up compilation?

1. **Enable caching:**
   ```bash
   sunscript compile app.sun --cache
   ```

2. **Use incremental compilation:**
   ```bash
   sunscript compile --incremental --watch
   ```

3. **Optimize AI prompts:**
   ```sunscript
   @optimize prompts
   function myFunction {
       // More specific descriptions compile faster
   }
   ```

4. **Use local LLM:**
   ```bash
   export LOCAL_LLM_URL="http://localhost:11434"
   ```

### What should I do if compilation fails?

1. **Check AI provider connection:**
   ```bash
   # Test your API key
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

2. **Review error messages:**
   - Syntax errors: Check SunScript syntax
   - AI errors: Simplify natural language descriptions
   - Network errors: Check internet connection

3. **Use debugging mode:**
   ```bash
   sunscript compile app.sun --verbose --debug
   ```

4. **Try incremental compilation:**
   ```bash
   sunscript compile app.sun --incremental
   ```

### How do I handle compilation errors?

SunScript has advanced error recovery:

**Parser errors** - Continue compilation with suggestions:
```
⚠️  Found 2 parse error(s) in app.sun:
   1. Missing '{' after function name at line 5
      Suggestions: Add '{' after the function name
   2. Possible misspelling: 'fucntion' at line 10
      Suggestions: Did you mean 'function'?
```

**AI errors** - Retry with different prompts or providers:
```bash
# Try different AI provider
sunscript compile app.sun --provider anthropic

# Simplify natural language
# Instead of: "Create complex multi-threaded async processing"
# Try: "Process data asynchronously with error handling"
```

## Performance & Optimization

### How do I optimize generated code?

Use optimization directives:

```sunscript
@optimize for speed
@minimize memory usage
@cache results for 1 hour

function expensiveCalculation {
    Perform complex mathematical computation
    Cache results for repeated calls
    Use efficient algorithms for large datasets
}
```

### Can I control the generated code style?

Yes, through directives and configuration:

```sunscript
@style modern
@format prettier
@eslint strict

function styledFunction {
    Generate code following modern JavaScript practices
    Apply consistent formatting and linting rules
}
```

### How do I optimize for mobile performance?

```sunscript
@optimize for mobile
@minimize bundle size
@lazy load components

component MobileOptimized {
    Create lightweight component optimized for mobile
    Use minimal dependencies and efficient rendering
    Implement touch-friendly interactions
}
```

## Security

### Is my code secure when using AI?

SunScript has built-in security features:
- **Input validation**: All user inputs are validated
- **Path security**: Prevents directory traversal attacks
- **Command injection prevention**: Safe shell command execution
- **Code review**: Always review generated code before deployment

### How do I ensure secure code generation?

Use security directives:

```sunscript
@secure input validation
@sanitize user data
@encrypt sensitive fields
@audit security

function handleUserData {
    Safely process user input with validation
    Sanitize all data before database storage
    Encrypt sensitive information like passwords
    Log security-relevant operations for audit
}
```

### Can I use SunScript in enterprise environments?

Yes, SunScript supports enterprise requirements:
- **Local LLM deployment**: No data leaves your network
- **Audit logging**: Track all compilation activities
- **Security scanning**: Built-in security validation
- **Compliance**: Configurable security policies

## Debugging & Development

### How do I debug SunScript applications?

Use the built-in debugger:

```bash
# Debug a SunScript file
sunscript debug app.sun --target dist/app.js

# Interactive debugging session
sunscript debug app.sun --interactive
```

### Can I see the mapping between SunScript and generated code?

Yes, SunScript generates source maps:

```bash
# Compile with source maps
sunscript compile app.sun --source-maps

# Debug with source mapping
sunscript debug app.sun --map-sources
```

### How do I handle runtime errors?

The debugger translates runtime errors back to SunScript:

```
Runtime Error in generated JavaScript:
TypeError: Cannot read property 'name' of undefined at line 15

SunScript Context:
File: userManager.sun, Line: 8
Function: displayUserInfo
Description: "Show user name and email in the interface"

Suggestion: Add null checking before accessing user properties
```

## Integration & Deployment

### How do I integrate SunScript with existing projects?

1. **Gradual adoption:**
   ```bash
   # Compile individual components
   sunscript compile src/components/NewFeature.sun --target javascript
   ```

2. **Mixed codebase:**
   ```javascript
   // Import SunScript-generated modules
   import { userValidator } from './generated/userValidator.js';
   import { DataProcessor } from './generated/DataProcessor.js';
   ```

3. **Build pipeline integration:**
   ```json
   {
     "scripts": {
       "prebuild": "sunscript let there be light",
       "build": "webpack --mode production"
     }
   }
   ```

### Can I use SunScript with my favorite framework?

Yes! SunScript supports popular frameworks:

```sunscript
@framework react
@target typescript

component UserCard {
    Create React component with TypeScript
    Use hooks for state management
    Follow React best practices
}
```

Supported frameworks:
- React, Vue, Angular
- Express, Fastify, Koa
- Django, Flask, FastAPI
- Spring Boot, Quarkus

### How do I deploy SunScript applications?

Deploy the generated code like any traditional application:

1. **Static sites:** Deploy `dist/` folder to CDN
2. **Node.js:** Deploy generated JavaScript to server
3. **Docker:** Include generated code in container
4. **Serverless:** Deploy functions to AWS Lambda, Vercel, etc.

## Community & Support

### Where can I get help?

- 📖 **Documentation**: Comprehensive guides and tutorials
- 💬 **Discord**: Real-time community chat
- 📋 **GitHub Issues**: Bug reports and feature requests
- 📧 **Email Support**: enterprise@sunscript.dev
- 🎥 **YouTube**: Tutorial videos and walkthroughs

### How can I contribute to SunScript?

1. **Code contributions**: Submit PRs on GitHub
2. **Documentation**: Improve guides and examples
3. **Testing**: Report bugs and edge cases
4. **Community**: Help others in Discord
5. **Examples**: Share your SunScript projects

### Is there commercial support available?

Yes, commercial support options include:
- **Priority support**: Faster response times
- **Custom training**: Team training sessions
- **Enterprise features**: Advanced security and compliance
- **Custom integrations**: Tailored AI provider setups

### What's the licensing model?

- **Community License**: SunScript Community License v1.1 (Custom License)
- **Free for Applications**: Build and sell applications using SunScript-generated code
- **Commercial Code Generation**: Enterprise license required for competing products
- **AI Providers**: Separate billing for OpenAI/Anthropic usage
- **Self-hosted**: Use your own infrastructure freely for permitted use cases

**Key Points:**
- ✅ **Free to use** SunScript for building applications and services
- ✅ **Commercial use allowed** for applications built with SunScript
- ✅ **Modify and distribute** SunScript source code with attribution
- ❌ **Cannot compete** by building similar code generation tools
- ❌ **Cannot resell** SunScript itself as a product

For commercial code generation products, contact: will.schulz@aw3.tech

## Troubleshooting Common Issues

### "Command not found: sunscript"

This usually means SunScript hasn't been linked globally. Fix it:

```bash
# From the sunscript directory
npm link

# Verify it worked
which sunscript

# Alternative: use npx with local path
npx ts-node bin/sunscript.ts run genesis.sun

# Or use node directly after building
node dist/bin/sunscript.js run genesis.sun
```

### "AI Provider not configured"

```bash
# Set environment variable
export OPENAI_API_KEY="your-key-here"

# Or use config file
echo '{"aiProvider": {"apiKey": "your-key"}}' > sunscript.config.json
```

### "Compilation timeout"

```bash
# Increase timeout
sunscript compile app.sun --timeout 120000

# Use local LLM for faster response
export LOCAL_LLM_URL="http://localhost:11434"
```

### "Generated code has errors"

1. **Review natural language descriptions** - Be more specific
2. **Use simpler language** - Break complex tasks into smaller parts
3. **Add validation directives** - Use `@validate output`
4. **Try different AI provider** - Switch between OpenAI/Anthropic

### "Permission denied" errors

```bash
# Fix file permissions
chmod +x ./node_modules/.bin/sunscript

# Run with sudo (not recommended for development)
sudo npm link

# Use user-local npm
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

---

## Still have questions?

- 🔍 **Search Documentation**: Use the search function in our docs
- 💬 **Join Discord**: Get real-time help from the community
- 📝 **Create Issue**: Report bugs or request features on GitHub
- 📧 **Email Support**: Contact support@sunscript.dev for enterprise inquiries

*This FAQ is continuously updated based on community questions and feedback.*