# Your First SunScript Application

In this tutorial, you'll build a complete Todo application using SunScript. This will teach you the core concepts of SunScript programming while creating a real, functional application.

## What You'll Build

A modern Todo application with:
- ✅ Add, edit, and delete todos
- 📋 Mark todos as complete/incomplete  
- 🔍 Filter todos (all, active, completed)
- 💾 Local storage persistence
- 📱 Responsive design
- 🎨 Modern UI with animations

## Prerequisites

- SunScript compiler installed ([Quick Start Guide](quick-start.md))
- AI provider configured (OpenAI, Anthropic, or local LLM)
- Basic understanding of web development

## Step 1: Project Setup

### Create Project Structure

```bash
mkdir sunscript-todo-app
cd sunscript-todo-app
```

### Initialize Genesis File

Create `genesis.sun`:

```sunscript
project TodoApp {
    description: "A modern todo application built with SunScript"
    target: javascript, typescript
    framework: vanilla
    output: "./dist"
    entry: "./src/main.sun"
}

dependencies {
    storage: "localStorage for data persistence"
    ui: "modern CSS with animations and responsive design"
    utilities: "date formatting, unique ID generation"
}

structure {
    components: "./src/components"
    functions: "./src/functions"
    styles: "./src/styles"
    main: "./src"
}

features {
    todo_management: "Create, read, update, delete todos"
    filtering: "Filter todos by status (all, active, completed)"
    persistence: "Save todos to localStorage"
    responsive_design: "Mobile-first responsive layout"
}
```

### Initialize Project

```bash
sunscript let there be light --genesis genesis.sun
```

This creates the project structure:

```
sunscript-todo-app/
├── genesis.sun
├── src/
│   ├── components/
│   ├── functions/
│   ├── styles/
│   └── main.sun
├── dist/
└── package.json
```

## Step 2: Define Data Models

Create `src/functions/todo-model.sun`:

```sunscript
function createTodo {
    Create a new todo item with the following properties:
    - Unique ID (use timestamp or UUID)
    - Text content from user input
    - Completed status (default false)
    - Created timestamp
    - Last modified timestamp
    
    Validate that text is not empty
    Return the new todo object
}

function updateTodo {
    Update an existing todo item
    Take todo ID and updated properties
    Preserve original created timestamp
    Update the last modified timestamp
    Validate the updated data
    Return the updated todo object
}

function deleteTodo {
    Remove a todo item by ID
    Validate that the todo exists
    Return confirmation of deletion
}

function toggleTodoComplete {
    Toggle the completed status of a todo
    Update the last modified timestamp
    Return the updated todo
}
```

## Step 3: Storage Management

Create `src/functions/storage.sun`:

```sunscript
@secure data validation
@optimize for performance

function saveTodos {
    Save the todos array to localStorage
    Serialize the data as JSON
    Handle storage errors gracefully
    Validate data before saving
    Return success/failure status
}

function loadTodos {
    Load todos from localStorage
    Parse JSON data safely
    Handle corrupted or missing data
    Validate loaded data structure
    Return array of todos or empty array if none exist
}

function clearAllTodos {
    Remove all todos from localStorage
    Confirm the operation was successful
    Return status confirmation
}

function exportTodos {
    Export todos as downloadable JSON file
    Format data for readability
    Include metadata like export date
    Handle browser download functionality
}

function importTodos {
    Import todos from uploaded JSON file
    Validate file format and structure
    Merge with existing todos (avoid duplicates)
    Handle import errors gracefully
    Return status and count of imported todos
}
```

## Step 4: Core Application Logic

Create `src/functions/todo-manager.sun`:

```sunscript
@optimize for user experience
@test edge cases thoroughly

function initializeTodoApp {
    Load existing todos from storage
    Set up the initial application state
    Initialize filter to show all todos
    Bind event listeners for user interactions
    Render the initial UI
}

function addNewTodo {
    Get text from input field
    Validate input is not empty or just whitespace
    Create new todo using createTodo function
    Add to todos array
    Save updated todos to storage
    Clear input field
    Update the UI display
    Focus back to input field
}

function editTodo {
    Find todo by ID
    Switch to edit mode for that todo
    Pre-fill edit field with current text
    Handle save and cancel operations
    Update storage when saved
    Refresh UI display
}

function removeTodo {
    Confirm deletion with user
    Find and remove todo by ID
    Update storage
    Refresh UI display
    Show confirmation message
}

function filterTodos {
    Take filter type (all, active, completed)
    Return filtered array of todos based on status
    Update UI to show only filtered todos
    Update filter button states
    Preserve current todos array
}

function getStatistics {
    Count total todos
    Count active (incomplete) todos
    Count completed todos
    Calculate completion percentage
    Return statistics object for display
}
```

