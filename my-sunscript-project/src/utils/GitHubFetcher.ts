import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { SecureShellManager } from '../security/SecureShellManager';
import { PathSecurityManager } from '../security/PathSecurityManager';

export interface GitHubFetchOptions {
  owner: string;
  repo: string;
  branch?: string;
  outputDir: string;
  tempDir?: string;
}

export class GitHubFetcher {
  private tempDir?: string;

  async fetchRepository(options: GitHubFetchOptions): Promise<string> {
    const { owner, repo, branch = 'main', outputDir } = options;
    
    // Validate repository details
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    const urlValidation = PathSecurityManager.validateGitHubUrl(repoUrl);
    if (!urlValidation.valid) {
      throw new Error(`Invalid repository: ${urlValidation.errors.join(', ')}`);
    }

    // Validate output directory
    const outputValidation = await PathSecurityManager.validatePath(outputDir, {
      allowedDirectories: PathSecurityManager.getProjectBoundaries()
    });
    if (!outputValidation.valid) {
      throw new Error(`Invalid output directory: ${outputValidation.errors.join(', ')}`);
    }

    try {
      // Create secure temp directory
      this.tempDir = await SecureShellManager.createTempDirectory('github-clone-');
      const sanitizedRepoName = PathSecurityManager.sanitizeFilename(`${owner}-${repo}`);
      const cloneDir = await PathSecurityManager.safePath(this.tempDir, sanitizedRepoName);

      console.log(chalk.cyan(`📦 Cloning ${owner}/${repo}...`));
      
      // Clone the repository using secure shell execution
      await SecureShellManager.executeGitCommand([
        'clone',
        '--depth', '1',
        '--branch', branch,
        repoUrl,
        cloneDir
      ], undefined, {
        timeout: 60000,
        validateOutput: true
      });
      
      // Create output directory safely
      await PathSecurityManager.createSafeDirectory(outputValidation.resolvedPath, true);
      
      // Copy files to output directory
      await this.copyDirectory(cloneDir, outputValidation.resolvedPath);
      
      console.log(chalk.green(`✅ Repository fetched to ${path.relative(process.cwd(), outputValidation.resolvedPath)}`));
      
      return cloneDir;
      
    } finally {
      // Clean up temp directory
      await this.cleanup();
    }
  }

  async fetchFromUrl(githubUrl: string, outputDir: string): Promise<string> {
    // Validate GitHub URL using security manager
    const urlValidation = PathSecurityManager.validateGitHubUrl(githubUrl);
    if (!urlValidation.valid) {
      throw new Error(`Invalid GitHub URL: ${urlValidation.errors.join(', ')}`);
    }

    return this.fetchRepository({
      owner: urlValidation.owner!,
      repo: urlValidation.repo!,
      outputDir
    });
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    // Validate both source and destination paths
    const srcValidation = await PathSecurityManager.validatePath(src, {
      requireExists: true,
      allowedDirectories: [this.tempDir!]
    });

    const destValidation = await PathSecurityManager.validatePath(dest, {
      allowedDirectories: PathSecurityManager.getProjectBoundaries()
    });

    if (!srcValidation.valid || !destValidation.valid) {
      throw new Error(`Invalid copy paths: ${[...srcValidation.errors, ...destValidation.errors].join(', ')}`);
    }

    const entries = await fs.readdir(srcValidation.resolvedPath, { withFileTypes: true });

    for (const entry of entries) {
      // Sanitize entry name
      const safeName = PathSecurityManager.sanitizeFilename(entry.name);
      
      // Skip dangerous files and directories
      if (entry.name === '.git' || 
          entry.name.startsWith('.') && entry.name.length > 1 ||
          entry.name !== safeName) {
        continue;
      }

      const srcPath = await PathSecurityManager.safePath(srcValidation.resolvedPath, safeName);
      const destPath = await PathSecurityManager.safePath(destValidation.resolvedPath, safeName);

      if (entry.isDirectory()) {
        await PathSecurityManager.createSafeDirectory(destPath, true);
        await this.copyDirectory(srcPath, destPath);
      } else {
        // Validate file extension before copying
        const ext = path.extname(safeName).toLowerCase();
        const allowedExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', 
                                   '.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.lock',
                                   '.html', '.css', '.scss', '.less'];
        
        if (allowedExtensions.includes(ext) || !ext) {
          await fs.copyFile(srcPath, destPath);
        }
      }
    }
  }

  private async cleanup(): Promise<void> {
    if (this.tempDir) {
      await SecureShellManager.cleanupTempDirectory(this.tempDir);
      this.tempDir = undefined;
    }
  }
}