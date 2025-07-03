import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { EventBus } from '../core/event-bus';

export interface FileIconMapping {
    extension: string;
    icon: string;
    color?: string;
    description?: string;
}

export interface FolderIconMapping {
    folderName: string;
    icon: string;
    color?: string;
    description?: string;
}

export interface FileAssociation {
    extension: string;
    mimeType: string;
    languageId?: string;
    editorId?: string;
    isText: boolean;
    isBinary: boolean;
    canEdit: boolean;
    defaultApplication?: string;
}

@injectable()
export class FileIconService {
    private fileIconMappings: Map<string, FileIconMapping> = new Map();
    private folderIconMappings: Map<string, FolderIconMapping> = new Map();
    private fileAssociations: Map<string, FileAssociation> = new Map();
    
    private readonly DEFAULT_FILE_ICON = '📄';
    private readonly DEFAULT_FOLDER_ICON = '📁';
    private readonly OPEN_FOLDER_ICON = '📂';

    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.initializeDefaultMappings();
        this.initializeFileAssociations();
    }

    private initializeDefaultMappings(): void {
        // SunScript files
        this.addFileIconMapping('sun', '☀️', '#FFA500', 'SunScript source file');
        
        // Web technologies
        this.addFileIconMapping('html', '🌐', '#E34F26', 'HTML document');
        this.addFileIconMapping('htm', '🌐', '#E34F26', 'HTML document');
        this.addFileIconMapping('css', '🎨', '#1572B6', 'Cascading Style Sheet');
        this.addFileIconMapping('scss', '🎨', '#CF649A', 'Sass stylesheet');
        this.addFileIconMapping('sass', '🎨', '#CF649A', 'Sass stylesheet');
        this.addFileIconMapping('less', '🎨', '#1D365D', 'Less stylesheet');
        
        // JavaScript/TypeScript
        this.addFileIconMapping('js', '🟨', '#F7DF1E', 'JavaScript file');
        this.addFileIconMapping('jsx', '⚛️', '#61DAFB', 'React JSX file');
        this.addFileIconMapping('ts', '🔷', '#3178C6', 'TypeScript file');
        this.addFileIconMapping('tsx', '⚛️', '#3178C6', 'TypeScript React file');
        this.addFileIconMapping('mjs', '🟨', '#F7DF1E', 'ES Module');
        this.addFileIconMapping('cjs', '🟨', '#F7DF1E', 'CommonJS Module');
        
        // Configuration files
        this.addFileIconMapping('json', '📋', '#000000', 'JSON data file');
        this.addFileIconMapping('yaml', '📋', '#CB171E', 'YAML configuration');
        this.addFileIconMapping('yml', '📋', '#CB171E', 'YAML configuration');
        this.addFileIconMapping('toml', '📋', '#9C4221', 'TOML configuration');
        this.addFileIconMapping('ini', '⚙️', '#000000', 'INI configuration');
        this.addFileIconMapping('conf', '⚙️', '#000000', 'Configuration file');
        this.addFileIconMapping('config', '⚙️', '#000000', 'Configuration file');
        
        // Package managers
        this.addFileIconMapping('package.json', '📦', '#CB3837', 'NPM package file');
        this.addFileIconMapping('package-lock.json', '🔒', '#CB3837', 'NPM lock file');
        this.addFileIconMapping('yarn.lock', '🧶', '#2C8EBB', 'Yarn lock file');
        this.addFileIconMapping('pnpm-lock.yaml', '📦', '#F69220', 'PNPM lock file');
        this.addFileIconMapping('composer.json', '🎼', '#885630', 'Composer package file');
        this.addFileIconMapping('Cargo.toml', '📦', '#CE422B', 'Rust Cargo file');
        this.addFileIconMapping('requirements.txt', '🐍', '#3776AB', 'Python requirements');
        this.addFileIconMapping('Pipfile', '🐍', '#3776AB', 'Python Pipfile');
        this.addFileIconMapping('poetry.lock', '🐍', '#3776AB', 'Poetry lock file');
        
        // Documentation
        this.addFileIconMapping('md', '📝', '#000000', 'Markdown document');
        this.addFileIconMapping('markdown', '📝', '#000000', 'Markdown document');
        this.addFileIconMapping('rst', '📝', '#000000', 'reStructuredText');
        this.addFileIconMapping('txt', '📄', '#000000', 'Text file');
        this.addFileIconMapping('rtf', '📄', '#000000', 'Rich text file');
        this.addFileIconMapping('pdf', '📕', '#FF0000', 'PDF document');
        
        // Programming languages
        this.addFileIconMapping('py', '🐍', '#3776AB', 'Python file');
        this.addFileIconMapping('rb', '💎', '#CC342D', 'Ruby file');
        this.addFileIconMapping('php', '🐘', '#777BB4', 'PHP file');
        this.addFileIconMapping('java', '☕', '#ED8B00', 'Java file');
        this.addFileIconMapping('c', '🔧', '#A8B9CC', 'C source file');
        this.addFileIconMapping('cpp', '🔧', '#00599C', 'C++ source file');
        this.addFileIconMapping('h', '🔧', '#A8B9CC', 'C/C++ header file');
        this.addFileIconMapping('cs', '🔷', '#239120', 'C# file');
        this.addFileIconMapping('go', '🐹', '#00ADD8', 'Go file');
        this.addFileIconMapping('rs', '🦀', '#CE422B', 'Rust file');
        this.addFileIconMapping('swift', '🕊️', '#FA7343', 'Swift file');
        this.addFileIconMapping('kt', '🔺', '#7F52FF', 'Kotlin file');
        this.addFileIconMapping('scala', '🔺', '#DC322F', 'Scala file');
        this.addFileIconMapping('r', '📊', '#276DC3', 'R file');
        this.addFileIconMapping('matlab', '📊', '#0076A8', 'MATLAB file');
        
        // Shell scripts
        this.addFileIconMapping('sh', '🐚', '#89E051', 'Shell script');
        this.addFileIconMapping('bash', '🐚', '#89E051', 'Bash script');
        this.addFileIconMapping('zsh', '🐚', '#89E051', 'Zsh script');
        this.addFileIconMapping('fish', '🐟', '#89E051', 'Fish script');
        this.addFileIconMapping('ps1', '💻', '#012456', 'PowerShell script');
        this.addFileIconMapping('bat', '💻', '#000000', 'Batch file');
        this.addFileIconMapping('cmd', '💻', '#000000', 'Command file');
        
        // Images
        this.addFileIconMapping('png', '🖼️', '#000000', 'PNG image');
        this.addFileIconMapping('jpg', '🖼️', '#000000', 'JPEG image');
        this.addFileIconMapping('jpeg', '🖼️', '#000000', 'JPEG image');
        this.addFileIconMapping('gif', '🖼️', '#000000', 'GIF image');
        this.addFileIconMapping('svg', '🎨', '#FFB13B', 'SVG vector image');
        this.addFileIconMapping('webp', '🖼️', '#000000', 'WebP image');
        this.addFileIconMapping('ico', '🖼️', '#000000', 'Icon file');
        this.addFileIconMapping('bmp', '🖼️', '#000000', 'Bitmap image');
        
        // Audio/Video
        this.addFileIconMapping('mp3', '🎵', '#000000', 'MP3 audio');
        this.addFileIconMapping('wav', '🎵', '#000000', 'WAV audio');
        this.addFileIconMapping('flac', '🎵', '#000000', 'FLAC audio');
        this.addFileIconMapping('mp4', '🎬', '#000000', 'MP4 video');
        this.addFileIconMapping('avi', '🎬', '#000000', 'AVI video');
        this.addFileIconMapping('mov', '🎬', '#000000', 'MOV video');
        this.addFileIconMapping('mkv', '🎬', '#000000', 'MKV video');
        
        // Archives
        this.addFileIconMapping('zip', '📦', '#000000', 'ZIP archive');
        this.addFileIconMapping('rar', '📦', '#000000', 'RAR archive');
        this.addFileIconMapping('7z', '📦', '#000000', '7-Zip archive');
        this.addFileIconMapping('tar', '📦', '#000000', 'TAR archive');
        this.addFileIconMapping('gz', '📦', '#000000', 'Gzip archive');
        this.addFileIconMapping('bz2', '📦', '#000000', 'Bzip2 archive');
        
        // Development tools
        this.addFileIconMapping('gitignore', '🚫', '#F05032', 'Git ignore file');
        this.addFileIconMapping('gitattributes', '🔧', '#F05032', 'Git attributes');
        this.addFileIconMapping('gitmodules', '📦', '#F05032', 'Git submodules');
        this.addFileIconMapping('dockerignore', '🐳', '#2496ED', 'Docker ignore file');
        this.addFileIconMapping('Dockerfile', '🐳', '#2496ED', 'Docker file');
        this.addFileIconMapping('Makefile', '🔨', '#427819', 'Makefile');
        this.addFileIconMapping('CMakeLists.txt', '🔨', '#064F8C', 'CMake file');
        this.addFileIconMapping('webpack.config.js', '📦', '#8DD6F9', 'Webpack config');
        this.addFileIconMapping('rollup.config.js', '📦', '#EC4A3F', 'Rollup config');
        this.addFileIconMapping('vite.config.js', '⚡', '#646CFF', 'Vite config');
        
        // IDE/Editor files
        this.addFileIconMapping('editorconfig', '⚙️', '#FEFEFE', 'Editor config');
        this.addFileIconMapping('prettierrc', '💅', '#F7B93E', 'Prettier config');
        this.addFileIconMapping('eslintrc', '🔍', '#4B32C3', 'ESLint config');
        this.addFileIconMapping('tsconfig.json', '🔷', '#3178C6', 'TypeScript config');
        this.addFileIconMapping('jsconfig.json', '🟨', '#F7DF1E', 'JavaScript config');
        
        // Special files
        this.addFileIconMapping('README.md', '📖', '#000000', 'README file');
        this.addFileIconMapping('LICENSE', '📜', '#000000', 'License file');
        this.addFileIconMapping('CHANGELOG.md', '📝', '#000000', 'Changelog');
        this.addFileIconMapping('CONTRIBUTING.md', '🤝', '#000000', 'Contributing guide');
        
        // Folder icons
        this.addFolderIconMapping('src', '📁', '#4CAF50', 'Source code folder');
        this.addFolderIconMapping('source', '📁', '#4CAF50', 'Source code folder');
        this.addFolderIconMapping('lib', '📚', '#2196F3', 'Library folder');
        this.addFolderIconMapping('libs', '📚', '#2196F3', 'Libraries folder');
        this.addFolderIconMapping('node_modules', '📦', '#8BC34A', 'Node modules');
        this.addFolderIconMapping('dist', '📦', '#FF9800', 'Distribution folder');
        this.addFolderIconMapping('build', '🔨', '#FF9800', 'Build folder');
        this.addFolderIconMapping('out', '📤', '#FF9800', 'Output folder');
        this.addFolderIconMapping('bin', '⚙️', '#607D8B', 'Binary folder');
        this.addFolderIconMapping('test', '🧪', '#9C27B0', 'Test folder');
        this.addFolderIconMapping('tests', '🧪', '#9C27B0', 'Tests folder');
        this.addFolderIconMapping('spec', '🧪', '#9C27B0', 'Spec folder');
        this.addFolderIconMapping('docs', '📚', '#2196F3', 'Documentation folder');
        this.addFolderIconMapping('doc', '📚', '#2196F3', 'Documentation folder');
        this.addFolderIconMapping('assets', '🎨', '#E91E63', 'Assets folder');
        this.addFolderIconMapping('static', '📁', '#795548', 'Static files folder');
        this.addFolderIconMapping('public', '🌐', '#4CAF50', 'Public folder');
        this.addFolderIconMapping('components', '🧩', '#3F51B5', 'Components folder');
        this.addFolderIconMapping('services', '⚙️', '#607D8B', 'Services folder');
        this.addFolderIconMapping('utils', '🔧', '#607D8B', 'Utilities folder');
        this.addFolderIconMapping('helpers', '🔧', '#607D8B', 'Helpers folder');
        this.addFolderIconMapping('config', '⚙️', '#FF9800', 'Configuration folder');
        this.addFolderIconMapping('scripts', '📜', '#4CAF50', 'Scripts folder');
        this.addFolderIconMapping('tools', '🔧', '#607D8B', 'Tools folder');
        this.addFolderIconMapping('.git', '📁', '#F05032', 'Git repository folder');
        this.addFolderIconMapping('.vscode', '💙', '#007ACC', 'VS Code settings');
        this.addFolderIconMapping('.idea', '💡', '#000000', 'IntelliJ IDEA settings');
        this.addFolderIconMapping('vendor', '📦', '#8BC34A', 'Vendor folder');
        this.addFolderIconMapping('migrations', '🔄', '#FF9800', 'Database migrations');
        this.addFolderIconMapping('models', '🏗️', '#3F51B5', 'Data models folder');
        this.addFolderIconMapping('controllers', '🎮', '#3F51B5', 'Controllers folder');
        this.addFolderIconMapping('views', '👁️', '#E91E63', 'Views folder');
        this.addFolderIconMapping('templates', '📄', '#E91E63', 'Templates folder');
    }

    private initializeFileAssociations(): void {
        // SunScript
        this.addFileAssociation('sun', 'text/sunscript', 'sunscript', 'monaco', true, false, true);
        
        // Web
        this.addFileAssociation('html', 'text/html', 'html', 'monaco', true, false, true);
        this.addFileAssociation('css', 'text/css', 'css', 'monaco', true, false, true);
        this.addFileAssociation('js', 'text/javascript', 'javascript', 'monaco', true, false, true);
        this.addFileAssociation('ts', 'text/typescript', 'typescript', 'monaco', true, false, true);
        this.addFileAssociation('jsx', 'text/jsx', 'jsx', 'monaco', true, false, true);
        this.addFileAssociation('tsx', 'text/tsx', 'tsx', 'monaco', true, false, true);
        
        // Data formats
        this.addFileAssociation('json', 'application/json', 'json', 'monaco', true, false, true);
        this.addFileAssociation('xml', 'text/xml', 'xml', 'monaco', true, false, true);
        this.addFileAssociation('yaml', 'text/yaml', 'yaml', 'monaco', true, false, true);
        this.addFileAssociation('yml', 'text/yaml', 'yaml', 'monaco', true, false, true);
        
        // Documentation
        this.addFileAssociation('md', 'text/markdown', 'markdown', 'monaco', true, false, true);
        this.addFileAssociation('txt', 'text/plain', 'plaintext', 'monaco', true, false, true);
        
        // Programming languages
        this.addFileAssociation('py', 'text/x-python', 'python', 'monaco', true, false, true);
        this.addFileAssociation('java', 'text/x-java', 'java', 'monaco', true, false, true);
        this.addFileAssociation('c', 'text/x-c', 'c', 'monaco', true, false, true);
        this.addFileAssociation('cpp', 'text/x-c++', 'cpp', 'monaco', true, false, true);
        this.addFileAssociation('cs', 'text/x-csharp', 'csharp', 'monaco', true, false, true);
        this.addFileAssociation('php', 'text/x-php', 'php', 'monaco', true, false, true);
        this.addFileAssociation('rb', 'text/x-ruby', 'ruby', 'monaco', true, false, true);
        this.addFileAssociation('go', 'text/x-go', 'go', 'monaco', true, false, true);
        this.addFileAssociation('rs', 'text/x-rust', 'rust', 'monaco', true, false, true);
        
        // Shell scripts
        this.addFileAssociation('sh', 'text/x-shellscript', 'shell', 'monaco', true, false, true);
        this.addFileAssociation('bash', 'text/x-shellscript', 'shell', 'monaco', true, false, true);
        this.addFileAssociation('ps1', 'text/x-powershell', 'powershell', 'monaco', true, false, true);
        
        // Images
        this.addFileAssociation('png', 'image/png', 'image', 'imageViewer', false, true, false);
        this.addFileAssociation('jpg', 'image/jpeg', 'image', 'imageViewer', false, true, false);
        this.addFileAssociation('jpeg', 'image/jpeg', 'image', 'imageViewer', false, true, false);
        this.addFileAssociation('gif', 'image/gif', 'image', 'imageViewer', false, true, false);
        this.addFileAssociation('svg', 'image/svg+xml', 'svg', 'monaco', true, false, true);
        
        // Archives
        this.addFileAssociation('zip', 'application/zip', 'archive', 'archiveViewer', false, true, false);
        this.addFileAssociation('tar', 'application/x-tar', 'archive', 'archiveViewer', false, true, false);
        this.addFileAssociation('gz', 'application/gzip', 'archive', 'archiveViewer', false, true, false);
        
        // Audio/Video
        this.addFileAssociation('mp3', 'audio/mpeg', 'audio', 'mediaPlayer', false, true, false);
        this.addFileAssociation('mp4', 'video/mp4', 'video', 'mediaPlayer', false, true, false);
        
        // PDF
        this.addFileAssociation('pdf', 'application/pdf', 'pdf', 'pdfViewer', false, true, false);
    }

    private addFileIconMapping(extension: string, icon: string, color?: string, description?: string): void {
        this.fileIconMappings.set(extension.toLowerCase(), {
            extension: extension.toLowerCase(),
            icon,
            color,
            description
        });
    }

    private addFolderIconMapping(folderName: string, icon: string, color?: string, description?: string): void {
        this.folderIconMappings.set(folderName.toLowerCase(), {
            folderName: folderName.toLowerCase(),
            icon,
            color,
            description
        });
    }

    private addFileAssociation(
        extension: string,
        mimeType: string,
        languageId?: string,
        editorId?: string,
        isText: boolean = true,
        isBinary: boolean = false,
        canEdit: boolean = true,
        defaultApplication?: string
    ): void {
        this.fileAssociations.set(extension.toLowerCase(), {
            extension: extension.toLowerCase(),
            mimeType,
            languageId,
            editorId,
            isText,
            isBinary,
            canEdit,
            defaultApplication
        });
    }

    // Public API methods
    getFileIcon(fileName: string): string {
        const extension = this.getFileExtension(fileName);
        const mapping = this.fileIconMappings.get(extension.toLowerCase()) || 
                       this.fileIconMappings.get(fileName.toLowerCase());
        return mapping?.icon || this.DEFAULT_FILE_ICON;
    }

    getFolderIcon(folderName: string, isOpen: boolean = false): string {
        const mapping = this.folderIconMappings.get(folderName.toLowerCase());
        if (mapping) {
            return mapping.icon;
        }
        return isOpen ? this.OPEN_FOLDER_ICON : this.DEFAULT_FOLDER_ICON;
    }

    getFileIconColor(fileName: string): string | undefined {
        const extension = this.getFileExtension(fileName);
        const mapping = this.fileIconMappings.get(extension.toLowerCase()) || 
                       this.fileIconMappings.get(fileName.toLowerCase());
        return mapping?.color;
    }

    getFolderIconColor(folderName: string): string | undefined {
        const mapping = this.folderIconMappings.get(folderName.toLowerCase());
        return mapping?.color;
    }

    getFileAssociation(fileName: string): FileAssociation | undefined {
        const extension = this.getFileExtension(fileName);
        return this.fileAssociations.get(extension.toLowerCase());
    }

    getLanguageId(fileName: string): string | undefined {
        return this.getFileAssociation(fileName)?.languageId;
    }

    getEditorId(fileName: string): string | undefined {
        return this.getFileAssociation(fileName)?.editorId || 'monaco';
    }

    getMimeType(fileName: string): string {
        return this.getFileAssociation(fileName)?.mimeType || 'text/plain';
    }

    canEditFile(fileName: string): boolean {
        return this.getFileAssociation(fileName)?.canEdit ?? true;
    }

    isTextFile(fileName: string): boolean {
        return this.getFileAssociation(fileName)?.isText ?? true;
    }

    isBinaryFile(fileName: string): boolean {
        return this.getFileAssociation(fileName)?.isBinary ?? false;
    }

    // Custom mappings
    addCustomFileIcon(extension: string, icon: string, color?: string, description?: string): void {
        this.addFileIconMapping(extension, icon, color, description);
        this.eventBus.emit('fileIcon.added', { extension, icon, color, description });
    }

    addCustomFolderIcon(folderName: string, icon: string, color?: string, description?: string): void {
        this.addFolderIconMapping(folderName, icon, color, description);
        this.eventBus.emit('folderIcon.added', { folderName, icon, color, description });
    }

    addCustomFileAssociation(association: FileAssociation): void {
        this.fileAssociations.set(association.extension.toLowerCase(), association);
        this.eventBus.emit('fileAssociation.added', { association });
    }

    removeFileIcon(extension: string): void {
        if (this.fileIconMappings.delete(extension.toLowerCase())) {
            this.eventBus.emit('fileIcon.removed', { extension });
        }
    }

    removeFolderIcon(folderName: string): void {
        if (this.folderIconMappings.delete(folderName.toLowerCase())) {
            this.eventBus.emit('folderIcon.removed', { folderName });
        }
    }

    removeFileAssociation(extension: string): void {
        if (this.fileAssociations.delete(extension.toLowerCase())) {
            this.eventBus.emit('fileAssociation.removed', { extension });
        }
    }

    // Theme support
    setIconTheme(themeName: string): void {
        // Implementation would load different icon sets based on theme
        this.eventBus.emit('iconTheme.changed', { themeName });
    }

    // Utility methods
    private getFileExtension(fileName: string): string {
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1) : '';
    }

    // Export/Import configurations
    exportIconConfiguration(): any {
        return {
            fileIcons: Array.from(this.fileIconMappings.values()),
            folderIcons: Array.from(this.folderIconMappings.values()),
            fileAssociations: Array.from(this.fileAssociations.values())
        };
    }

    importIconConfiguration(config: any): void {
        if (config.fileIcons) {
            config.fileIcons.forEach((mapping: FileIconMapping) => {
                this.fileIconMappings.set(mapping.extension, mapping);
            });
        }
        
        if (config.folderIcons) {
            config.folderIcons.forEach((mapping: FolderIconMapping) => {
                this.folderIconMappings.set(mapping.folderName, mapping);
            });
        }
        
        if (config.fileAssociations) {
            config.fileAssociations.forEach((association: FileAssociation) => {
                this.fileAssociations.set(association.extension, association);
            });
        }
        
        this.eventBus.emit('iconConfiguration.imported', { config });
    }

    // Search and discovery
    findFilesByIcon(icon: string): string[] {
        return Array.from(this.fileIconMappings.values())
            .filter(mapping => mapping.icon === icon)
            .map(mapping => mapping.extension);
    }

    findFoldersByIcon(icon: string): string[] {
        return Array.from(this.folderIconMappings.values())
            .filter(mapping => mapping.icon === icon)
            .map(mapping => mapping.folderName);
    }

    getAvailableLanguages(): string[] {
        return Array.from(new Set(
            Array.from(this.fileAssociations.values())
                .map(assoc => assoc.languageId)
                .filter(Boolean) as string[]
        ));
    }

    getFileExtensionsByLanguage(languageId: string): string[] {
        return Array.from(this.fileAssociations.values())
            .filter(assoc => assoc.languageId === languageId)
            .map(assoc => assoc.extension);
    }
}