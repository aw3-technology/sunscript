# Incremental Compilation

## Overview

SunScript supports intelligent incremental compilation that only regenerates the parts of your code that have actually changed. This dramatically speeds up development by avoiding full project rebuilds for small changes.

## How It Works

### Change Detection
The incremental compiler:
1. **Calculates file hashes** to detect which files have changed
2. **Analyzes code elements** (functions, components, etc.) to identify specific changes
3. **Tracks dependencies** between elements to find what needs updating
4. **Caches compilation results** to avoid redundant work

### Smart Rebuilding
Instead of recompiling everything:
- **Element-level changes**: Only regenerate the changed function or component
- **Dependency updates**: Update dependent elements automatically
- **File structure preservation**: Maintain the same output file structure
- **Incremental writes**: Only modify the parts of output files that changed

## Usage

### CLI Commands

#### Automatic Incremental (Default)
```bash
# Incremental compilation is enabled by default
sunscript let there be light

# Regular genesis command also uses incremental
sunscript genesis
```

#### Force Full Build
```bash
# Disable incremental compilation for a fresh build
sunscript let there be light --full
sunscript genesis --full
```

#### Watch Mode
```bash
# Enable watch mode with incremental compilation
sunscript let there be light --watch
sunscript genesis --watch
```

#### Cache Management
```bash
# Clear the incremental compilation cache
sunscript let there be light --clear-cache
sunscript genesis --clear-cache
```

#### Verbose Output
```bash
# See detailed incremental compilation information
sunscript let there be light -v
sunscript genesis --verbose
```

## How Changes Are Detected

### File-Level Changes
- **New files**: Trigger complete compilation for that file
- **Modified files**: Analyze for element-level changes
- **Deleted files**: Remove corresponding output files

### Element-Level Changes
- **Function changes**: Regenerate only the specific function
- **Component modifications**: Update the component and its dependents
- **New elements**: Add to existing output files
- **Deleted elements**: Remove from output files

### Dependency Tracking
```sunscript
function calculateTax {
    use the utility function formatCurrency
    return formatted tax amount
}

function displayTotal {
    use calculateTax to get tax amount
    show final total with tax
}
```

If `calculateTax` changes, `displayTotal` is automatically updated too.

## Cache System

### Cache Location
The incremental compilation cache is stored in:
```
project-root/.sunscript-cache.json
```

### Cache Contents
- **File metadata**: Hashes, modification times, elements
- **Element information**: Functions, components, dependencies
- **Dependency graph**: What depends on what
- **Output mappings**: Which source elements map to which output

### Cache Management
```bash
# View cache status (verbose mode shows cache info)
sunscript genesis -v

# Clear cache if corrupted or for fresh start
sunscript genesis --clear-cache

# Cache is automatically invalidated when:
# - Major version changes
# - Project structure changes
# - Genesis.sun configuration changes
```

## Performance Benefits

### Speed Improvements
- **Small changes**: 90%+ faster compilation
- **Single function edit**: Seconds instead of minutes
- **No changes**: Instant with cache hit
- **Large projects**: Dramatic time savings

### Development Workflow
```bash
# First build (full compilation)
sunscript let there be light
# ⏱️ 45 seconds, 50 files compiled

# Edit one function
# ... make changes to src/utils.sun ...

# Incremental build
sunscript let there be light
# ⚡ 2 seconds, 1 file updated, 3 dependents refreshed
```

### Watch Mode Benefits
```bash
# Start watch mode
sunscript let there be light --watch

# Save any .sun file
# ⚡ Automatic incremental build in background
# 📄 File saved, no changes detected (if no real changes)
# 🔄 Incremental build: 1 modified in 850ms (if changes detected)
```

## When Full Builds Occur

The system automatically switches to full builds when:

1. **High change ratio**: >20% of files changed
2. **Structural changes**: New files, deleted files
3. **Dependency changes**: New imports or exports
4. **Cache issues**: Corrupted or missing cache
5. **Force flag**: `--full` option used
6. **First build**: No existing cache

## Output File Management

### Incremental Updates
Original output file:
```javascript
// Generated functions
function calculateTax(amount, rate) { /* ... */ }
function formatCurrency(value) { /* ... */ }
function displayTotal(items) { /* ... */ }
```

After changing only `calculateTax`:
```javascript
// Generated functions
function calculateTax(amount, rate) { /* NEW IMPLEMENTATION */ }
function formatCurrency(value) { /* ... unchanged ... */ }
function displayTotal(items) { /* UPDATED - depends on calculateTax */ }
```

### Section-Based Updates
Output files are divided into logical sections:
- **Imports**: External dependencies
- **Functions**: Individual function implementations
- **Classes/Components**: Component definitions
- **Exports**: Module exports

Only changed sections are regenerated and updated.

## Best Practices

### Optimize for Incremental Builds
1. **Modular design**: Keep functions focused and independent
2. **Clear dependencies**: Make element relationships obvious
3. **Stable interfaces**: Avoid changing function signatures frequently
4. **Logical organization**: Group related functionality together

### Debugging Incremental Issues
```bash
# Force full build to rule out incremental issues
sunscript genesis --full

# Clear cache and rebuild
sunscript genesis --clear-cache

# Use verbose mode to see what's being updated
sunscript genesis -v
```

### Development Workflow
1. **Start with watch mode** for active development
2. **Use regular builds** for testing and deployment
3. **Force full builds** when in doubt
4. **Clear cache** when changing project structure

## Troubleshooting

### Cache Issues
If you experience unexpected behavior:
```bash
# Clear cache and rebuild
sunscript genesis --clear-cache --full
```

### Missing Dependencies
If dependent elements aren't updating:
```bash
# Verbose mode shows dependency detection
sunscript genesis -v

# Force full build to regenerate all dependencies
sunscript genesis --full
```

### Performance Problems
If incremental builds seem slow:
```bash
# Check if many files are changing
sunscript genesis -v

# Consider if full build might be faster
sunscript genesis --full
```

## Configuration

### Project-Level Settings
In your `genesis.sun` file:
```sunscript
config {
    incrementalBuild: true
    cacheTimeout: 86400  # 24 hours in seconds
    dependencyTracking: "smart"
}
```

### Environment Variables
```bash
# Disable incremental compilation globally
export SUNSCRIPT_NO_INCREMENTAL=true

# Increase verbosity for debugging
export SUNSCRIPT_VERBOSE=true
```

## Technical Details

### Change Detection Algorithm
1. **File scanning**: Check modification times and hashes
2. **Content analysis**: Parse changed files for elements
3. **Dependency resolution**: Build dependency graph
4. **Impact analysis**: Determine what needs regeneration
5. **Incremental generation**: Generate only changed parts

### Cache Format
The cache stores:
```json
{
  "version": "1.0.0",
  "files": {
    "src/utils.sun": {
      "hash": "abc123...",
      "elements": {
        "calculateTax": {
          "hash": "def456...",
          "dependencies": ["formatCurrency"],
          "outputFiles": ["dist/utils.js"]
        }
      }
    }
  }
}
```

This intelligent incremental compilation system makes SunScript development fast and efficient, especially for large projects where only small changes are being made frequently.