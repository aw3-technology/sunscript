#!/bin/bash

echo "Fixing critical build errors..."

# Fix contribution-provider container property
echo "Fixing contribution-provider..."
sed -i '' 's/context.container/context.container || context/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/core/contribution-provider.ts

# Remove problematic inline decoration
echo "Fixing BlameAnnotationService inline decorations..."
sed -i '' '/after: {/,/}/d' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/BlameAnnotationService.ts
sed -i '' 's/afterContentClassName:.*,/\/\/ afterContentClassName removed,/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/BlameAnnotationService.ts

# Fix workspace text edit
echo "Fixing workspace text edits..."
sed -i '' 's/textEdit: {/newText: item.insertText, range: {/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/providers/SunScriptLanguageProvider.ts

# Fix LanguageServerClient range type
echo "Fixing LanguageServerClient completion range..."
sed -i '' 's/range: position/range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column }/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/services/LanguageServerClient.ts

# Fix SourceControlPanel null check
echo "Fixing SourceControlPanel..."
sed -i '' '35s/rootUri: this.activeProvider!.rootUri/rootUri: this.activeProvider ? this.activeProvider.rootUri : ""/g' /Users/williamschulz/Workspace/SunScriptV2/mercury-ide/src/components/SourceControlPanel.ts

echo "Critical fixes applied!"