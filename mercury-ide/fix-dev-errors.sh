#!/bin/bash

echo "Fixing development errors..."

# Fix GitService missing method
echo "Adding getCommitDetails to GitService..."
cat >> /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/GitService.ts << 'EOF'

    async getCommitDetails(hash: string): Promise<GitCommit> {
        const commit = await this.getCommitInfo(hash);
        return commit;
    }
EOF

# Fix QuickOpen isIndexing access
echo "Fixing QuickOpen isIndexing..."
sed -i '' 's/this.quickOpenService.isIndexing()/this.quickOpenService.getIndexingStatus()/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/components/QuickOpen.ts

# Fix SourceControlPanel null check
echo "Fixing SourceControlPanel..."
sed -i '' '35s/this.activeProvider!.rootUri/this.activeProvider?.rootUri || ""/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/components/SourceControlPanel.ts

# Fix MenuRegistry registerMenu calls
echo "Fixing MenuRegistry calls..."
sed -i '' 's/this.menuRegistry.registerMenu({/this.menuRegistry.registerMenu("/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/contributions/ui-contributions.ts
sed -i '' 's/id: '"'"'file'"'"',.*label: '"'"'File'"'"'/file", { label: "File"/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/contributions/ui-contributions.ts
sed -i '' 's/id: '"'"'edit'"'"',.*label: '"'"'Edit'"'"'/edit", { label: "Edit"/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/contributions/ui-contributions.ts

# Fix EditorService closing brace
echo "Fixing EditorService..."
echo "}" >> /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/EditorService.ts

# Fix AICompletionProvider position type
echo "Fixing AICompletionProvider..."
sed -i '' 's/model.getOffsetAt(position)/model.getOffsetAt({ lineNumber: position.line + 1, column: position.character + 1 })/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/AICompletionProvider.ts

# Fix DebugService duplicate methods
echo "Fixing DebugService duplicates..."
sed -i '' '/getBreakpoints(uri: string): Breakpoint\[\] {/,/^    }/d' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/DebugService.ts

# Fix InlayHint provider
echo "Fixing InlayHint provider..."
sed -i '' 's/Promise<monaco.languages.InlayHint\[\]>/Promise<{ hints: monaco.languages.InlayHint[], dispose: () => void }>/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/providers/SunScriptLanguageProvider.ts
sed -i '' 's/return hints;/return { hints, dispose: () => {} };/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/providers/SunScriptLanguageProvider.ts

# Fix DocumentSymbol tags
echo "Fixing DocumentSymbol tags..."
sed -i '' 's/children: \[\]/children: [], tags: []/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/providers/SunScriptLanguageProvider.ts

# Fix CommandRegistry method name
echo "Fixing CommandRegistry method..."
sed -i '' 's/this.commandRegistry.getAllCommands()/this.commandRegistry.getCommands()/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/CommandPaletteService.ts

# Add missing methods to EditorService
echo "Adding getOpenEditors to EditorService..."
cat >> /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/EditorService.ts << 'EOF'

    getOpenEditors(): monaco.editor.IStandaloneCodeEditor[] {
        const editors: monaco.editor.IStandaloneCodeEditor[] = [];
        this.groups.forEach(group => {
            if (group.editor && 'getModel' in group.editor) {
                editors.push(group.editor);
            }
        });
        return editors;
    }
EOF

echo "Development fixes applied!"