# Genesis Project Structure

## Overview

SunScript projects using `genesis.sun` follow a clear separation between source code and generated output.

## Directory Structure

```
my-sunscript-project/
├── genesis.sun          # Project manifest file
├── src/                 # SunScript source directory (configurable)
│   ├── models/
│   │   ├── user.sun
│   │   └── product.sun
│   ├── components/
│   │   ├── header.sun
│   │   └── footer.sun
│   └── api/
│       └── routes.sun
└── build/              # Generated output directory (configurable)
    ├── models/
    │   ├── user.js
    │   └── product.js
    ├── components/
    │   ├── header.js
    │   └── footer.js
    └── api/
        └── routes.js
```

## Genesis.sun Configuration

The `genesis.sun` file must specify both source and output directories:

```sunscript
@project "My SunScript Project"
@version "1.0.0"
@source "./src"      # Where your .sun files live
@output "./build"    # Where generated code goes

imports {
    # Import paths are relative to the source directory
    models/user.sun as User
    components/header.sun as Header
}
```

## Key Principles

1. **Source Directory (`@source`)**: Contains all your `.sun` files
   - Default: `./src`
   - All imports are resolved relative to this directory
   - Can be any path relative to the genesis.sun file

2. **Output Directory (`@output`)**: Contains all generated code
   - Default: `./dist`
   - Maintains the same structure as the source directory
   - Completely managed by the compiler (can be safely deleted and regenerated)

3. **Import Resolution**: 
   - All import paths in `genesis.sun` are relative to the source directory
   - No need to prefix imports with the source directory path
   - Example: `models/user.sun` not `./src/models/user.sun`

## Best Practices

1. Keep genesis.sun at the project root
2. Use descriptive source directory names (`src`, `source`, `sunscript`)
3. Use standard output directory names (`build`, `dist`, `generated`)
4. Never commit the output directory to version control
5. Add the output directory to `.gitignore`

## Example .gitignore

```
# Generated output
/build/
/dist/
/generated/

# Dependencies
node_modules/

# Environment
.env
```