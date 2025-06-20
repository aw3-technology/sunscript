# SunScript Language Specification

## Overview

SunScript is an AI-native programming language that bridges natural language and traditional programming. It allows developers to write software using intuitive, natural language constructs that are compiled into efficient code in target languages like JavaScript, TypeScript, Python, and more.

## Language Philosophy

SunScript is built on three core principles:

1. **Natural Expression**: Code should read like human language
2. **AI-Assisted Development**: Leverage AI for intelligent compilation
3. **Multi-Target Flexibility**: One language, many deployment targets

## Syntax Overview

### File Structure

SunScript files use the `.sun` extension and consist of:
- Function definitions
- Component definitions
- AI directives
- Natural language expressions

```sunscript
// Basic SunScript file structure
function greeting {
    Return a friendly hello message with the user's name
}

component UserCard {
    Display user information in a card format
    Include name, email, and profile picture
}

@optimize for performance
@secure input validation
```

## Core Language Constructs

### 1. Functions

Functions are the primary building blocks in SunScript. They can be defined using natural language or structured syntax.

#### Natural Language Functions

```sunscript
function calculateTax {
    Calculate the tax amount for a given income
    Use progressive tax brackets
    Return the total tax owed
}

function sendEmail {
    Send a welcome email to new users
    Include their username and a verification link
    Handle email delivery errors gracefully
}
```

#### Structured Functions

```sunscript
function processPayment {
    // Take credit card information and amount
    Validate the credit card details
    Process the payment through the payment gateway
    
    when payment successful then {
        Send confirmation email
        Update user account balance
        Log the transaction
    }
    
    when payment fails then {
        Log the error
        Send failure notification
        Return error message to user
    }
}
```

### 2. Components

Components represent reusable UI or system elements.

#### Basic Components

```sunscript
component Button {
    A clickable button with customizable text and color
    Handle click events appropriately
    Include hover and focus states
}

component DataTable {
    Display data in a sortable, filterable table
    Support pagination for large datasets
    Allow column customization
}
```

#### Components with Properties

```sunscript
component ProductCard {
    Display product information including:
    - Product name and description
    - Price with currency formatting
    - Product image
    - Add to cart button
    
    Handle add to cart interactions
    Show loading state during actions
}
```

### 3. Natural Language Expressions

SunScript supports rich natural language expressions for business logic.

#### Conditional Logic

```sunscript
function determineShipping {
    when user location is in same country then {
        Use standard shipping rates
        Delivery time is 3-5 business days
    }
    
    when user location is international then {
        Apply international shipping rates
        Delivery time is 7-14 business days
        Add customs information
    }
    
    when order value exceeds $100 then {
        Offer free shipping upgrade
    }
}
```

#### Data Processing

```sunscript
function analyzeUserBehavior {
    Collect user interaction data from the past 30 days
    Identify patterns in browsing and purchase behavior
    Calculate engagement metrics
    Generate personalized recommendations
    Return insights formatted for dashboard display
}
```

#### API Integration

```sunscript
function fetchWeatherData {
    Call the weather API with user's location
    Parse the response data
    Extract current conditions and forecast
    Handle API errors and timeouts
    Return formatted weather information
}
```

### 4. AI Directives

AI directives provide hints to the compiler about optimization, security, and generation preferences.

#### Performance Directives

```sunscript
@optimize for speed
@cache results for 1 hour
@minimize memory usage

function searchProducts {
    Search through product catalog efficiently
    Return relevant results quickly
}
```

#### Security Directives

```sunscript
@secure input validation
@sanitize user data
@encrypt sensitive fields

function updateUserProfile {
    Safely update user profile information
    Validate all input fields
    Protect against injection attacks
}
```

#### Target-Specific Directives

```sunscript
@target javascript
@framework react
@style modern

component InteractiveChart {
    Create an interactive data visualization
    Support zoom and pan operations
    Include customizable color schemes
}
```

### 5. Data Types and Variables

#### Implicit Types

SunScript uses AI-inferred types based on context:

```sunscript
function calculateTotal {
    // AI infers: price and tax are numbers, result is number
    Calculate the total including tax for the given price
    Apply the current tax rate
    Round to two decimal places
}
```

#### Explicit Type Hints

```sunscript
function processUserData {
    // Input: user object with name, email, age
    // Output: formatted user profile string
    
    Validate user information
    Format the data for display
    Return formatted profile
}
```

### 6. Error Handling

#### Natural Error Handling

```sunscript
function saveUserData {
    Try to save user information to database
    
    when save operation fails then {
        Log the error details
        Show user-friendly error message
        Offer retry option
    }
    
    when data validation fails then {
        Highlight invalid fields
        Show specific validation messages
        Keep valid data intact
    }
}
```

#### Structured Error Handling

