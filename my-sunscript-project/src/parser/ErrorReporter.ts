import { ParseError } from './ErrorRecovery';
import { LexerErrorInfo } from '../lexer/Lexer';
import { ErrorFormatter, DiagnosticInfo } from './ErrorFormatter';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ErrorReport {
  file: string;
  timestamp: Date;
  totalErrors: number;
  lexerErrors: LexerErrorInfo[];
  parseErrors: ParseError[];
  diagnostics: DiagnosticInfo[];
  formattedReport: string;
  suggestions: string[];
}

export interface ErrorStatistics {
  totalFiles: number;
  totalErrors: number;
  lexerErrors: number;
  parseErrors: number;
  mostCommonErrors: { [errorCode: string]: number };
  errorsByFile: { [file: string]: number };
}

export class ErrorReporter extends EventEmitter {
  private reports: Map<string, ErrorReport> = new Map();
  private statistics: ErrorStatistics = {
    totalFiles: 0,
    totalErrors: 0,
    lexerErrors: 0,
    parseErrors: 0,
    mostCommonErrors: {},
    errorsByFile: {}
  };

  /**
   * Add an error report for a file
   */
  addReport(
    filePath: string,
    sourceCode: string,
    parseErrors: ParseError[],
    lexerErrors: LexerErrorInfo[]
  ): ErrorReport {
    const report: ErrorReport = {
      file: filePath,
      timestamp: new Date(),
      totalErrors: parseErrors.length + lexerErrors.length,
      lexerErrors,
      parseErrors,
      diagnostics: ErrorFormatter.createDiagnostics(sourceCode, parseErrors, lexerErrors),
      formattedReport: ErrorFormatter.createErrorReport(sourceCode, parseErrors, lexerErrors),
      suggestions: this.generateFileSuggestions(parseErrors, lexerErrors)
    };

    this.reports.set(filePath, report);
    this.updateStatistics(filePath, parseErrors, lexerErrors);
    
    this.emit('report:added', report);
    return report;
  }

  /**
   * Get error report for a specific file
   */
  getReport(filePath: string): ErrorReport | undefined {
    return this.reports.get(filePath);
  }

  /**
   * Get all error reports
   */
  getAllReports(): ErrorReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Get error statistics
   */
  getStatistics(): ErrorStatistics {
    return { ...this.statistics };
  }

  /**
   * Clear all reports
   */
  clearReports(): void {
    this.reports.clear();
    this.resetStatistics();
    this.emit('reports:cleared');
  }

