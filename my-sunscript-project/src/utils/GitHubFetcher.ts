import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

export interface GitHubFetchOptions {
  owner: string;
  repo: string;
  branch?: string;
  outputDir: string;
  tempDir?: string;
}

export class GitHubFetcher {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), '.sunscript-temp');
  }

  async fetchRepository(options: GitHubFetchOptions): Promise<string> {
    const { owner, repo, branch = 'main', outputDir } = options;
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    const cloneDir = path.join(this.tempDir, `${owner}-${repo}`);

    try {
      // Create temp directory
      await fs.mkdir(this.tempDir, { recursive: true });

      console.log(chalk.cyan(`📦 Cloning ${owner}/${repo}...`));
      
      // Clone the repository
      await execAsync(`git clone --depth 1 --branch ${branch} ${repoUrl} ${cloneDir}`);
      
      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });
      
      // Copy files to output directory
      await this.copyDirectory(cloneDir, outputDir);
      
      console.log(chalk.green(`✅ Repository fetched to ${outputDir}`));
      
      return cloneDir;
      
    } finally {
      // Clean up temp directory
      await this.cleanup();
    }
  }

  async fetchFromUrl(githubUrl: string, outputDir: string): Promise<string> {
    // Parse GitHub URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL. Format: https://github.com/owner/repo');
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    return this.fetchRepository({
      owner,
      repo: cleanRepo,
      outputDir
    });
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      // Skip .git directory
      if (entry.name === '.git') {
        continue;
      }

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}