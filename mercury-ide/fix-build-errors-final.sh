#!/bin/bash

echo "Fixing final build errors..."

# Fix SourceControlPanel null check
echo "Fixing SourceControlPanel..."
sed -i '' '/rootUri: this.activeProvider!.rootUri/s/!/?.rootUri || ""/' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/components/SourceControlPanel.ts

# Fix WorkspaceTextEdit type
echo "Fixing WorkspaceTextEdit..."
sed -i '' 's/monaco.languages.WorkspaceTextEdit/monaco.languages.IWorkspaceTextEdit/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/providers/SunScriptLanguageProvider.ts

# Fix WorkspaceTextEdit 'edit' property
sed -i '' 's/edit: {/textEdit: {/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/providers/SunScriptLanguageProvider.ts

# Fix AICompletionProvider setTimeout type
sed -i '' 's/this.completionTimer = setTimeout/this.completionTimer = setTimeout as any/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/AICompletionProvider.ts

# Fix BlameAnnotationService afterContent
sed -i '' 's/afterContent:/after:/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/BlameAnnotationService.ts

# Fix BlameAnnotationService className check
sed -i '' 's/newOptions.className/newOptions.className || ""/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/BlameAnnotationService.ts

# Fix CommandPaletteService type issues
echo "Fixing CommandPaletteService..."
cat > /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/fix-command-palette.ts << 'EOF'
// Fix for CommandPaletteService - manual fix needed
// Change line 82: id: String(index),
// Change line 83: label: String(commandId),
// Add to Command interface: description?: string; when?: string;
EOF

# Fix DebugService configuration property
echo "Adding configuration to DebugSession..."
sed -i '' '/interface DebugSession {/,/^}/ s/}/    configuration: DebugConfiguration;\n}/' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/DebugService.ts

# Fix DiagnosticsService code type
echo "Fixing DiagnosticsService..."
sed -i '' 's/code: diagnostic.code/code: typeof diagnostic.code === "number" ? String(diagnostic.code) : diagnostic.code/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/DiagnosticsService.ts

# Fix EditorService renderIndentGuides
sed -i '' 's/renderIndentGuides: true/\/\/ renderIndentGuides removed in newer monaco versions/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/EditorService.ts

# Fix GitService getCommitInfo
echo "Adding getCommitInfo to GitService..."
cat >> /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/GitService.ts << 'EOF'

    async getCommitInfo(hash: string): Promise<GitCommit> {
        // Simulate getting commit info
        const commits = await this.getCommitHistory('', 100);
        const commit = commits.find(c => c.hash === hash);
        
        if (!commit) {
            throw new Error(`Commit ${hash} not found`);
        }
        
        return commit;
    }
EOF

# Fix LanguageServerClient null check
sed -i '' 's/this.connection.listen()/this.connection?.listen()/' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/LanguageServerClient.ts

# Fix QuickOpenService directory comparison
sed -i '' 's/item.type === '"'"'directory'"'"'/item.type === '"'"'folder'"'"'/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/QuickOpenService.ts

echo "Build fixes applied!"
echo "Note: Some fixes require manual intervention. Check fix-command-palette.ts for details."