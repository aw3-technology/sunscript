# Contributing to SunScript

Thank you for your interest in contributing to SunScript! This guide will help you get started with contributing to the SunScript compiler and ecosystem.

## 📄 License Agreement

By contributing to SunScript, you agree that your contributions will be licensed under the **SunScript Community License v1.1**. 

### Important Notes:
- **Contributors retain copyright** to their contributions
- **AW3 Technology, Inc.** maintains the overall copyright and license terms
- **All contributions** become part of the SunScript project under the Community License
- **Commercial licensing** for competing products requires separate agreement

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** or **yarn** package manager
- **Git** for version control
- **AI Provider API Key** (OpenAI recommended for development)

### Development Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/sunscript.git
   cd sunscript
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   # Create .env file
   echo "OPENAI_API_KEY=your-api-key-here" > .env
   ```

4. **Build the Project**
   ```bash
   npm run build
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

6. **Start Development**
   ```bash
   npm run dev
   ```

## 🛠️ Development Workflow

### Branch Naming Convention

Use descriptive branch names with prefixes:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements

Examples:
```bash
git checkout -b feature/add-rust-target
git checkout -b fix/parser-error-recovery
git checkout -b docs/update-api-reference
```

### Commit Message Format

Use conventional commit format:
```
type(scope): brief description

Detailed explanation of what was changed and why.

Fixes #123
```

Types:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

Example:
```
feat(parser): add error recovery for missing braces

Implement comprehensive error recovery strategies for parser
to continue compilation when encountering syntax errors.
Includes synchronization points and helpful suggestions.

Fixes #456
```

## 🎯 Contribution Areas

### 1. Core Compiler
- **Parser improvements** - Error recovery, new syntax
- **Lexer enhancements** - Token recognition, performance
- **Code generators** - New target languages, optimizations
- **AI integration** - Provider support, prompt optimization

### 2. Documentation
- **API documentation** - Method signatures, examples
- **Tutorials** - Step-by-step guides, use cases
- **Examples** - Sample applications, patterns
- **Troubleshooting** - Common issues, solutions

### 3. Testing
- **Unit tests** - Component testing, edge cases
- **Integration tests** - End-to-end workflows
- **Performance tests** - Benchmarking, optimization
- **Security tests** - Vulnerability testing

### 4. Tooling
- **IDE integration** - Language server features
- **CLI improvements** - New commands, better UX
- **Build tools** - Optimization, packaging
- **Development tools** - Debugging, profiling

## 📝 Code Style Guidelines

### TypeScript Standards
- Use **strict TypeScript** with all type checks enabled
- **Document public APIs** with TSDoc comments
- **Prefer explicit types** over `any`
- **Use meaningful variable names**

### Code Formatting
```bash
# Auto-format code
npm run format

# Lint code
npm run lint
```

### Error Handling
- Use **SunScriptError** classes for domain errors
- Provide **helpful error messages** with suggestions
- Include **context information** in errors
- Implement **error recovery** where possible

Example:
```typescript
if (!filePath.endsWith('.sun')) {
  throw new FileSystemError(
    ErrorCode.INVALID_PATH, 
    'File must have .sun extension',
    {
      filePath,
      suggestions: ['Rename the file to have a .sun extension']
    }
  );
}
```

### Testing Standards
- **Write tests** for all new features
- **Maintain coverage** above 80%
- **Test error cases** and edge conditions
- **Use descriptive test names**

Example:
```typescript
describe('SunScriptParser', () => {
  test('should recover from missing function brace', async () => {
    const source = `function test\n  some content\n}`;
    const parser = new Parser(tokens, source);
    const result = parser.parse();
    
    expect(result.metadata.parseErrors).toHaveLength(1);
    expect(result.metadata.parseErrors[0].message).toContain('Missing');
    expect(result.body).toHaveLength(1); // Should still parse function
  });
});
```

## 🔒 Security Guidelines

### Input Validation
- **Validate all user inputs** including file paths
- **Sanitize data** before processing
- **Use secure file operations** from `src/security/`
- **Prevent path traversal** attacks

### AI Provider Safety
- **Validate AI responses** before executing
- **Limit prompt sizes** to prevent abuse
- **Rate limit requests** to prevent quota exhaustion
- **Sanitize generated code** before compilation

### Command Execution
- **Use secure shell manager** for external commands
- **Whitelist allowed commands** only
- **Validate command arguments**
- **Prevent command injection**

## 📋 Pull Request Process

### Before Submitting
1. **Create an issue** for discussion (for major changes)
2. **Write tests** for your changes
3. **Update documentation** if needed
4. **Run full test suite** and ensure it passes
5. **Check code formatting** with `npm run lint`

### PR Description Template
```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No new warnings or errors

## Related Issues
Fixes #(issue number)
```

### Review Process
1. **Automated checks** must pass (CI/CD)
2. **Code review** by maintainers
3. **Testing verification** on multiple platforms
4. **Documentation review** if applicable
5. **Final approval** and merge

## 🏗️ Architecture Overview

### Project Structure
```
src/
├── ai/                 # AI provider integrations
├── cli/                # Command line interface
├── compiler/           # Core compilation logic
├── debugging/          # Debugging tools
├── errors/             # Error handling system
├── generator/          # Code generation
├── incremental/        # Incremental compilation
├── lexer/              # Lexical analysis
├── parser/             # Syntax analysis
├── reverse/            # Reverse compilation
├── security/           # Security validation
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── validation/         # Input validation
```

### Key Components
- **Lexer**: Tokenizes SunScript source code
- **Parser**: Builds Abstract Syntax Tree with error recovery
- **AI Providers**: Interface with OpenAI, Anthropic, local LLMs
- **Code Generators**: Transform AST to target languages
- **Security Layer**: Validates inputs and prevents vulnerabilities

## 🤝 Community Guidelines

### Code of Conduct
- **Be respectful** and inclusive
- **Focus on constructive feedback**
- **Help newcomers** learn and contribute
- **Maintain professional communication**

### Getting Help
- **Discord Community**: Real-time chat and support
- **GitHub Discussions**: Long-form discussions
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides and references

### Recognition
- **Contributors** are credited in release notes
- **Significant contributions** are highlighted
- **Community members** may become maintainers
- **Annual contributor awards** for outstanding work

## 📞 Contact

- **General Questions**: Discord community
- **Security Issues**: security@aw3.tech
- **Commercial Licensing**: will.schulz@aw3.tech
- **Partnership Inquiries**: partnerships@aw3.tech

## 📚 Resources

- [Language Specification](../language/specification.md)
- [Compiler Architecture](../compiler/architecture.md)
- [API Reference](../api/compiler.md)
- [Troubleshooting Guide](../troubleshooting/faq.md)

---

Thank you for contributing to SunScript! Your contributions help make AI-native programming accessible to developers worldwide.

**© 2025 AW3 Technology, Inc. All Rights Reserved.**