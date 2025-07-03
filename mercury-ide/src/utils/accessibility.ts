/**
 * Accessibility utility functions and constants
 */

export interface AriaLiveRegion {
    announce(message: string, priority?: 'polite' | 'assertive'): void;
    clear(): void;
}

/**
 * Create an ARIA live region for screen reader announcements
 */
export function createAriaLiveRegion(): AriaLiveRegion {
    const container = document.createElement('div');
    container.className = 'sr-only';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    container.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    `;
    document.body.appendChild(container);
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return {
        announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            container.setAttribute('aria-live', priority);
            container.textContent = message;
            
            // Clear after 5 seconds
            timeoutId = setTimeout(() => {
                container.textContent = '';
            }, 5000);
        },
        
        clear() {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            container.textContent = '';
        }
    };
}

/**
 * Add accessibility attributes to icon buttons
 */
export function makeIconButtonAccessible(
    button: HTMLElement,
    label: string,
    options?: {
        description?: string;
        shortcut?: string;
        pressed?: boolean;
    }
): void {
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', label);
    
    if (options?.description) {
        button.setAttribute('aria-description', options.description);
    }
    
    if (options?.shortcut) {
        button.setAttribute('aria-keyshortcuts', options.shortcut);
    }
    
    if (options?.pressed !== undefined) {
        button.setAttribute('aria-pressed', String(options.pressed));
    }
    
    // Ensure button is keyboard focusable
    if (!button.hasAttribute('tabindex')) {
        button.setAttribute('tabindex', '0');
    }
    
    // Add keyboard support if not already present
    if (!button.onclick) {
        button.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                button.click();
            }
        });
    }
}

/**
 * Create an accessible tooltip
 */
export function createAccessibleTooltip(
    target: HTMLElement,
    content: string,
    options?: {
        position?: 'top' | 'bottom' | 'left' | 'right';
        delay?: number;
    }
): () => void {
    const tooltipId = `tooltip-${Date.now()}`;
    const tooltip = document.createElement('div');
    tooltip.id = tooltipId;
    tooltip.className = 'tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = content;
    tooltip.style.cssText = `
        position: absolute;
        background: #333;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 10000;
    `;
    
    target.setAttribute('aria-describedby', tooltipId);
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const show = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
            document.body.appendChild(tooltip);
            
            const targetRect = target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            let top = 0;
            let left = 0;
            
            switch (options?.position || 'top') {
                case 'top':
                    top = targetRect.top - tooltipRect.height - 5;
                    left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                    break;
                case 'bottom':
                    top = targetRect.bottom + 5;
                    left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                    break;
                case 'left':
                    top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                    left = targetRect.left - tooltipRect.width - 5;
                    break;
                case 'right':
                    top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                    left = targetRect.right + 5;
                    break;
            }
            
            tooltip.style.top = `${Math.max(0, top)}px`;
            tooltip.style.left = `${Math.max(0, left)}px`;
            tooltip.style.opacity = '1';
        }, options?.delay || 500);
    };
    
    const hide = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        
        tooltip.style.opacity = '0';
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 200);
    };
    
    target.addEventListener('mouseenter', show);
    target.addEventListener('mouseleave', hide);
    target.addEventListener('focus', show);
    target.addEventListener('blur', hide);
    
    // Return cleanup function
    return () => {
        hide();
        target.removeEventListener('mouseenter', show);
        target.removeEventListener('mouseleave', hide);
        target.removeEventListener('focus', show);
        target.removeEventListener('blur', hide);
        target.removeAttribute('aria-describedby');
    };
}

/**
 * Manage focus trap for modal dialogs
 */
export function createFocusTrap(container: HTMLElement): () => void {
    const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ];
    
    const getFocusableElements = (): HTMLElement[] => {
        return Array.from(
            container.querySelectorAll<HTMLElement>(focusableSelectors.join(','))
        ).filter(el => el.offsetParent !== null); // Filter out hidden elements
    };
    
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    };
    
    // Store previously focused element
    const previouslyFocused = document.activeElement as HTMLElement;
    
    // Add event listener
    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }
    
    // Return cleanup function
    return () => {
        container.removeEventListener('keydown', handleKeyDown);
        previouslyFocused?.focus();
    };
}

/**
 * Add keyboard navigation to a list
 */
export function addListKeyboardNavigation(
    container: HTMLElement,
    options?: {
        itemSelector?: string;
        onSelect?: (item: HTMLElement, index: number) => void;
        onActivate?: (item: HTMLElement, index: number) => void;
        wrap?: boolean;
    }
): () => void {
    const itemSelector = options?.itemSelector || '[role="option"], [role="menuitem"], li';
    let currentIndex = -1;
    
    const getItems = (): HTMLElement[] => {
        return Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
    };
    
    const setActiveIndex = (index: number) => {
        const items = getItems();
        if (items.length === 0) return;
        
        // Remove previous active state
        if (currentIndex >= 0 && currentIndex < items.length) {
            items[currentIndex].setAttribute('aria-selected', 'false');
            items[currentIndex].classList.remove('active');
        }
        
        // Wrap or clamp index
        if (options?.wrap) {
            index = ((index % items.length) + items.length) % items.length;
        } else {
            index = Math.max(0, Math.min(index, items.length - 1));
        }
        
        currentIndex = index;
        
        // Set new active state
        const activeItem = items[currentIndex];
        activeItem.setAttribute('aria-selected', 'true');
        activeItem.classList.add('active');
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        
        // Call select callback
        options?.onSelect?.(activeItem, currentIndex);
    };
    
    const handleKeyDown = (event: KeyboardEvent) => {
        const items = getItems();
        if (items.length === 0) return;
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setActiveIndex(currentIndex + 1);
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                setActiveIndex(currentIndex - 1);
                break;
                
            case 'Home':
                event.preventDefault();
                setActiveIndex(0);
                break;
                
            case 'End':
                event.preventDefault();
                setActiveIndex(items.length - 1);
                break;
                
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (currentIndex >= 0 && currentIndex < items.length) {
                    options?.onActivate?.(items[currentIndex], currentIndex);
                }
                break;
        }
    };
    
    // Set up ARIA attributes
    container.setAttribute('role', 'listbox');
    const items = getItems();
    items.forEach((item, index) => {
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', index === currentIndex ? 'true' : 'false');
        
        // Add click handler
        item.addEventListener('click', () => {
            setActiveIndex(index);
            options?.onActivate?.(item, index);
        });
    });
    
    // Add event listener
    container.addEventListener('keydown', handleKeyDown);
    
    // Return cleanup function
    return () => {
        container.removeEventListener('keydown', handleKeyDown);
        container.removeAttribute('role');
        const items = getItems();
        items.forEach(item => {
            item.removeAttribute('role');
            item.removeAttribute('aria-selected');
        });
    };
}

/**
 * Announce a message to screen readers
 */
export const screenReaderAnnounce = (() => {
    const liveRegion = createAriaLiveRegion();
    
    return {
        announce: (message: string, priority?: 'polite' | 'assertive') => {
            liveRegion.announce(message, priority);
        },
        clear: () => {
            liveRegion.clear();
        }
    };
})();

/**
 * Common ARIA labels for IDE components
 */
export const ARIA_LABELS = {
    // File operations
    NEW_FILE: 'New file',
    OPEN_FILE: 'Open file',
    SAVE_FILE: 'Save file',
    SAVE_ALL: 'Save all files',
    CLOSE_FILE: 'Close file',
    
    // Editor operations
    UNDO: 'Undo',
    REDO: 'Redo',
    CUT: 'Cut',
    COPY: 'Copy',
    PASTE: 'Paste',
    FIND: 'Find',
    REPLACE: 'Replace',
    
    // View operations
    TOGGLE_SIDEBAR: 'Toggle sidebar',
    TOGGLE_TERMINAL: 'Toggle terminal',
    TOGGLE_OUTPUT: 'Toggle output panel',
    TOGGLE_PROBLEMS: 'Toggle problems panel',
    
    // Navigation
    GO_TO_FILE: 'Go to file',
    GO_TO_SYMBOL: 'Go to symbol',
    GO_TO_LINE: 'Go to line',
    
    // Source control
    GIT_COMMIT: 'Commit changes',
    GIT_PUSH: 'Push changes',
    GIT_PULL: 'Pull changes',
    GIT_REFRESH: 'Refresh git status',
    
    // Terminal
    NEW_TERMINAL: 'New terminal',
    CLEAR_TERMINAL: 'Clear terminal',
    KILL_TERMINAL: 'Kill terminal',
    
    // Debug
    START_DEBUGGING: 'Start debugging',
    STOP_DEBUGGING: 'Stop debugging',
    STEP_OVER: 'Step over',
    STEP_INTO: 'Step into',
    STEP_OUT: 'Step out',
    CONTINUE: 'Continue',
    
    // Other
    SETTINGS: 'Open settings',
    HELP: 'Help',
    SEARCH: 'Search',
    RUN_COMMAND: 'Run command'
} as const;