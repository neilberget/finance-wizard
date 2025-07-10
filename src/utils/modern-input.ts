import { input, editor } from '@inquirer/prompts';
import chalk from 'chalk';

export interface ModernInputOptions {
  message: string;
  placeholder?: string;
  multiline?: boolean;
  validate?: (input: string) => boolean | string;
}

export class ModernInput {
  async prompt(options: ModernInputOptions): Promise<string> {
    try {
      // Use editor for multiline input with better handling
      if (options.multiline) {
        const result = await editor({
          message: options.message,
          default: '',
          validate: (input: string) => {
            if (options.validate) {
              const validation = options.validate(input.trim());
              if (validation !== true) {
                return typeof validation === 'string' ? validation : 'Invalid input';
              }
            }
            return true;
          },
          waitForUseInput: false
        });
        
        return result.trim();
      }

      // Use regular input for single line with simple prompt
      const result = await input({
        message: '>',
        default: '',
        validate: (input: string) => {
          if (input.trim().length === 0) {
            return 'Please enter a message';
          }
          if (options.validate) {
            const validation = options.validate(input.trim());
            if (validation !== true) {
              return typeof validation === 'string' ? validation : 'Invalid input';
            }
          }
          return true;
        }
      });

      return result.trim();
    } catch (error: any) {
      if (error?.name === 'ExitPromptError') {
        process.exit(0);
      }
      throw error;
    }
  }
}

export const modernInput = new ModernInput();