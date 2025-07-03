#!/bin/bash

# Fix TypeScript errors in Mercury IDE

echo "Fixing TypeScript errors..."

# Fix AIChatPanel
echo "Fixing AIChatPanel..."
cat >> /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/EditorService.ts << 'EOF'

    insertText(text: string): void {
        const editor = this.getActiveEditor();
        if (!editor) return;
        
        const position = editor.getPosition();
        if (!position) return;
        
        editor.executeEdits('insert', [{
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: text
        }]);
    }
EOF

# Create missing contribution interfaces
echo "Creating contribution interfaces..."
cat > /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/core/contribution-interfaces.ts << 'EOF'
export interface IContribution {
    register(): void;
}

export interface ICommandContribution extends IContribution {
    registerCommands(): void;
}

export interface IMenuContribution extends IContribution {
    registerMenus(): void;
}

export interface IKeybindingContribution extends IContribution {
    registerKeybindings(): void;
}
EOF

echo "Build fixes applied!"