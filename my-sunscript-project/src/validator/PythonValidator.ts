import { Validator, ValidationResult, ValidationError } from './Validator';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export class PythonValidator extends Validator {
  getLanguage(): string {
    return 'python';
  }

  async validate(code: string, fileName: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    try {
      // Write code to a temporary file
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sunscript-'));
      const tempFile = path.join(tempDir, 'temp.py');
      await fs.writeFile(tempFile, code);

      // Use Python's ast module to check syntax
      const pythonCheck = `
import ast
import sys
try:
    with open('${tempFile}', 'r') as f:
        ast.parse(f.read())
    print("OK")
except SyntaxError as e:
    print(f"ERROR:{e.lineno}:{e.offset}:{e.msg}")
`;

      const { stdout, stderr } = await execAsync(`python3 -c "${pythonCheck}"`);
      
      // Clean up temp file
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);

      if (stdout.trim() === 'OK') {
        return { valid: true, errors: [], warnings: [] };
      } else if (stdout.startsWith('ERROR:')) {
        const [_, line, column, message] = stdout.trim().split(':');
        errors.push({
          line: parseInt(line),
          column: parseInt(column),
          message,
          severity: 'error'
        });
      }
    } catch (error: any) {
      errors.push({
        line: 1,
        column: 1,
        message: `Python validation failed: ${error.message}`,
        severity: 'fatal'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}