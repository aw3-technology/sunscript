# GitHub Project Import

## Overview

SunScript can import any GitHub repository and reverse-compile it into natural language SunScript code. This powerful feature uses AI to analyze existing code and generate readable, maintainable SunScript equivalents.

## Usage

```bash
sunscript import <github-url> [options]
```

### Options

- `-s, --source <dir>`: Directory for generated SunScript files (default: `./src`)
- `-o, --output <dir>`: Directory for original code (default: `./imported`)
- `--no-comments`: Exclude generated comments and headers

## Examples

### Import a JavaScript library
```bash
sunscript import https://github.com/lodash/lodash
```

### Import with custom directories
```bash
sunscript import https://github.com/facebook/react -s ./sunscript-src -o ./react-original
```

### Import without comments
```bash
sunscript import https://github.com/expressjs/express --no-comments
```

## What Happens During Import

1. **Repository Download**: Clones the GitHub repository to your local machine
2. **Code Analysis**: Uses AI to analyze the project structure, dependencies, and functionality
3. **Reverse Compilation**: Converts existing code into natural language SunScript
4. **Genesis Generation**: Creates a `genesis.sun` file with project configuration
5. **File Organization**: Organizes files into source and output directories

## Import Process

### 1. Repository Analysis
The system analyzes:
- Project type (library, application, component)
- Programming language(s) used
- Dependencies and external libraries
- Main entry points and functionality
- Architectural patterns

### 2. Code Conversion
Each source file is converted by:
- Parsing the original code structure
- Identifying functions, classes, and modules
- Using AI to understand the purpose and logic
- Generating natural language descriptions
- Creating equivalent SunScript syntax

### 3. Output Structure
```
project-root/
├── genesis.sun              # Generated project configuration
├── src/                     # Generated SunScript files
│   ├── utils.sun
│   ├── components/
│   │   ├── header.sun
│   │   └── footer.sun
│   └── api/
│       └── routes.sun
└── imported/                # Original source code
    ├── package.json
    ├── src/
    │   ├── utils.js
    │   └── components/
    └── README.md
```

## Generated SunScript Example

Original JavaScript:
```javascript
function calculateTax(amount, rate) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  return amount * (rate / 100);
}
```

Generated SunScript:
```sunscript
function calculateTax {
    accept the purchase amount and tax rate as parameters
    validate that the amount is greater than zero
    if amount is invalid, throw an error message
    calculate the tax by multiplying amount by rate percentage
    return the calculated tax amount
    ?? should we add support for different tax types?
}
```

## Supported Languages

- **JavaScript/TypeScript**: Full support with React, Node.js, etc.
- **Python**: Functions, classes, modules
- **Java**: Basic class and method analysis
- **Go**: Function and package analysis
- **Generic**: Pattern-based analysis for other languages

## Generated Genesis File

The import process creates a complete `genesis.sun` file:

```sunscript
@project "Imported Project Name"
@version "1.0.0"
@author "Imported from https://github.com/owner/repo"
@source "./src"
@output "./build"
@context library development

imports {
    utils.sun as Utils
    components/header.sun as Header
}

config {
    preserveOriginal: true
    importedFrom: "https://github.com/owner/repo"
}

build {
    targets: ["javascript", "typescript"]
}

dependencies {
    external: {
        "lodash": "^4.17.21"
        "express": "^4.18.0"
    }
}
```

## Best Practices

1. **Review Generated Code**: Always review the generated SunScript for accuracy
2. **Update Descriptions**: Refine the natural language descriptions as needed
3. **Add Context**: Update the `@context` directive for better AI understanding
4. **Test Compilation**: Run `sunscript let there be light` to verify the conversion
5. **Preserve Original**: Keep the original code for reference and comparison

## Limitations

- **Complex Logic**: Very complex algorithms may need manual refinement
- **Framework-Specific**: Some framework-specific patterns might not translate perfectly
- **Performance**: Large repositories may take several minutes to process
- **API Dependencies**: Requires OpenAI API access for code analysis

## Troubleshooting

### Git Not Found
```bash
# Install git if not available
brew install git  # macOS
sudo apt install git  # Ubuntu/Debian
```

### API Key Issues
```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-key-here"
# Or create a .env file with OPENAI_API_KEY=your-key-here
```

### Large Repository Timeout
For very large repositories, consider:
- Using `--no-comments` to speed up processing
- Importing specific branches or subdirectories
- Breaking the import into smaller chunks

## Next Steps

After importing a project:

1. **Review**: Examine the generated SunScript files
2. **Refine**: Update descriptions and add missing context
3. **Compile**: Run `sunscript let there be light` to generate code
4. **Test**: Verify the compiled code works as expected
5. **Iterate**: Refine the SunScript and recompile as needed

The import feature makes it easy to modernize existing codebases and learn from open-source projects by converting them into readable, natural language SunScript.