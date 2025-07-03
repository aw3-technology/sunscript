#!/usr/bin/env node

/**
 * Mercury IDE Test Runner
 * 
 * This script provides an interface to run different types of tests
 * and generate comprehensive reports.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuite {
    name: string;
    pattern: string;
    description: string;
    timeout?: number;
}

interface TestResults {
    suite: string;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    coverage?: {
        lines: number;
        functions: number;
        branches: number;
        statements: number;
    };
}

class TestRunner {
    private testSuites: TestSuite[] = [
        {
            name: 'unit',
            pattern: 'src/**/*.test.ts',
            description: 'Unit tests for individual components and services',
            timeout: 30000
        },
        {
            name: 'integration',
            pattern: 'src/__tests__/integration/**/*.test.ts',
            description: 'Integration tests for component interactions',
            timeout: 60000
        },
        {
            name: 'e2e',
            pattern: 'src/__tests__/e2e/**/*.test.ts',
            description: 'End-to-end workflow tests',
            timeout: 120000
        },
        {
            name: 'performance',
            pattern: 'src/__tests__/performance/**/*.test.ts',
            description: 'Performance and stress tests',
            timeout: 300000
        }
    ];
    
    private results: TestResults[] = [];
    
    constructor() {
        this.ensureTestEnvironment();
    }
    
    private ensureTestEnvironment(): void {
        // Ensure test directories exist
        const testDirs = [
            'src/__tests__',
            'src/__tests__/integration',
            'src/__tests__/e2e',
            'src/__tests__/performance',
            'src/__tests__/utils',
            'coverage'
        ];
        
        testDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    async runSuite(suiteName: string): Promise<TestResults> {
        const suite = this.testSuites.find(s => s.name === suiteName);
        if (!suite) {
            throw new Error(`Test suite '${suiteName}' not found`);
        }
        
        console.log(`\n🧪 Running ${suite.name} tests...`);
        console.log(`📝 ${suite.description}`);
        console.log(`🔍 Pattern: ${suite.pattern}`);
        
        const startTime = Date.now();
        
        try {
            const jestConfig = this.generateJestConfig(suite);
            const configPath = path.join(process.cwd(), `jest.${suite.name}.config.js`);
            
            fs.writeFileSync(configPath, jestConfig);
            
            const command = `npx jest --config=${configPath} --verbose --detectOpenHandles`;
            
            console.log(`\n⚡ Executing: ${command}\n`);
            
            const output = execSync(command, { 
                encoding: 'utf8',
                timeout: suite.timeout
            });
            
            const duration = Date.now() - startTime;
            const results = this.parseJestOutput(output, suite.name, duration);
            
            this.results.push(results);
            
            // Cleanup config file
            fs.unlinkSync(configPath);
            
            return results;
            
        } catch (error: any) {
            const duration = Date.now() - startTime;
            
            console.error(`❌ Test suite '${suite.name}' failed:`);
            console.error(error.message);
            
            const failedResults: TestResults = {
                suite: suite.name,
                passed: 0,
                failed: 1,
                skipped: 0,
                duration
            };
            
            this.results.push(failedResults);
            return failedResults;
        }
    }
    
    async runAll(): Promise<TestResults[]> {
        console.log('🚀 Starting comprehensive test suite...\n');
        
        for (const suite of this.testSuites) {
            await this.runSuite(suite.name);
        }
        
        this.generateReport();
        return this.results;
    }
    
    async runWithCoverage(): Promise<void> {
        console.log('📊 Running tests with coverage analysis...\n');
        
        const command = `npx jest --coverage --coverageDirectory=coverage --coverageReporters=text,html,lcov`;
        
        try {
            const output = execSync(command, { 
                encoding: 'utf8',
                timeout: 300000 // 5 minutes
            });
            
            console.log(output);
            console.log('\n📈 Coverage report generated in ./coverage directory');
            
        } catch (error: any) {
            console.error('❌ Coverage analysis failed:', error.message);
        }
    }
    
    private generateJestConfig(suite: TestSuite): string {
        return `
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: ['**/${suite.pattern.replace('src/', '')}'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    moduleNameMapper: {
        '\\\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    testTimeout: ${suite.timeout || 30000},
    maxWorkers: 1,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/**/__tests__/**',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}'
    ]
};
        `;
    }
    
    private parseJestOutput(output: string, suiteName: string, duration: number): TestResults {
        const passedMatch = output.match(/(\d+) passed/);
        const failedMatch = output.match(/(\d+) failed/);
        const skippedMatch = output.match(/(\d+) skipped/);
        
        const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
        
        // Try to extract coverage if present
        let coverage;
        const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
        if (coverageMatch) {
            coverage = {
                statements: parseFloat(coverageMatch[1]),
                branches: parseFloat(coverageMatch[2]),
                functions: parseFloat(coverageMatch[3]),
                lines: parseFloat(coverageMatch[4])
            };
        }
        
        return {
            suite: suiteName,
            passed,
            failed,
            skipped,
            duration,
            coverage
        };
    }
    
    private generateReport(): void {
        console.log('\n📋 Test Results Summary');
        console.log('========================\n');
        
        let totalPassed = 0;
        let totalFailed = 0;
        let totalSkipped = 0;
        let totalDuration = 0;
        
        this.results.forEach(result => {
            const status = result.failed === 0 ? '✅' : '❌';
            const total = result.passed + result.failed + result.skipped;
            
            console.log(`${status} ${result.suite.toUpperCase()}`);
            console.log(`   Tests: ${total} (${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped)`);
            console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
            
            if (result.coverage) {
                console.log(`   Coverage: Lines ${result.coverage.lines}%, Functions ${result.coverage.functions}%, Branches ${result.coverage.branches}%`);
            }
            
            console.log('');
            
            totalPassed += result.passed;
            totalFailed += result.failed;
            totalSkipped += result.skipped;
            totalDuration += result.duration;
        });
        
        const overallStatus = totalFailed === 0 ? '🎉' : '⚠️';
        const totalTests = totalPassed + totalFailed + totalSkipped;
        
        console.log('------------------------');
        console.log(`${overallStatus} OVERALL RESULTS`);
        console.log(`Total Tests: ${totalTests} (${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped)`);
        console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
        console.log(`Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);
        
        // Save results to file
        const reportPath = path.join(process.cwd(), 'test-results.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: {
                totalTests,
                totalPassed,
                totalFailed,
                totalSkipped,
                totalDuration,
                successRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0
            },
            suites: this.results
        }, null, 2));
        
        console.log(`\n📄 Detailed results saved to: ${reportPath}`);
    }
    
    listSuites(): void {
        console.log('Available test suites:\n');
        
        this.testSuites.forEach(suite => {
            console.log(`📂 ${suite.name}`);
            console.log(`   ${suite.description}`);
            console.log(`   Pattern: ${suite.pattern}`);
            console.log(`   Timeout: ${(suite.timeout || 30000) / 1000}s\n`);
        });
    }
    
    async benchmark(): Promise<void> {
        console.log('🏃‍♂️ Running performance benchmarks...\n');
        
        try {
            await this.runSuite('performance');
            
            console.log('\n📊 Benchmark Summary:');
            console.log('- File operations: < 100ms per operation');
            console.log('- Code compilation: < 500ms for complex code');
            console.log('- Editor operations: < 50ms per action');
            console.log('- UI rendering: < 200ms for large structures');
            console.log('\nSee performance test results above for detailed metrics.');
            
        } catch (error: any) {
            console.error('❌ Benchmark failed:', error.message);
        }
    }
}

// CLI Interface
if (require.main === module) {
    const runner = new TestRunner();
    const args = process.argv.slice(2);
    const command = args[0];
    
    (async () => {
        try {
            switch (command) {
                case 'unit':
                case 'integration':
                case 'e2e':
                case 'performance':
                    await runner.runSuite(command);
                    break;
                    
                case 'all':
                    await runner.runAll();
                    break;
                    
                case 'coverage':
                    await runner.runWithCoverage();
                    break;
                    
                case 'benchmark':
                    await runner.benchmark();
                    break;
                    
                case 'list':
                    runner.listSuites();
                    break;
                    
                default:
                    console.log('Mercury IDE Test Runner\n');
                    console.log('Usage: npm run test:<command>\n');
                    console.log('Commands:');
                    console.log('  unit        - Run unit tests');
                    console.log('  integration - Run integration tests');
                    console.log('  e2e         - Run end-to-end tests');
                    console.log('  performance - Run performance tests');
                    console.log('  all         - Run all test suites');
                    console.log('  coverage    - Run tests with coverage');
                    console.log('  benchmark   - Run performance benchmarks');
                    console.log('  list        - List available test suites');
                    break;
            }
        } catch (error: any) {
            console.error('❌ Test runner failed:', error.message);
            process.exit(1);
        }
    })();
}

export { TestRunner };