## Step 5: User Interface Components

Create `src/components/todo-item.sun`:

```sunscript
@target javascript
@framework vanilla
@optimize for mobile

component TodoItem {
    Create an individual todo item component with:
    
    Layout:
    - Checkbox for completion status
    - Todo text (editable on click)
    - Edit button
    - Delete button
    - Timestamp display
    
    Interactions:
    - Click checkbox to toggle completion
    - Double-click text to edit inline
    - Hover effects for buttons
    - Smooth animations for state changes
    
    Styling:
    - Strike-through for completed todos
    - Fade effect for completed items
    - Responsive layout for mobile
    - Accessible keyboard navigation
    
    Handle all user interactions with appropriate feedback
}
```

Create `src/components/todo-list.sun`:

```sunscript
@responsive design
@accessible navigation

component TodoList {
    Create the main todo list container with:
    
    Features:
    - Display array of todo items
    - Show empty state when no todos
    - Loading state for data operations
    - Drag and drop reordering (if time permits)
    
    Layout:
    - Responsive grid/list layout
    - Smooth animations for add/remove
    - Proper spacing and typography
    - Mobile-optimized touch targets
    
    State management:
    - Track current filter state
    - Handle todo updates efficiently
    - Maintain scroll position during updates
}
```

Create `src/components/todo-filters.sun`:

```sunscript
component TodoFilters {
    Create filter buttons for todo management:
    
    Buttons:
    - "All" - show all todos
    - "Active" - show incomplete todos only
    - "Completed" - show completed todos only
    
    Features:
    - Visual indication of active filter
    - Count display for each category
    - Keyboard accessibility
    - Smooth transitions between states
    
    Styling:
    - Modern button design
    - Clear visual hierarchy
    - Mobile-friendly sizing
    - Consistent with overall app theme
}
```

## Step 6: Main Application

Create `src/main.sun`:

```sunscript
@target javascript
@framework vanilla
@optimize for performance

function createTodoApp {
    Initialize the complete todo application
    
    Setup:
    - Create main application container
    - Initialize all components
    - Set up event listeners
    - Load existing data
    - Apply initial styling
    
    Layout structure:
    - Header with app title and input
    - Filter controls
    - Todo list display
    - Footer with statistics
    - Import/export functionality
    
    Features:
    - Keyboard shortcuts (Enter to add, Escape to cancel edit)
    - Auto-save on changes
    - Responsive design for all screen sizes
    - Smooth animations and transitions
    - Error handling and user feedback
    
    Performance:
    - Efficient DOM updates
    - Debounced input handling
    - Lazy loading for large lists
    - Memory leak prevention
}

function main {
    Wait for DOM to be ready
    Create and initialize the todo application
    Set up global error handling
    Add service worker for offline functionality (optional)
    Start the application
}

// Initialize when page loads
main();
```

## Step 7: Styling

Create `src/styles/main.sun`:

```sunscript
@target css
@mobile first
@modern design

function createAppStyles {
    Generate modern CSS styles for the todo application:
    
    Base styles:
    - CSS reset and normalization
    - Custom CSS variables for theming
    - Typography using system fonts
    - Responsive breakpoints
    
    Component styles:
    - Todo item styling with hover states
    - Button styles with focus indicators
    - Input field styling
    - Filter button active states
    
    Animations:
    - Smooth transitions for all interactions
    - Fade in/out for todo additions/removals
    - Hover and focus animations
    - Loading state animations
    
    Layout:
    - Flexbox/Grid responsive layout
    - Mobile-first responsive design
    - Proper spacing and visual hierarchy
    - Accessibility-focused design
    
    Theme:
    - Modern color palette
    - Consistent spacing system
    - Clean, minimal aesthetic
    - Dark mode support (optional)
}
```

## Step 8: HTML Template

