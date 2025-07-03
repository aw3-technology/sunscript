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
export declare function createAriaLiveRegion(): AriaLiveRegion;
/**
 * Add accessibility attributes to icon buttons
 */
export declare function makeIconButtonAccessible(button: HTMLElement, label: string, options?: {
    description?: string;
    shortcut?: string;
    pressed?: boolean;
}): void;
/**
 * Create an accessible tooltip
 */
export declare function createAccessibleTooltip(target: HTMLElement, content: string, options?: {
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}): () => void;
/**
 * Manage focus trap for modal dialogs
 */
export declare function createFocusTrap(container: HTMLElement): () => void;
/**
 * Add keyboard navigation to a list
 */
export declare function addListKeyboardNavigation(container: HTMLElement, options?: {
    itemSelector?: string;
    onSelect?: (item: HTMLElement, index: number) => void;
    onActivate?: (item: HTMLElement, index: number) => void;
    wrap?: boolean;
}): () => void;
/**
 * Announce a message to screen readers
 */
export declare const screenReaderAnnounce: {
    announce: (message: string, priority?: "polite" | "assertive") => void;
    clear: () => void;
};
/**
 * Common ARIA labels for IDE components
 */
export declare const ARIA_LABELS: {
    readonly NEW_FILE: "New file";
    readonly OPEN_FILE: "Open file";
    readonly SAVE_FILE: "Save file";
    readonly SAVE_ALL: "Save all files";
    readonly CLOSE_FILE: "Close file";
    readonly UNDO: "Undo";
    readonly REDO: "Redo";
    readonly CUT: "Cut";
    readonly COPY: "Copy";
    readonly PASTE: "Paste";
    readonly FIND: "Find";
    readonly REPLACE: "Replace";
    readonly TOGGLE_SIDEBAR: "Toggle sidebar";
    readonly TOGGLE_TERMINAL: "Toggle terminal";
    readonly TOGGLE_OUTPUT: "Toggle output panel";
    readonly TOGGLE_PROBLEMS: "Toggle problems panel";
    readonly GO_TO_FILE: "Go to file";
    readonly GO_TO_SYMBOL: "Go to symbol";
    readonly GO_TO_LINE: "Go to line";
    readonly GIT_COMMIT: "Commit changes";
    readonly GIT_PUSH: "Push changes";
    readonly GIT_PULL: "Pull changes";
    readonly GIT_REFRESH: "Refresh git status";
    readonly NEW_TERMINAL: "New terminal";
    readonly CLEAR_TERMINAL: "Clear terminal";
    readonly KILL_TERMINAL: "Kill terminal";
    readonly START_DEBUGGING: "Start debugging";
    readonly STOP_DEBUGGING: "Stop debugging";
    readonly STEP_OVER: "Step over";
    readonly STEP_INTO: "Step into";
    readonly STEP_OUT: "Step out";
    readonly CONTINUE: "Continue";
    readonly SETTINGS: "Open settings";
    readonly HELP: "Help";
    readonly SEARCH: "Search";
    readonly RUN_COMMAND: "Run command";
};