  /**
   * Generate summary report for all files
   */
  generateSummaryReport(): string {
    const reports = this.getAllReports();
    const stats = this.getStatistics();
    
    if (reports.length === 0) {
      return '✅ No error reports found. All files processed successfully!';
    }

    const lines: string[] = [];
    lines.push('📊 SunScript Error Summary Report');
    lines.push('=' .repeat(40));
    lines.push(`📁 Files processed: ${stats.totalFiles}`);
    lines.push(`🚨 Total errors: ${stats.totalErrors}`);
    lines.push(`📝 Lexer errors: ${stats.lexerErrors}`);
    lines.push(`🔍 Parser errors: ${stats.parseErrors}`);
    lines.push('');

    // Most common errors
    if (Object.keys(stats.mostCommonErrors).length > 0) {
      lines.push('🔥 Most Common Errors:');
      const sortedErrors = Object.entries(stats.mostCommonErrors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      sortedErrors.forEach(([error, count], index) => {
        lines.push(`   ${index + 1}. ${error}: ${count} occurrences`);
      });
      lines.push('');
    }

    // Files with most errors
    if (Object.keys(stats.errorsByFile).length > 0) {
      lines.push('📁 Files with Most Errors:');
      const sortedFiles = Object.entries(stats.errorsByFile)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      sortedFiles.forEach(([file, count], index) => {
        lines.push(`   ${index + 1}. ${path.basename(file)}: ${count} errors`);
      });
      lines.push('');
    }

    // General recommendations
    lines.push('💡 General Recommendations:');
    const recommendations = this.generateGeneralRecommendations(reports);
    recommendations.forEach(rec => {
      lines.push(`   • ${rec}`);
    });

    return lines.join('\n');
  }

  /**
   * Export error reports to JSON file
   */
  async exportToJSON(outputPath: string): Promise<void> {
    const exportData = {
      timestamp: new Date().toISOString(),
      statistics: this.statistics,
      reports: this.getAllReports().map(report => ({
        ...report,
        timestamp: report.timestamp.toISOString()
      }))
    };

    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
    this.emit('export:completed', { format: 'json', path: outputPath });
  }

  /**
   * Export error reports to CSV file
   */
  async exportToCSV(outputPath: string): Promise<void> {
    const reports = this.getAllReports();
    if (reports.length === 0) {
      await fs.writeFile(outputPath, 'No errors to export\n', 'utf8');
      return;
    }

    const csvLines: string[] = [];
    csvLines.push('File,Type,Severity,Line,Column,Message,ErrorCode,Suggestions');

    reports.forEach(report => {
      // Add lexer errors
      report.lexerErrors.forEach(error => {
        const line = [
          `"${report.file}"`,
          'lexer',
          'error',
          error.position.line,
          error.position.column,
          `"${error.message.replace(/"/g, '""')}"`,
          'lexer-error',
          `"${error.suggestions.join('; ').replace(/"/g, '""')}"`
        ].join(',');
        csvLines.push(line);
      });

      // Add parser errors
      report.parseErrors.forEach(error => {
        const line = [
          `"${report.file}"`,
          'parser',
          error.severity,
          error.position.line,
          error.position.column,
          `"${error.message.replace(/"/g, '""')}"`,
          error.errorCode || 'unknown',
          `"${error.suggestions.join('; ').replace(/"/g, '""')}"`
        ].join(',');
        csvLines.push(line);
      });
    });

    await fs.writeFile(outputPath, csvLines.join('\n'), 'utf8');
    this.emit('export:completed', { format: 'csv', path: outputPath });
  }

  /**
   * Watch for file changes and update reports
   */
  watchFile(filePath: string): void {
    // This would integrate with a file system watcher
    // For now, it's a placeholder for future implementation
    this.emit('watch:started', { file: filePath });
  }

  /**
   * Update statistics when a new report is added
   */
  private updateStatistics(
    filePath: string,
    parseErrors: ParseError[],
    lexerErrors: LexerErrorInfo[]
  ): void {
    const totalErrors = parseErrors.length + lexerErrors.length;
    
    this.statistics.totalFiles++;
    this.statistics.totalErrors += totalErrors;
    this.statistics.lexerErrors += lexerErrors.length;
    this.statistics.parseErrors += parseErrors.length;
    this.statistics.errorsByFile[filePath] = totalErrors;

    // Track common error codes
    parseErrors.forEach(error => {
      if (error.errorCode) {
        this.statistics.mostCommonErrors[error.errorCode] = 
          (this.statistics.mostCommonErrors[error.errorCode] || 0) + 1;
      }
    });

    lexerErrors.forEach(error => {
      const code = 'LEXER_ERROR';
      this.statistics.mostCommonErrors[code] = 
        (this.statistics.mostCommonErrors[code] || 0) + 1;
    });
  }

  /**
   * Reset statistics
   */
  private resetStatistics(): void {
    this.statistics = {
      totalFiles: 0,
      totalErrors: 0,
      lexerErrors: 0,
      parseErrors: 0,
      mostCommonErrors: {},
      errorsByFile: {}
    };
  }

  /**
   * Generate file-specific suggestions
   */
  private generateFileSuggestions(
    parseErrors: ParseError[],
    lexerErrors: LexerErrorInfo[]
  ): string[] {
    const suggestions = new Set<string>();

    // Add suggestions from individual errors
    parseErrors.forEach(error => {
      error.suggestions.forEach(s => suggestions.add(s));
    });

    lexerErrors.forEach(error => {
      error.suggestions.forEach(s => suggestions.add(s));
    });

    // Add pattern-based suggestions
    if (parseErrors.some(e => e.errorCode === 'MISSING_OPEN_BRACE')) {
      suggestions.add('Consider using proper block structure: function name { content }');
    }

    if (lexerErrors.some(e => e.message.includes('non-ASCII'))) {
      suggestions.add('Use only ASCII characters in SunScript source code');
    }

    if (parseErrors.some(e => e.errorCode === 'POSSIBLE_MISSPELLING')) {
      suggestions.add('Enable spell-checking for SunScript keywords in your editor');
    }

    return Array.from(suggestions);
  }

  /**
   * Generate general recommendations based on all reports
   */
  private generateGeneralRecommendations(reports: ErrorReport[]): string[] {
    const recommendations: string[] = [];
    
    const totalErrors = reports.reduce((sum, r) => sum + r.totalErrors, 0);
    const lexerErrorsCount = reports.reduce((sum, r) => sum + r.lexerErrors.length, 0);
    const parseErrorsCount = reports.reduce((sum, r) => sum + r.parseErrors.length, 0);

    if (lexerErrorsCount > parseErrorsCount) {
      recommendations.push('Focus on fixing character encoding and input validation issues first');
    } else {
      recommendations.push('Focus on syntax structure and SunScript language constructs');
    }

    if (totalErrors > 10) {
      recommendations.push('Consider using SunScript formatting tools to auto-fix common issues');
      recommendations.push('Set up pre-commit hooks to catch errors early');
    }

    recommendations.push('Use SunScript language server for real-time error detection');
    recommendations.push('Review SunScript documentation for proper syntax patterns');

    return recommendations;
  }
}

// Global error reporter instance
export const globalErrorReporter = new ErrorReporter();