Create `src/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SunScript Todo App</title>
    <meta name="description" content="A modern todo application built with SunScript">
    
    <!-- Favicon -->
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✅</text></svg>">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    
    <!-- Styles will be injected here -->
    <style id="app-styles"></style>
</head>
<body>
    <div id="app">
        <header class="app-header">
            <h1>📝 SunScript Todo</h1>
            <p class="app-subtitle">Built with natural language programming</p>
        </header>
        
        <main class="app-main">
            <section class="todo-input-section">
                <div class="input-container">
                    <input 
                        type="text" 
                        id="todo-input" 
                        placeholder="What needs to be done?"
                        maxlength="500"
                        autocomplete="off"
                    >
                    <button id="add-btn" type="button" aria-label="Add todo">
                        <span>Add</span>
                    </button>
                </div>
            </section>
            
            <section class="todo-filters-section">
                <div id="todo-filters"></div>
                <div id="todo-stats" class="todo-stats"></div>
            </section>
            
            <section class="todo-list-section">
                <div id="todo-list" class="todo-list"></div>
                <div id="empty-state" class="empty-state" style="display: none;">
                    <p>No todos yet. Add one above to get started! 🚀</p>
                </div>
            </section>
        </main>
        
        <footer class="app-footer">
            <div class="footer-actions">
                <button id="export-btn" type="button">Export</button>
                <input type="file" id="import-input" accept=".json" style="display: none;">
                <button id="import-btn" type="button">Import</button>
                <button id="clear-all-btn" type="button">Clear All</button>
            </div>
            <p class="footer-text">
                Made with ❤️ using <a href="#" target="_blank" rel="noopener">SunScript</a>
            </p>
        </footer>
    </div>
    
    <!-- Loading indicator -->
    <div id="loading" class="loading-overlay" style="display: none;">
        <div class="loading-spinner"></div>
        <p>Generating your todo app...</p>
    </div>
    
    <!-- App scripts will be injected here -->
    <script src="./dist/main.js"></script>
</body>
</html>
```

## Step 9: Compile the Application

### Compile All Components

```bash
# Compile all SunScript files
sunscript let there be light

# Or compile individually for testing
sunscript compile src/functions/todo-model.sun --target javascript
sunscript compile src/functions/storage.sun --target javascript
sunscript compile src/functions/todo-manager.sun --target javascript
sunscript compile src/components/todo-item.sun --target javascript
sunscript compile src/components/todo-list.sun --target javascript
sunscript compile src/components/todo-filters.sun --target javascript
sunscript compile src/main.sun --target javascript
sunscript compile src/styles/main.sun --target css
```

### Generated File Structure

After compilation:

```
dist/
├── main.js              # Main application
├── functions/
│   ├── todo-model.js     # Todo data models
│   ├── storage.js        # Storage management
│   └── todo-manager.js   # Core app logic
├── components/
│   ├── todo-item.js      # Todo item component
│   ├── todo-list.js      # Todo list component
│   └── todo-filters.js   # Filter controls
└── styles/
    └── main.css          # Application styles
```

## Step 10: Test Your Application

### Start a Local Server

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server . -p 8000

# Using PHP
php -S localhost:8000
```

### Open in Browser

Navigate to `http://localhost:8000` and test:

1. ✅ **Add todos**: Type and press Enter or click Add
2. ✅ **Mark complete**: Click checkboxes
3. ✅ **Edit todos**: Double-click text to edit inline
4. ✅ **Delete todos**: Click delete button
5. ✅ **Filter todos**: Test All/Active/Completed filters
6. ✅ **Persistence**: Refresh page, todos should remain
7. ✅ **Export/Import**: Test data export and import
8. ✅ **Mobile**: Test on mobile devices

## Step 11: Enhance Your Application

### Add Advanced Features

Create `src/functions/advanced-features.sun`:

```sunscript
@optimize for user experience
@test thoroughly

function addDueDates {
    Add due date functionality to todos:
    - Date picker for setting due dates
    - Visual indicators for overdue items
    - Sort by due date option
    - Reminder notifications
}

function addCategories {
    Implement todo categories:
    - Color-coded category system
    - Filter by category
    - Category management interface
    - Drag and drop between categories
}

function addSearch {
    Implement todo search functionality:
    - Real-time search as user types
    - Search through todo text and categories
    - Highlight search terms in results
    - Search history and suggestions
}

function addKeyboardShortcuts {
    Implement useful keyboard shortcuts:
    - Ctrl+N: New todo
    - Ctrl+F: Focus search
    - Ctrl+A: Select all
    - Delete: Remove selected todos
    - Escape: Cancel current operation
}

function addBulkOperations {
    Add bulk operation capabilities:
    - Select multiple todos with checkboxes
    - Bulk complete/incomplete
    - Bulk delete with confirmation
    - Bulk category assignment
    - Bulk export of selected items
}
```

### Add Dark Mode

