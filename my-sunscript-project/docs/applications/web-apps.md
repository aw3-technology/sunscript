# Building Web Applications with SunScript

This guide covers everything you need to know about building modern web applications using SunScript, from simple static sites to complex single-page applications.

## Table of Contents

- [Overview](#overview)
- [Project Setup](#project-setup)
- [Frontend Applications](#frontend-applications)
- [Full-Stack Applications](#full-stack-applications)
- [Real-Time Applications](#real-time-applications)
- [Progressive Web Apps](#progressive-web-apps)
- [Performance Optimization](#performance-optimization)
- [Deployment](#deployment)

## Overview

SunScript excels at building web applications because it allows you to describe user interfaces and business logic in natural language, which the AI compiler transforms into efficient, modern web code.

### What You Can Build

- 🌐 **Static websites** with dynamic content
- 📱 **Single-page applications** (SPAs)
- 🏪 **E-commerce platforms** with payment processing
- 📊 **Dashboards and analytics** tools
- 💬 **Real-time chat applications**
- 🎮 **Interactive games and experiences**
- 📝 **Content management systems**
- 🔐 **Authentication and user management**

### Supported Frameworks

SunScript can generate code for popular web frameworks:

| Framework | Target | Best For |
|-----------|---------|----------|
| **React** | TypeScript/JavaScript | Component-based SPAs |
| **Vue.js** | TypeScript/JavaScript | Progressive enhancement |
| **Angular** | TypeScript | Enterprise applications |
| **Svelte** | JavaScript | Performance-critical apps |
| **Vanilla JS** | JavaScript | Simple sites, widgets |
| **Web Components** | JavaScript | Reusable components |

## Project Setup

### 1. Initialize Web Application Project

Create a new SunScript web application:

```bash
mkdir my-web-app
cd my-web-app
```

### 2. Create Genesis Configuration

Create `genesis.sun` for web application setup:

```sunscript
project MyWebApp {
    description: "Modern web application built with SunScript"
    target: typescript, javascript
    framework: react
    output: "./dist"
    entry: "./src/main.sun"
    environment: web
}

dependencies {
    frontend: "react, react-dom, react-router-dom"
    styling: "tailwindcss, styled-components"
    state: "zustand, react-query"
    ui: "shadcn/ui, lucide-react"
    build: "vite, typescript"
    testing: "vitest, testing-library"
}

structure {
    components: "./src/components"
    pages: "./src/pages"
    hooks: "./src/hooks"
    utils: "./src/utils"
    styles: "./src/styles"
    assets: "./src/assets"
}

features {
    routing: "client-side routing with React Router"
    state_management: "global state with Zustand"
    authentication: "JWT-based user authentication"
    api_integration: "REST API client with error handling"
    responsive_design: "mobile-first responsive layout"
    accessibility: "WCAG 2.1 AA compliance"
    performance: "code splitting and lazy loading"
    seo: "meta tags and Open Graph support"
}

environments {
    development {
        api_url: "http://localhost:3001"
        debug: true
        hot_reload: true
    }
    
    production {
        api_url: ${API_URL}
        debug: false
        minify: true
        tree_shake: true
    }
}
```

### 3. Initialize Project

```bash
sunscript let there be light --genesis genesis.sun
```

This creates a complete project structure:

```
my-web-app/
├── genesis.sun
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   ├── assets/
│   └── main.sun
├── public/
│   ├── index.html
│   └── favicon.ico
├── dist/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Frontend Applications

### 1. Application Shell

Create `src/main.sun`:

```sunscript
@target react
@framework modern
@typescript strict

function createApp {
    Create the main application component with:
    
    Router setup:
    - React Router for client-side navigation
    - Protected routes for authenticated users
    - Lazy loading for code splitting
    - Error boundaries for graceful error handling
    
    Global providers:
    - Theme provider for consistent styling
    - Authentication context for user state
    - API client context for data fetching
    - Error toast notifications
    
    Layout structure:
    - Header with navigation and user menu
    - Main content area with sidebar (if needed)
    - Footer with links and information
    - Loading states and skeleton UI
    
    Performance optimizations:
    - React.lazy for route-based code splitting
    - React.memo for component optimization
    - useMemo and useCallback for expensive operations
    - Intersection Observer for lazy image loading
}

function main {
    Initialize and render the React application
    Set up error boundaries and performance monitoring
    Configure development tools in development mode
    Mount the app to the DOM root element
}
```

### 2. Reusable Components

Create `src/components/ui/Button.sun`:

```sunscript
@component react
@typescript interface
@accessible design

component Button {
    Create a flexible, accessible button component with:
    
    Variants:
    - Primary, secondary, outline, ghost styles
    - Different sizes: small, medium, large
    - Icon support with proper spacing
    - Loading state with spinner
    - Disabled state with visual feedback
    
    Accessibility:
    - Proper ARIA labels and roles
    - Keyboard navigation support
    - Focus management and indicators
    - Screen reader compatibility
    
    Props interface:
    - variant: 'primary' | 'secondary' | 'outline' | 'ghost'
    - size: 'sm' | 'md' | 'lg'
    - disabled: boolean
    - loading: boolean
    - icon: React component
    - onClick: event handler
    - children: button content
    
    Styling:
    - Tailwind CSS classes for consistency
    - Hover and focus states
    - Smooth transitions
    - Responsive design
}
```

Create `src/components/ui/Modal.sun`:

```sunscript
@component react
@accessible modal
@focus management

component Modal {
    Create an accessible modal dialog component with:
    
    Features:
    - Overlay with backdrop blur
    - Center-positioned content
    - Close button and ESC key handling
    - Click outside to close (optional)
    - Scroll lock when open
    - Animation for smooth open/close
    
    Accessibility:
    - Focus trap within modal
    - Return focus to trigger element
    - ARIA modal and labelledby attributes
    - ESC key to close
    - Screen reader announcements
    
    Props:
    - isOpen: boolean state
    - onClose: close handler
    - title: modal title
    - size: 'sm' | 'md' | 'lg' | 'xl'
    - closeable: allow closing
    - children: modal content
    
    Implementation:
    - React Portal for proper rendering
    - useEffect for body scroll lock
    - useRef for focus management
    - Custom hook for ESC key handling
}
```

### 3. Page Components

Create `src/pages/HomePage.sun`:

```sunscript
@page component
@seo optimized
@responsive design

component HomePage {
    Create the main landing page with:
    
    Hero section:
    - Compelling headline and subheading
    - Call-to-action buttons
    - Hero image or video background
    - Responsive design for all devices
    
    Features section:
    - Grid layout of key features
    - Icons and descriptions
    - Benefits-focused content
    - Smooth scroll animations
    
    Testimonials section:
    - Customer testimonials carousel
    - Star ratings and reviews
    - Customer photos and names
    - Auto-advancing slider
    
    CTA section:
    - Final call-to-action
    - Sign-up form or contact button
    - Social proof elements
    - Newsletter subscription
    
    SEO optimization:
    - Meta tags for search engines
    - Structured data markup
    - Open Graph tags for social sharing
    - Optimized images with alt text
    
    Performance:
    - Lazy loading for images
    - Optimized font loading
    - Minimal JavaScript bundles
    - Critical CSS inlining
}
```

Create `src/pages/DashboardPage.sun`:

```sunscript
@page protected
@data visualization
@real-time updates

component DashboardPage {
    Create a comprehensive dashboard page with:
    
    Layout:
    - Sidebar navigation with collapsible menu
    - Top header with user info and notifications
    - Main content area with dashboard widgets
    - Responsive grid layout for widgets
    
    Widgets:
    - Key metrics cards with trends
    - Interactive charts and graphs
    - Recent activity feed
    - Quick action buttons
    - Data tables with sorting and filtering
    
    Data management:
    - Real-time data updates via WebSocket
    - Loading skeletons while fetching data
    - Error states with retry functionality
    - Caching for better performance
    
    Interactivity:
    - Date range picker for filtering
    - Export functionality for reports
    - Drill-down capabilities for detailed views
    - Customizable widget arrangement
    
    State management:
    - Global state for user preferences
    - Local state for UI interactions
    - Optimistic updates for better UX
    - Sync with backend APIs
}
```

### 4. Custom Hooks

Create `src/hooks/useAuth.sun`:

```sunscript
@hook react
@authentication
@error handling

function useAuth {
    Create a comprehensive authentication hook with:
    
    State management:
    - Current user information
    - Authentication status (loading, authenticated, unauthenticated)
    - Error states and messages
    - Token expiration handling
    
    Authentication methods:
    - Login with email/password
    - Social login (Google, GitHub, etc.)
    - Password reset functionality
    - Account registration
    - Logout with cleanup
    
    Token management:
    - JWT token storage in httpOnly cookies
    - Automatic token refresh
    - Token expiration detection
    - Secure token transmission
    
    API integration:
    - Axios interceptors for token attachment
    - Automatic retry on 401 errors
    - Request queuing during token refresh
    - Error handling and user feedback
    
    Security features:
    - CSRF protection
    - XSS prevention
    - Secure storage practices
    - Session timeout handling
    
    Return interface:
    - user: current user object
    - isLoading: authentication check status
    - isAuthenticated: boolean status
    - login, logout, register functions
    - error: authentication errors
}
```

Create `src/hooks/useAPI.sun`:

```sunscript
@hook data fetching
@error handling
@caching

function useAPI {
    Create a powerful data fetching hook with:
    
    Features:
    - GET, POST, PUT, DELETE operations
    - Automatic loading states
    - Error handling with retry logic
    - Request cancellation on component unmount
    - Optimistic updates for mutations
    
    Caching:
    - In-memory cache for GET requests
    - Cache invalidation strategies
    - Background refetching
    - Stale-while-revalidate pattern
    
    Error handling:
    - Network error detection
    - HTTP error status handling
    - User-friendly error messages
    - Retry with exponential backoff
    
    Performance:
    - Request deduplication
    - Debounced requests for search
    - Pagination support
    - Infinite loading capabilities
    
    Integration:
    - TypeScript support for type safety
    - Custom error boundaries
    - Loading skeleton support
    - Offline detection and queuing
    
    Usage patterns:
    - RESTful API endpoints
    - GraphQL queries (optional)
    - Real-time subscriptions
    - File upload progress
}
```

## Full-Stack Applications

### 1. Backend API

Create `src/api/server.sun`:

```sunscript
@target node
@framework express
@database postgresql

function createAPIServer {
    Create a comprehensive REST API server with:
    
    Server setup:
    - Express.js with TypeScript
    - CORS configuration for frontend
    - Rate limiting and security middleware
    - Request logging and monitoring
    - Health check endpoints
    
    Authentication:
    - JWT-based authentication
    - Password hashing with bcrypt
    - Role-based access control
    - Session management
    - OAuth2 integration (optional)
    
    Database integration:
    - PostgreSQL with Prisma ORM
    - Connection pooling
    - Migration management
    - Seed data for development
    - Database health monitoring
    
    API endpoints:
    - RESTful resource endpoints
    - Input validation with Joi/Zod
    - Error handling middleware
    - Response formatting
    - API versioning support
    
    File handling:
    - File upload with multer
    - Image processing and optimization
    - Cloud storage integration (AWS S3)
    - File validation and security
    
    Real-time features:
    - WebSocket support with Socket.io
    - Real-time notifications
    - Live data updates
    - Connection management
    
    Security:
    - Input sanitization
    - SQL injection prevention
    - XSS protection
    - CSRF tokens
    - Security headers
}
```

### 2. Database Models

Create `src/api/models/User.sun`:

```sunscript
@model database
@validation strict
@security hashing

function defineUserModel {
    Create a comprehensive User model with:
    
    Schema definition:
    - id: unique identifier (UUID)
    - email: unique email address
    - password: hashed password
    - firstName, lastName: user names
    - role: user role (admin, user, etc.)
    - profilePicture: avatar URL
    - emailVerified: verification status
    - createdAt, updatedAt: timestamps
    
    Validations:
    - Email format validation
    - Password strength requirements
    - Name length constraints
    - Role enum validation
    - URL validation for profile picture
    
    Methods:
    - hashPassword: secure password hashing
    - comparePassword: password verification
    - generateJWT: token creation
    - toPublicJSON: safe user data
    - updateProfile: profile management
    
    Relationships:
    - User posts (one-to-many)
    - User sessions (one-to-many)
    - User roles (many-to-many)
    - User preferences (one-to-one)
    
    Security features:
    - Password hashing with salt
    - Sensitive field exclusion
    - Input sanitization
    - SQL injection prevention
}
```

### 3. API Routes

Create `src/api/routes/auth.sun`:

```sunscript
@routes authentication
@validation input
@security jwt

function createAuthRoutes {
    Create comprehensive authentication routes:
    
    POST /auth/register:
    - User registration with validation
    - Password hashing and storage
    - Email verification sending
    - Welcome email dispatch
    - Rate limiting for signup attempts
    
    POST /auth/login:
    - Credential validation
    - Password verification
    - JWT token generation
    - Session creation
    - Login attempt logging
    
    POST /auth/logout:
    - Token invalidation
    - Session cleanup
    - Secure cookie clearing
    - Logout event logging
    
    POST /auth/refresh:
    - Token refresh mechanism
    - Expired token handling
    - New token generation
    - Security validation
    
    POST /auth/forgot-password:
    - Password reset initiation
    - Reset token generation
    - Email sending with reset link
    - Rate limiting for reset requests
    
    POST /auth/reset-password:
    - Reset token validation
    - New password setting
    - Password strength checking
    - Account security notification
    
    GET /auth/verify-email:
    - Email verification handling
    - Token validation
    - Account activation
    - Redirect to success page
    
    Security measures:
    - Input validation and sanitization
    - Rate limiting per endpoint
    - CSRF protection
    - Secure headers
    - Error message consistency
}
```

## Real-Time Applications

### 1. WebSocket Server

Create `src/api/websocket.sun`:

```sunscript
@websocket server
@real-time events
@scalable architecture

function createWebSocketServer {
    Create a scalable WebSocket server with:
    
    Connection management:
    - Client connection handling
    - Authentication for WebSocket connections
    - Connection heartbeat and keepalive
    - Graceful disconnection handling
    - Connection pooling and scaling
    
    Event system:
    - Custom event types and handlers
    - Event broadcasting to multiple clients
    - Room-based event distribution
    - Private messaging capabilities
    - Event persistence and replay
    
    Real-time features:
    - Live chat messaging
    - Collaborative editing
    - Real-time notifications
    - Live data updates
    - Typing indicators
    - Presence detection (online/offline)
    
    Performance optimization:
    - Message queuing for offline users
    - Rate limiting for message sending
    - Compression for large messages
    - Connection clustering for scaling
    - Memory management for connections
    
    Security:
    - Message validation and sanitization
    - Rate limiting per user
    - Spam detection and prevention
    - Secure message transmission
    - User permission checking
}
```

### 2. Real-Time Components

Create `src/components/LiveChat.sun`:

```sunscript
@component real-time
@websocket integration
@accessibility

component LiveChat {
    Create a comprehensive live chat component with:
    
    UI features:
    - Message list with virtual scrolling
    - Message input with rich text support
    - Emoji picker and reactions
    - File sharing and image preview
    - Typing indicators
    - Online user list
    - Message search functionality
    
    Real-time functionality:
    - WebSocket connection management
    - Automatic reconnection on disconnect
    - Message sending and receiving
    - Delivery and read receipts
    - Typing status broadcasting
    - User presence updates
    
    Message features:
    - Text formatting (bold, italic, links)
    - Code snippets with syntax highlighting
    - Image and file attachments
    - Message editing and deletion
    - Message reactions and likes
    - Reply to specific messages
    
    State management:
    - Message history loading
    - Optimistic message updates
    - Connection status tracking
    - Error state handling
    - Message persistence
    
    Accessibility:
    - Keyboard navigation
    - Screen reader support
    - ARIA labels and roles
    - Focus management
    - High contrast mode support
}
```

## Progressive Web Apps

### 1. Service Worker

Create `src/serviceWorker.sun`:

```sunscript
@service-worker
@offline-first
@caching strategy

function createServiceWorker {
    Create a comprehensive service worker with:
    
    Caching strategies:
    - Cache-first for static assets
    - Network-first for API calls
    - Stale-while-revalidate for content
    - Cache-only for offline fallbacks
    - Custom caching rules per route
    
    Asset caching:
    - HTML, CSS, JavaScript files
    - Images and fonts
    - API responses
    - User-generated content
    - Critical resources prioritization
    
    Offline functionality:
    - Offline page for network failures
    - Background sync for failed requests
    - Queue API calls when offline
    - Offline indicators in UI
    - Data synchronization when online
    
    Update management:
    - Service worker update detection
    - User notification for updates
    - Graceful cache migration
    - Version-based cache management
    - Force update mechanism
    
    Performance features:
    - Resource preloading
    - Critical resource caching
    - Lazy loading optimization
    - Cache size management
    - Performance monitoring
}
```

### 2. PWA Manifest

Create `src/manifest.sun`:

```sunscript
@pwa manifest
@mobile optimization
@app installation

function createPWAManifest {
    Generate a comprehensive PWA manifest with:
    
    App identity:
    - App name and short name
    - Description and purpose
    - Developer information
    - App categories and keywords
    
    Visual design:
    - App icons for all platforms
    - Theme and background colors
    - Splash screen configuration
    - Status bar styling
    - Orientation preferences
    
    Installation features:
    - Add to home screen prompts
    - Custom install UI
    - Install criteria checking
    - Post-install onboarding
    - App shortcuts
    
    Platform integration:
    - Share target registration
    - File handling capabilities
    - Protocol handlers
    - URL patterns
    - Scope definition
    
    Performance settings:
    - Start URL optimization
    - Display mode (standalone, fullscreen)
    - Orientation lock
    - Navigation scope
    - Deep linking support
}
```

## Performance Optimization

### 1. Code Splitting

Create `src/utils/lazyLoading.sun`:

```sunscript
@optimization
@code-splitting
@performance

function implementCodeSplitting {
    Create comprehensive code splitting with:
    
    Route-based splitting:
    - Lazy load pages with React.lazy
    - Loading fallbacks and error boundaries
    - Preload critical routes
    - Route prioritization
    
    Component-based splitting:
    - Split large components
    - Lazy load modals and overlays
    - Dynamic import for heavy features
    - Conditional component loading
    
    Library splitting:
    - Separate vendor bundles
    - Dynamic polyfill loading
    - Tree shaking optimization
    - Bundle size monitoring
    
    Asset optimization:
    - Image lazy loading
    - Font loading optimization
    - CSS code splitting
    - Critical CSS extraction
    
    Performance monitoring:
    - Bundle analysis and visualization
    - Loading performance metrics
    - User experience monitoring
    - Performance budgets
}
```

### 2. State Optimization

Create `src/store/optimizedStore.sun`:

```sunscript
@state-management
@performance
@memory optimization

function createOptimizedStore {
    Create a performance-optimized state store with:
    
    Store structure:
    - Normalized state shape
    - Selector memoization
    - Action batching
    - Middleware for logging and persistence
    
    Performance features:
    - Shallow comparison for updates
    - Debounced state updates
    - Selective re-renders
    - Memory leak prevention
    
    Data fetching:
    - Cache management
    - Background updates
    - Optimistic updates
    - Error boundary integration
    
    Persistence:
    - Local storage integration
    - Partial state hydration
    - Migration strategies
    - Cleanup on logout
    
    Development tools:
    - Redux DevTools integration
    - Time travel debugging
    - State snapshots
    - Performance profiling
}
```

## Deployment

### 1. Build Configuration

Create `src/build/config.sun`:

```sunscript
@build-optimization
@deployment-ready
@environment-specific

function createBuildConfig {
    Create optimized build configuration with:
    
    Production optimizations:
    - Minification and compression
    - Tree shaking for unused code
    - Image optimization and WebP conversion
    - CSS purging and optimization
    - Source map generation for debugging
    
    Environment handling:
    - Environment variable injection
    - Feature flags for gradual rollouts
    - API endpoint configuration
    - Debug mode toggling
    
    Asset optimization:
    - Hashing for cache busting
    - Compression (gzip, brotli)
    - CDN optimization
    - Critical resource inlining
    
    Bundle analysis:
    - Bundle size reporting
    - Dependency analysis
    - Performance budgets
    - Unused code detection
    
    Output configuration:
    - Static file generation
    - Service worker compilation
    - PWA manifest processing
    - Asset fingerprinting
}
```

### 2. Docker Configuration

Create `Dockerfile.sun`:

```sunscript
@containerization
@production-ready
@multi-stage

function createDockerConfig {
    Create optimized Docker configuration with:
    
    Multi-stage build:
    - Build stage with Node.js and dependencies
    - Production stage with minimal runtime
    - Layer optimization for caching
    - Security scanning integration
    
    Base configuration:
    - Alpine Linux for minimal size
    - Non-root user for security
    - Health checks for container monitoring
    - Graceful shutdown handling
    
    Build optimization:
    - Dependency caching layers
    - Build artifact copying
    - Environment variable handling
    - Multi-platform support
    
    Runtime configuration:
    - Static file serving with nginx
    - Gzip compression enabled
    - Security headers
    - SSL/TLS termination
    
    Production features:
    - Log aggregation
    - Monitoring endpoints
    - Resource limits
    - Container orchestration ready
}
```

### 3. CI/CD Pipeline

Create `.github/workflows/deploy.sun`:

```sunscript
@cicd-pipeline
@automated-deployment
@quality-gates

function createDeploymentPipeline {
    Create comprehensive CI/CD pipeline with:
    
    Build stage:
    - Dependency installation and caching
    - SunScript compilation
    - Asset optimization
    - Docker image building
    
    Testing stage:
    - Unit tests with coverage
    - Integration tests
    - E2E testing with Playwright
    - Accessibility testing
    - Performance testing
    
    Quality gates:
    - Code quality checks (ESLint, Prettier)
    - Security vulnerability scanning
    - Bundle size monitoring
    - Performance budget validation
    
    Deployment stages:
    - Staging deployment for testing
    - Production deployment with rollback
    - Blue-green deployment strategy
    - Canary releases for gradual rollout
    
    Monitoring:
    - Deployment success tracking
    - Error rate monitoring
    - Performance metrics collection
    - User experience monitoring
}
```

## Best Practices

### 1. Performance Guidelines

- **Lazy load non-critical components**
- **Optimize images and use WebP format**
- **Implement proper caching strategies**
- **Use service workers for offline support**
- **Monitor Core Web Vitals**
- **Optimize bundle sizes**

### 2. Security Considerations

- **Validate all user inputs**
- **Use HTTPS everywhere**
- **Implement proper authentication**
- **Sanitize data before rendering**
- **Use Content Security Policy**
- **Regular security audits**

### 3. Accessibility Standards

- **Follow WCAG 2.1 AA guidelines**
- **Implement keyboard navigation**
- **Use semantic HTML elements**
- **Provide alternative text for images**
- **Ensure proper color contrast**
- **Test with screen readers**

---

This comprehensive guide provides everything you need to build modern, scalable web applications with SunScript. From simple static sites to complex real-time applications, SunScript's natural language approach makes web development more intuitive while maintaining professional-grade quality and performance.