/**
 * Handles analysis of imports, exports, and dependencies
 * for different programming languages
 */

import { ImportAnalysis, ExportAnalysis, DependencyInfo } from '../types/AnalysisTypes';

export class DependencyAnalyzer {

  // JavaScript/TypeScript Imports
  extractJSImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    
    // ES6 imports
    const importRegex = /import\s+(?:(\w+)|{([^}]+)}|(\*\s+as\s+\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, defaultImport, namedImports, namespaceImport, source] = match;
      
      let importType: 'default' | 'named' | 'namespace' | 'side-effect' = 'side-effect';
      let imports_: string[] = [];
      
      if (defaultImport) {
        importType = 'default';
        imports_ = [defaultImport];
      } else if (namedImports) {
        importType = 'named';
        imports_ = namedImports.split(',').map(i => i.trim());
      } else if (namespaceImport) {
        importType = 'namespace';
        imports_ = [namespaceImport.replace('*', '').replace('as', '').trim()];
      }
      
      imports.push({
        source,
        importType,
        imports: imports_,
        isExternal: !source.startsWith('.'),
        framework: this.detectFrameworkFromImport(source)
      });
    }
    
    // CommonJS requires
    const requireRegex = /(?:const|let|var)\s+(?:{([^}]+)}|(\w+))\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    
    while ((match = requireRegex.exec(content)) !== null) {
      const [, destructured, variable, source] = match;
      
      imports.push({
        source,
        importType: destructured ? 'named' : 'default',
        imports: destructured ? destructured.split(',').map(i => i.trim()) : [variable],
        isExternal: !source.startsWith('.'),
        framework: this.detectFrameworkFromImport(source)
      });
    }
    
    return imports;
  }

  // JavaScript/TypeScript Exports
  extractJSExports(content: string): ExportAnalysis[] {
    const exports: ExportAnalysis[] = [];
    
    // Named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    let match;
    
    while ((match = namedExportRegex.exec(content)) !== null) {
      const [fullMatch, name] = match;
      
      exports.push({
        name,
        type: this.determineExportType(fullMatch),
        isReExport: false
      });
    }
    
    // Export statements
    const exportStatementRegex = /export\s+{([^}]+)}\s*(?:from\s+['"]([^'"]+)['"])?/g;
    
    while ((match = exportStatementRegex.exec(content)) !== null) {
      const [, exportList, source] = match;
      
      exportList.split(',').forEach(exportItem => {
        const trimmed = exportItem.trim();
        const [name, alias] = trimmed.split(' as ').map(s => s.trim());
        
        exports.push({
          name: alias || name,
          type: 'variable',
          isReExport: !!source,
          source
        });
      });
    }
    
    // Default exports
    if (content.includes('export default')) {
      const defaultMatch = content.match(/export\s+default\s+(?:class\s+(\w+)|function\s+(\w+)|(\w+))/);
      if (defaultMatch) {
        const name = defaultMatch[1] || defaultMatch[2] || defaultMatch[3] || 'default';
        exports.push({
          name,
          type: 'default',
          isReExport: false
        });
      }
    }
    
    return exports;
  }

  // Python Imports
  extractPythonImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    
    // from ... import statements
    const fromImportRegex = /from\s+([^\s]+)\s+import\s+(.+)/g;
    let match;
    
    while ((match = fromImportRegex.exec(content)) !== null) {
      const [, source, importList] = match;
      const importItems = importList.split(',').map(i => i.trim());
      
      imports.push({
        source,
        importType: 'named',
        imports: importItems,
        isExternal: !source.startsWith('.'),
        framework: this.detectPythonFramework(source)
      });
    }
    
    // import statements
    const importRegex = /import\s+([^\s]+)(?:\s+as\s+(\w+))?/g;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, module, alias] = match;
      
      imports.push({
        source: module,
        importType: alias ? 'namespace' : 'default',
        imports: [alias || module],
        alias,
        isExternal: !module.startsWith('.'),
        framework: this.detectPythonFramework(module)
      });
    }
    
    return imports;
  }

  // Java Imports
  extractJavaImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    
    const importRegex = /import\s+(?:static\s+)?([^;]+);/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [fullMatch, importPath] = match;
      const isStatic = fullMatch.includes('static');
      
      const parts = importPath.split('.');
      const className = parts[parts.length - 1];
      
      imports.push({
        source: importPath,
        importType: 'named',
        imports: [className],
        isExternal: !importPath.startsWith('com.yourcompany'), // Adjust as needed
        framework: this.detectJavaFramework(importPath)
      });
    }
    
    return imports;
  }

  // Go Imports
  extractGoImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    
    // Single import
    const singleImportRegex = /import\s+"([^"]+)"/g;
    let match;
    
    while ((match = singleImportRegex.exec(content)) !== null) {
      const [, importPath] = match;
      
      imports.push({
        source: importPath,
        importType: 'default',
        imports: [this.getGoPackageName(importPath)],
        isExternal: !importPath.startsWith('.'),
        framework: this.detectGoFramework(importPath)
      });
    }
    
    // Multiple imports
    const multiImportRegex = /import\s*\(\s*([\s\S]*?)\s*\)/g;
    
    while ((match = multiImportRegex.exec(content)) !== null) {
      const [, importBlock] = match;
      const lines = importBlock.split('\n');
      
      for (const line of lines) {
        const lineMatch = line.trim().match(/"([^"]+)"/);
        if (lineMatch) {
          const [, importPath] = lineMatch;
          
          imports.push({
            source: importPath,
            importType: 'default',
            imports: [this.getGoPackageName(importPath)],
            isExternal: !importPath.startsWith('.'),
            framework: this.detectGoFramework(importPath)
          });
        }
      }
    }
    
    return imports;
  }

  // Rust Imports
  extractRustImports(content: string): ImportAnalysis[] {
    const imports: ImportAnalysis[] = [];
    
    const useRegex = /use\s+([^;]+);/g;
    let match;
    
    while ((match = useRegex.exec(content)) !== null) {
      const [, usePath] = match;
      
      // Handle different use patterns
      if (usePath.includes('{')) {
        // use std::{io, fs}
        const [basePath, items] = usePath.split('{');
        const itemList = items.replace('}', '').split(',').map(i => i.trim());
        
        imports.push({
          source: basePath.trim(),
          importType: 'named',
          imports: itemList,
          isExternal: this.isExternalRustCrate(basePath.trim()),
          framework: this.detectRustFramework(basePath.trim())
        });
      } else {
        // use std::io
        const parts = usePath.split('::');
        const itemName = parts[parts.length - 1];
        
        imports.push({
          source: usePath,
          importType: 'default',
          imports: [itemName],
          isExternal: this.isExternalRustCrate(usePath),
          framework: this.detectRustFramework(usePath)
        });
      }
    }
    
    return imports;
  }

  // Dependency Analysis
  analyzeDependencies(imports: ImportAnalysis[], content: string): DependencyInfo[] {
    const dependencies: DependencyInfo[] = [];
    const dependencyMap = new Map<string, DependencyInfo>();
    
    for (const imp of imports) {
      if (imp.isExternal && imp.framework) {
        const existing = dependencyMap.get(imp.framework);
        
        if (existing) {
          existing.purpose += `, ${this.getImportPurpose(imp)}`;
        } else {
          dependencyMap.set(imp.framework, {
            name: imp.framework,
            type: 'runtime',
            purpose: this.getImportPurpose(imp),
            critical: this.isDependencyCritical(imp.framework, content)
          });
        }
      }
    }
    
    return Array.from(dependencyMap.values());
  }

  // Helper methods
  private detectFrameworkFromImport(source: string): string | undefined {
    const frameworks = {
      'react': 'React',
      'vue': 'Vue.js',
      'angular': 'Angular',
      '@angular': 'Angular',
      'express': 'Express.js',
      'lodash': 'Lodash',
      'moment': 'Moment.js',
      'axios': 'Axios',
      'jquery': 'jQuery'
    };
    
    for (const [key, framework] of Object.entries(frameworks)) {
      if (source.startsWith(key)) {
        return framework;
      }
    }
    
    return undefined;
  }

  private detectPythonFramework(module: string): string | undefined {
    const frameworks = {
      'django': 'Django',
      'flask': 'Flask',
      'fastapi': 'FastAPI',
      'numpy': 'NumPy',
      'pandas': 'Pandas',
      'requests': 'Requests',
      'tensorflow': 'TensorFlow',
      'torch': 'PyTorch'
    };
    
    return frameworks[module] || undefined;
  }

  private detectJavaFramework(importPath: string): string | undefined {
    if (importPath.includes('springframework')) return 'Spring Framework';
    if (importPath.includes('javax.servlet')) return 'Java Servlets';
    if (importPath.includes('org.junit')) return 'JUnit';
    if (importPath.includes('org.apache')) return 'Apache Commons';
    
    return undefined;
  }

  private detectGoFramework(importPath: string): string | undefined {
    if (importPath.includes('gin-gonic/gin')) return 'Gin';
    if (importPath.includes('gorilla/mux')) return 'Gorilla Mux';
    if (importPath.includes('gorm.io/gorm')) return 'GORM';
    
    return undefined;
  }

  private detectRustFramework(usePath: string): string | undefined {
    if (usePath.includes('tokio')) return 'Tokio';
    if (usePath.includes('serde')) return 'Serde';
    if (usePath.includes('actix_web')) return 'Actix Web';
    
    return undefined;
  }

  private getGoPackageName(importPath: string): string {
    const parts = importPath.split('/');
    return parts[parts.length - 1];
  }

  private isExternalRustCrate(usePath: string): boolean {
    return !usePath.startsWith('crate::') && !usePath.startsWith('super::') && !usePath.startsWith('self::');
  }

  private determineExportType(exportMatch: string): 'function' | 'class' | 'interface' | 'type' | 'variable' {
    if (exportMatch.includes('function')) return 'function';
    if (exportMatch.includes('class')) return 'class';
    if (exportMatch.includes('interface')) return 'interface';
    if (exportMatch.includes('type')) return 'type';
    return 'variable';
  }

  private getImportPurpose(imp: ImportAnalysis): string {
    if (imp.framework) {
      return `${imp.framework} integration`;
    }
    return `${imp.source} functionality`;
  }

  private isDependencyCritical(framework: string, content: string): boolean {
    // Simple heuristic: if the framework is mentioned frequently, it's critical
    const mentions = (content.match(new RegExp(framework, 'g')) || []).length;
    return mentions > 5;
  }
}