Create `src/components/theme-toggle.sun`:

```sunscript
@accessible design
@smooth transitions

component ThemeToggle {
    Create a theme toggle switch component:
    
    Features:
    - Toggle between light and dark themes
    - Remember user preference in localStorage
    - Smooth transition animations
    - System theme detection and respect
    - Accessible switch with proper ARIA labels
    
    Implementation:
    - CSS custom properties for theme values
    - JavaScript toggle functionality
    - Automatic theme application on load
    - Smooth transition for all elements
}
```

### Add Offline Support

Create `src/functions/offline-support.sun`:

```sunscript
@progressive web app
@offline first

function addServiceWorker {
    Implement service worker for offline functionality:
    
    Features:
    - Cache application assets
    - Offline todo management
    - Background sync when connection returns
    - Update notifications for new versions
    - Fallback pages for offline state
    
    Implementation:
    - Cache strategies for different resource types
    - IndexedDB for offline todo storage
    - Sync queuing for when connection returns
    - User feedback for offline/online states
}
```

## Step 12: Debug and Optimize

### Debug Your Application

```bash
# Use SunScript debugger
sunscript debug src/main.sun --target dist/main.js

# Debug specific function
sunscript debug src/functions/todo-manager.sun --target dist/functions/todo-manager.js
```

### Performance Optimization

Add optimization directives:

```sunscript
@optimize for performance
@minimize bundle size
@lazy load components

function optimizeApplication {
    Apply performance optimizations:
    - Minimize DOM manipulations
    - Use document fragments for bulk updates
    - Implement virtual scrolling for large lists
    - Debounce input events
    - Optimize image loading and caching
}
```

## Step 13: Deploy Your Application

### Build for Production

```bash
# Compile with optimizations
sunscript let there be light --optimize

# Minify generated files
npx terser dist/main.js -o dist/main.min.js
npx csso dist/styles/main.css --output dist/styles/main.min.css
```

### Deploy Options

1. **Static Hosting** (Netlify, Vercel, GitHub Pages):
   ```bash
   # Build and deploy
   npm run build
   netlify deploy --prod --dir=dist
   ```

2. **Traditional Web Hosting**:
   - Upload `dist/` folder contents
   - Ensure server serves `index.html` for all routes

3. **Docker Container**:
   ```dockerfile
   FROM nginx:alpine
   COPY dist/ /usr/share/nginx/html/
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

## What You've Learned

Congratulations! You've built a complete todo application using SunScript and learned:

### SunScript Concepts:
- ✅ **Natural Language Programming**: Writing functions with human-readable descriptions
- ✅ **AI Directives**: Using `@optimize`, `@secure`, and other compiler hints
- ✅ **Component Architecture**: Building reusable UI components
- ✅ **Genesis Configuration**: Project setup and dependency management
- ✅ **Multi-target Compilation**: Generating JavaScript, CSS, and more

### Application Architecture:
- ✅ **Data Models**: Structured todo management
- ✅ **Storage Layer**: Persistent data with localStorage
- ✅ **Component System**: Modular UI components
- ✅ **Event Handling**: User interaction management
- ✅ **State Management**: Application state coordination

### Development Workflow:
- ✅ **Project Setup**: Genesis-based project initialization
- ✅ **Iterative Development**: Building features incrementally
- ✅ **Debugging**: Using SunScript debugging tools
- ✅ **Optimization**: Performance and security considerations
- ✅ **Deployment**: Production build and deployment strategies

## Next Steps

Ready to build more? Try these tutorials:

- 🌐 [**REST API Tutorial**](../tutorials/rest-api.md) - Build a backend API service
- 📊 [**Data Pipeline Tutorial**](../tutorials/data-pipeline.md) - Process and analyze data
- 🎨 [**Component Library**](../tutorials/component-library.md) - Create reusable UI components
- 📱 [**Mobile App**](../tutorials/mobile-app.md) - Build cross-platform mobile apps

### Advanced Topics:
- 🔧 [**Custom Generators**](../advanced/custom-generators.md) - Extend SunScript for new languages
- 🤖 [**AI Provider Configuration**](../advanced/ai-providers.md) - Optimize AI compilation
- 🔒 [**Security Best Practices**](../advanced/security.md) - Build secure applications
- ⚡ [**Performance Optimization**](../advanced/performance.md) - High-performance SunScript

---

**Congratulations!** 🎉 You've successfully built your first SunScript application! The todo app demonstrates the power of natural language programming combined with traditional software development practices.