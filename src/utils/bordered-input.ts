import { createInterface } from 'readline';
import chalk from 'chalk';

export interface BorderedInputOptions {
  validate?: (input: string) => boolean | string;
}

export class BorderedInput {
  private width: number;
  private rl: any;

  constructor() {
    this.width = process.stdout.columns || 80;
  }

  async prompt(options: BorderedInputOptions = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create readline interface
      this.rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
      });

      // Enable raw mode for better control
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }

      let inputText = '';
      let cursorPos = 0;

      // Render the bordered input box
      this.renderBorder();
      this.positionCursor();

      const handleKeypress = (chunk: Buffer) => {
        const key = chunk.toString();
        const keyCode = chunk[0];

        // Handle Ctrl+C
        if (keyCode === 3) {
          this.cleanup();
          process.exit(0);
        }

        // Handle Enter
        if (keyCode === 13) {
          if (options.validate) {
            const validation = options.validate(inputText.trim());
            if (validation !== true) {
              const errorMessage = typeof validation === 'string' ? validation : 'Invalid input';
              this.showError(errorMessage);
              return;
            }
          }
          this.cleanup();
          resolve(inputText.trim());
          return;
        }

        // Handle Backspace
        if (keyCode === 127 || keyCode === 8) {
          if (cursorPos > 0) {
            inputText = inputText.slice(0, cursorPos - 1) + inputText.slice(cursorPos);
            cursorPos--;
            this.updateDisplay(inputText, cursorPos);
          }
          return;
        }

        // Handle Ctrl+A (beginning of line)
        if (keyCode === 1) {
          cursorPos = 0;
          this.updateDisplay(inputText, cursorPos);
          return;
        }

        // Handle Ctrl+E (end of line)
        if (keyCode === 5) {
          cursorPos = inputText.length;
          this.updateDisplay(inputText, cursorPos);
          return;
        }

        // Handle arrow keys
        if (keyCode === 27 && chunk.length >= 3) {
          const arrowKey = chunk[2];
          if (arrowKey === 67 && cursorPos < inputText.length) { // Right arrow
            cursorPos++;
            this.updateDisplay(inputText, cursorPos);
          } else if (arrowKey === 68 && cursorPos > 0) { // Left arrow
            cursorPos--;
            this.updateDisplay(inputText, cursorPos);
          }
          return;
        }

        // Handle regular characters
        if (keyCode >= 32 && keyCode <= 126) {
          inputText = inputText.slice(0, cursorPos) + key + inputText.slice(cursorPos);
          cursorPos++;
          this.updateDisplay(inputText, cursorPos);
        }
      };

      process.stdin.on('data', handleKeypress);
    });
  }

  private renderBorder(): void {
    const maxWidth = Math.min(this.width - 4, 100);
    
    const topBorder = '┌' + '─'.repeat(maxWidth) + '┐';
    const inputLine = '│' + ' '.repeat(maxWidth) + '│';
    const bottomBorder = '└' + '─'.repeat(maxWidth) + '┘';
    
    console.log(chalk.gray(topBorder));
    console.log(chalk.gray(inputLine));
    console.log(chalk.gray(bottomBorder));
  }

  private positionCursor(): void {
    // Move cursor up to input line and position it inside the box
    process.stdout.write('\u001b[2A'); // Up 2 lines
    process.stdout.write('\u001b[3C'); // Right 3 characters
  }

  private updateDisplay(text: string, cursorPos: number): void {
    const maxWidth = Math.min(this.width - 6, 98); // Account for borders
    
    // Clear the input line
    process.stdout.write('\u001b[2K'); // Clear line
    process.stdout.write('\u001b[1G'); // Go to beginning
    
    // Truncate text if too long
    let displayText = text;
    if (displayText.length > maxWidth) {
      displayText = displayText.slice(0, maxWidth);
      cursorPos = Math.min(cursorPos, maxWidth);
    }
    
    // Draw the input line with border
    process.stdout.write(chalk.gray('│ ') + displayText.padEnd(maxWidth) + chalk.gray('│'));
    
    // Position cursor
    const displayCursorPos = Math.min(cursorPos, maxWidth);
    process.stdout.write(`\u001b[${3 + displayCursorPos}G`);
  }

  private showError(message: string): void {
    // Move below the input box
    process.stdout.write('\u001b[2B\u001b[1G');
    console.log(chalk.red('❌ ') + message);
    
    // Move back to input
    process.stdout.write('\u001b[3A');
    process.stdout.write('\u001b[3C');
  }

  private cleanup(): void {
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    // Move cursor below the input box
    process.stdout.write('\u001b[2B\u001b[1G');
    console.log(); // Add a new line
  }
}

export const borderedInput = new BorderedInput();