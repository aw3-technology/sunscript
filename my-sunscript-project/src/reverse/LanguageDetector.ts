import * as fs from 'fs/promises';
import * as path from 'path';

export interface LanguageInfo {
  language: string;
  extension: string;
  confidence: number;
  features: string[];
  framework?: string;
  version?: string;
}

export interface ProjectLanguageInfo {
  primary: LanguageInfo;
  secondary: LanguageInfo[];
  frameworks: string[];
  buildSystems: string[];
  packageManagers: string[];
}

export class LanguageDetector {
  // Language patterns and signatures
  private static readonly LANGUAGE_PATTERNS = {
    javascript: {
      extensions: ['.js', '.mjs', '.jsx'],
      keywords: ['function', 'const', 'let', 'var', 'import', 'export', 'require'],
      frameworks: ['react', 'vue', 'angular', 'express', 'node'],
      fileSignatures: [
        /require\s*\(/,
        /import\s+.*\s+from/,
        /export\s+(default\s+)?/,
        /console\.log/,
        /module\.exports/
      ]
    },
    typescript: {
      extensions: ['.ts', '.tsx'],
      keywords: ['interface', 'type', 'enum', 'namespace', 'declare'],
      frameworks: ['angular', 'nest', 'next'],
      fileSignatures: [
        /:\s*string/,
        /:\s*number/,
        /:\s*boolean/,
        /interface\s+\w+/,
        /type\s+\w+\s*=/
      ]
    },
    python: {
      extensions: ['.py', '.pyw', '.pyx'],
      keywords: ['def', 'class', 'import', 'from', 'if __name__'],
      frameworks: ['django', 'flask', 'fastapi', 'tensorflow', 'pandas'],
      fileSignatures: [
        /def\s+\w+\s*\(/,
        /class\s+\w+/,
        /import\s+\w+/,
        /from\s+\w+\s+import/,
        /if\s+__name__\s*==\s*['"']__main__['"']/
      ]
    },
    java: {
      extensions: ['.java'],
      keywords: ['public', 'private', 'protected', 'class', 'interface'],
      frameworks: ['spring', 'hibernate', 'junit'],
      fileSignatures: [
        /public\s+class\s+\w+/,
        /package\s+[\w.]+;/,
        /import\s+[\w.]+;/,
        /public\s+static\s+void\s+main/
      ]
    },
    go: {
      extensions: ['.go'],
      keywords: ['package', 'func', 'var', 'const', 'type', 'interface'],
      frameworks: ['gin', 'echo', 'fiber'],
      fileSignatures: [
        /package\s+\w+/,
        /func\s+\w+\s*\(/,
        /import\s+[("']/,
        /type\s+\w+\s+struct/
      ]
    },
    rust: {
      extensions: ['.rs'],
      keywords: ['fn', 'let', 'mut', 'struct', 'enum', 'impl'],
      frameworks: ['tokio', 'actix', 'rocket'],
      fileSignatures: [
        /fn\s+\w+\s*\(/,
        /let\s+(mut\s+)?\w+/,
        /struct\s+\w+/,
        /impl\s+\w+/,
        /use\s+[\w:]+;/
      ]
    },
    csharp: {
      extensions: ['.cs'],
      keywords: ['using', 'namespace', 'class', 'public', 'private'],
      frameworks: ['.net', 'unity', 'xamarin'],
      fileSignatures: [
        /using\s+[\w.]+;/,
        /namespace\s+[\w.]+/,
        /public\s+class\s+\w+/,
        /static\s+void\s+Main/
      ]
    },
    php: {
      extensions: ['.php'],
      keywords: ['<?php', 'function', 'class', 'namespace'],
      frameworks: ['laravel', 'symfony', 'wordpress'],
      fileSignatures: [
        /<\?php/,
        /function\s+\w+\s*\(/,
        /class\s+\w+/,
        /\$\w+\s*=/
      ]
    },
    ruby: {
      extensions: ['.rb'],
      keywords: ['def', 'class', 'module', 'require'],
      frameworks: ['rails', 'sinatra'],
      fileSignatures: [
        /def\s+\w+/,
        /class\s+\w+/,
        /module\s+\w+/,
        /require\s+['"']/
      ]
    }
  };

  private static readonly CONFIG_FILES = {
    'package.json': 'javascript',
    'tsconfig.json': 'typescript',
    'requirements.txt': 'python',
    'setup.py': 'python',
    'Pipfile': 'python',
    'pom.xml': 'java',
    'build.gradle': 'java',
    'go.mod': 'go',
    'Cargo.toml': 'rust',
    '*.csproj': 'csharp',
    'composer.json': 'php',
    'Gemfile': 'ruby'
  };

  private static readonly FRAMEWORK_PATTERNS = {
    react: [/import.*react/i, /from\s+['"']react['"']/i, /jsx?/],
    vue: [/import.*vue/i, /<template>/i, /<script>/i],
    angular: [/import.*@angular/i, /@Component/i, /@Injectable/i],
    express: [/require.*express/i, /import.*express/i, /app\.get\(/],
    django: [/from\s+django/i, /import\s+django/i, /INSTALLED_APPS/],
    flask: [/from\s+flask/i, /import\s+flask/i, /@app\.route/],
    spring: [/@SpringBootApplication/i, /import.*springframework/i],
    rails: [/class.*ApplicationController/i, /Rails\.application/]
  };

  /**
   * Detect the primary and secondary languages in a project
   */
  async detectProjectLanguages(projectPath: string): Promise<ProjectLanguageInfo> {
    const fileLanguages = await this.scanFiles(projectPath);
    const configLanguages = await this.detectFromConfigFiles(projectPath);
    const frameworks = await this.detectFrameworks(projectPath, fileLanguages);
    const buildSystems = await this.detectBuildSystems(projectPath);
    const packageManagers = await this.detectPackageManagers(projectPath);

    // Combine and rank languages
    const languageStats = new Map<string, { count: number; confidence: number; features: Set<string> }>();

    // Add file-based detections
    for (const lang of fileLanguages) {
      const existing = languageStats.get(lang.language) || { count: 0, confidence: 0, features: new Set() };
      existing.count++;
      existing.confidence += lang.confidence;
      lang.features.forEach(f => existing.features.add(f));
      languageStats.set(lang.language, existing);
    }

    // Boost confidence for config-detected languages
    for (const [lang, boost] of configLanguages) {
      const existing = languageStats.get(lang) || { count: 0, confidence: 0, features: new Set() };
      existing.confidence += boost;
      existing.features.add('config-detected');
      languageStats.set(lang, existing);
    }

    // Sort by confidence and count
    const sortedLanguages = Array.from(languageStats.entries())
      .map(([language, stats]) => ({
        language,
        extension: this.getMainExtension(language),
        confidence: Math.min(100, (stats.confidence / Math.max(1, stats.count)) + (stats.count * 5)),
        features: Array.from(stats.features),
        framework: frameworks.find(f => this.isFrameworkForLanguage(f, language))
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const primary = sortedLanguages[0] || {
      language: 'unknown',
      extension: '',
      confidence: 0,
      features: []
    };

    const secondary = sortedLanguages.slice(1, 4); // Top 3 secondary languages

    return {
      primary,
      secondary,
      frameworks,
      buildSystems,
      packageManagers
    };
  }

  /**
   * Detect language of a single file
   */
  async detectFileLanguage(filePath: string): Promise<LanguageInfo> {
    const content = await fs.readFile(filePath, 'utf-8');
    const extension = path.extname(filePath).toLowerCase();
    
    let bestMatch: LanguageInfo = {
      language: 'unknown',
      extension,
      confidence: 0,
      features: []
    };

    for (const [language, config] of Object.entries(LanguageDetector.LANGUAGE_PATTERNS)) {
      let confidence = 0;
      const features: string[] = [];

      // Check extension match
      if (config.extensions.includes(extension)) {
        confidence += 40;
        features.push('extension-match');
      }

      // Check keyword presence
      const keywordMatches = config.keywords.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      confidence += Math.min(30, keywordMatches * 5);
      if (keywordMatches > 0) {
        features.push(`keywords-${keywordMatches}`);
      }

      // Check file signatures
      const signatureMatches = config.fileSignatures.filter(pattern => 
        pattern.test(content)
      ).length;
      confidence += Math.min(30, signatureMatches * 10);
      if (signatureMatches > 0) {
        features.push(`signatures-${signatureMatches}`);
      }

      // Check for framework indicators
      const frameworkMatch = config.frameworks.find(framework => 
        content.toLowerCase().includes(framework)
      );
      if (frameworkMatch) {
        confidence += 15;
        features.push(`framework-${frameworkMatch}`);
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          language,
          extension,
          confidence: Math.min(100, confidence),
          features,
          framework: frameworkMatch
        };
      }
    }

    return bestMatch;
  }

  /**
   * Scan all files in project and detect languages
   */
  private async scanFiles(projectPath: string): Promise<LanguageInfo[]> {
    const results: LanguageInfo[] = [];
    
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        const fullPath = path.join(projectPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories (limited depth)
          const subResults = await this.scanFiles(fullPath);
          results.push(...subResults.slice(0, 5)); // Limit results per directory
        } else if (entry.isFile()) {
          try {
            const detection = await this.detectFileLanguage(fullPath);
            if (detection.confidence > 20) { // Only include confident detections
              results.push(detection);
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Directory not accessible
    }

    return results;
  }

  /**
   * Detect languages from configuration files
   */
  private async detectFromConfigFiles(projectPath: string): Promise<Map<string, number>> {
    const detections = new Map<string, number>();

    for (const [configFile, language] of Object.entries(LanguageDetector.CONFIG_FILES)) {
      try {
        if (configFile.includes('*')) {
          // Handle glob patterns
          const pattern = configFile.replace('*', '');
          const entries = await fs.readdir(projectPath);
          const matchingFiles = entries.filter(file => file.endsWith(pattern));
          
          if (matchingFiles.length > 0) {
            detections.set(language, 50);
          }
        } else {
          const configPath = path.join(projectPath, configFile);
          await fs.access(configPath);
          detections.set(language, 50);
        }
      } catch {
        // Config file doesn't exist
      }
    }

    return detections;
  }

  /**
   * Detect frameworks used in the project
   */
  private async detectFrameworks(projectPath: string, fileLanguages: LanguageInfo[]): Promise<string[]> {
    const frameworks = new Set<string>();

    // Check from file detections
    fileLanguages.forEach(lang => {
      if (lang.framework) {
        frameworks.add(lang.framework);
      }
    });

    // Check package.json for JavaScript frameworks
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      for (const [framework, patterns] of Object.entries(LanguageDetector.FRAMEWORK_PATTERNS)) {
        if (Object.keys(allDeps).some(dep => dep.includes(framework))) {
          frameworks.add(framework);
        }
      }
    } catch {
      // No package.json or can't read it
    }

    // Check requirements.txt for Python frameworks
    try {
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      const requirements = await fs.readFile(requirementsPath, 'utf-8');
      
      for (const [framework] of Object.entries(LanguageDetector.FRAMEWORK_PATTERNS)) {
        if (requirements.toLowerCase().includes(framework)) {
          frameworks.add(framework);
        }
      }
    } catch {
      // No requirements.txt
    }

    return Array.from(frameworks);
  }

  /**
   * Detect build systems
   */
  private async detectBuildSystems(projectPath: string): Promise<string[]> {
    const buildSystems: string[] = [];
    
    const buildFiles = [
      { file: 'webpack.config.js', system: 'webpack' },
      { file: 'rollup.config.js', system: 'rollup' },
      { file: 'vite.config.js', system: 'vite' },
      { file: 'Makefile', system: 'make' },
      { file: 'CMakeLists.txt', system: 'cmake' },
      { file: 'build.gradle', system: 'gradle' },
      { file: 'pom.xml', system: 'maven' },
      { file: 'Cargo.toml', system: 'cargo' },
      { file: 'go.mod', system: 'go-modules' }
    ];

    for (const { file, system } of buildFiles) {
      try {
        await fs.access(path.join(projectPath, file));
        buildSystems.push(system);
      } catch {
        // File doesn't exist
      }
    }

    return buildSystems;
  }

  /**
   * Detect package managers
   */
  private async detectPackageManagers(projectPath: string): Promise<string[]> {
    const packageManagers: string[] = [];
    
    const pmFiles = [
      { file: 'package-lock.json', pm: 'npm' },
      { file: 'yarn.lock', pm: 'yarn' },
      { file: 'pnpm-lock.yaml', pm: 'pnpm' },
      { file: 'Pipfile.lock', pm: 'pipenv' },
      { file: 'poetry.lock', pm: 'poetry' },
      { file: 'Gemfile.lock', pm: 'bundler' },
      { file: 'composer.lock', pm: 'composer' }
    ];

    for (const { file, pm } of pmFiles) {
      try {
        await fs.access(path.join(projectPath, file));
        packageManagers.push(pm);
      } catch {
        // File doesn't exist
      }
    }

    return packageManagers;
  }

  private getMainExtension(language: string): string {
    const config = LanguageDetector.LANGUAGE_PATTERNS[language as keyof typeof LanguageDetector.LANGUAGE_PATTERNS];
    return config?.extensions[0] || '';
  }

  private isFrameworkForLanguage(framework: string, language: string): boolean {
    const config = LanguageDetector.LANGUAGE_PATTERNS[language as keyof typeof LanguageDetector.LANGUAGE_PATTERNS];
    return config?.frameworks.includes(framework) || false;
  }
}