```sunscript
function uploadFile {
    Validate file size and type
    
    ?? What should happen if file is too large?
    // AI will generate appropriate error handling
    
    Upload file to cloud storage
    Generate public URL
    Update database with file information
}
```

## Advanced Features

### 1. AI Questions

Use `??` to ask the AI for specific implementation details:

```sunscript
function optimizeImages {
    Load images from the upload directory
    
    ?? What's the best image compression algorithm for web?
    ?? Should we generate multiple sizes for responsive design?
    
    Compress and optimize each image
    Save optimized versions
}
```

### 2. Incremental Compilation

Functions and components can reference each other:

```sunscript
function validateEmail {
    Check if email format is valid
    Verify domain exists
}

function registerUser {
    Get user registration data
    Use validateEmail to check email
    Save user to database if valid
}
```

### 3. Multi-Language Support

Generate different targets from the same source:

```sunscript
// Generates JavaScript, TypeScript, Python versions
@target javascript, typescript, python

function calculateStatistics {
    Process numerical data array
    Calculate mean, median, and standard deviation
    Return statistical summary object
}
```

## Genesis Project Configuration

### Genesis File Structure

The `genesis.sun` file configures project-wide settings:

```sunscript
project TodoApp {
    description: "A modern todo application with real-time sync"
    target: typescript, javascript
    framework: react
    database: postgresql
    deployment: vercel
}

dependencies {
    authentication: "auth0"
    ui: "tailwind, shadcn"
    state: "zustand"
    api: "trpc"
}

structure {
    components: "./src/components"
    pages: "./src/pages"  
    api: "./src/api"
    types: "./src/types"
}
```

### Environment Configuration

```sunscript
environments {
    development {
        database: "localhost:5432/todoapp_dev"
        api_url: "http://localhost:3000"
        debug: true
    }
    
    production {
        database: ${DATABASE_URL}
        api_url: ${API_URL}
        debug: false
        optimization: true
    }
}
```

## Compilation Process

### 1. Lexical Analysis
- Tokenize SunScript source code
- Handle natural language text
- Process AI directives

### 2. Parsing
- Build Abstract Syntax Tree (AST)
- Validate syntax structure
- Apply error recovery

### 3. AI Analysis
- Send natural language to AI provider
- Get structured code suggestions
- Validate AI responses

### 4. Code Generation
- Generate target language code
- Apply optimizations
- Validate output

### 5. Post-Processing
- Format generated code
- Add type definitions
- Generate documentation

## Best Practices

### 1. Function Design

**Good:**
```sunscript
function authenticateUser {
    Validate user credentials against database
    Generate secure session token
    Set appropriate cookie expiration
    Log successful authentication
}
```

**Avoid:**
```sunscript
function doStuff {
    Do various things with user data
    // Too vague for AI to understand
}
```

### 2. Component Structure

**Good:**
```sunscript
component ProductList {
    Display paginated list of products
    Include search and filter functionality
    Handle loading and error states
    Support infinite scroll or pagination
}
```

**Avoid:**
```sunscript
component Thing {
    Show stuff
    // Not descriptive enough
}
```

### 3. Error Handling

**Good:**
```sunscript
function processPayment {
    Validate payment information
    
    when validation fails then {
        Return specific validation errors
        Log failed attempt for security
    }
    
    Charge payment through gateway
    
    when payment fails then {
        Handle declined card gracefully
        Suggest alternative payment methods
    }
}
```

### 4. AI Directive Usage

**Good:**
```sunscript
@optimize for mobile performance
@secure payment processing
@test edge cases

function mobileCheckout {
    Create optimized mobile checkout flow
    Handle payment securely
    Test with various edge cases
}
```

## Language Extensions

### 1. Custom Directives

Define project-specific directives:

```sunscript
@company_standard security_review
@internal logging_required
@client_specific mobile_first

function sensitiveOperation {
    Handle sensitive data according to company standards
    Ensure comprehensive logging
    Optimize for mobile-first experience
}
```

### 2. Domain-Specific Language Features

SunScript can be extended for specific domains:

```sunscript
// E-commerce specific
@ecommerce inventory_tracking
function updateProductStock {
    Track inventory changes in real-time
    Handle backorder scenarios
    Notify when stock is low
}

// Machine Learning specific  
@ml model_training
function trainRecommendationModel {
    Prepare user behavior data
    Train collaborative filtering model
    Evaluate model performance
    Deploy if accuracy threshold met
}
```

## Version and Compatibility

- **Current Version**: 1.0.0
- **Minimum Node.js**: 16.0.0
- **Supported AI Providers**: OpenAI GPT-4, Anthropic Claude, Local LLMs
- **Target Languages**: JavaScript, TypeScript, Python, Java, Go, Rust
- **Framework Support**: React, Vue, Angular, Express, FastAPI, Django

---

*This specification is a living document and will evolve with the SunScript language.*