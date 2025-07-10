import chalk from 'chalk';
import { marked } from 'marked';
import { terminal } from 'terminal-kit';

export interface UIOptions {
  width?: number;
  padding?: number;
}

export class UIRenderer {
  private width: number;
  private padding: number;

  constructor(options: UIOptions = {}) {
    this.width = options.width || process.stdout.columns || 80;
    this.padding = options.padding || 2;
  }

  renderMarkdown(content: string): string {
    const tokens = marked.lexer(content);
    return this.renderTokens(tokens);
  }

  private renderTokens(tokens: any[]): string {
    let output = '';
    
    for (const token of tokens) {
      switch (token.type) {
        case 'heading':
          output += this.renderHeading(token.text, token.depth);
          break;
        case 'paragraph':
          output += this.renderParagraph(token.text);
          break;
        case 'list':
          output += this.renderList(token.items);
          break;
        case 'code':
          output += this.renderCode(token.text, token.lang);
          break;
        case 'blockquote':
          output += this.renderBlockquote(token.text);
          break;
        case 'hr':
          output += this.renderHorizontalRule();
          break;
        default:
          if (token.text) {
            output += this.renderParagraph(token.text);
          }
      }
    }
    
    return output;
  }

  private renderHeading(text: string, depth: number): string {
    const colors = [
      chalk.blue.bold,      // h1
      chalk.cyan.bold,      // h2  
      chalk.green.bold,     // h3
      chalk.yellow.bold,    // h4
      chalk.magenta.bold,   // h5
      chalk.red.bold        // h6
    ];
    
    const color = colors[depth - 1] || chalk.white.bold;
    const prefix = '#'.repeat(depth);
    
    return `\n${color(`${prefix} ${text}`)}\n\n`;
  }

  private renderParagraph(text: string): string {
    const processed = this.processInlineFormatting(text);
    return `${processed}\n\n`;
  }

  private renderList(items: any[]): string {
    let output = '';
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const bullet = chalk.cyan('•');
      const text = this.processInlineFormatting(item.text);
      output += `${bullet} ${text}\n`;
    }
    
    return output + '\n';
  }

  private renderCode(text: string, lang?: string): string {
    const lines = text.split('\n');
    let output = '\n';
    
    // Add top border
    output += chalk.gray('┌' + '─'.repeat(this.width - 4) + '┐\n');
    
    // Add code content
    for (const line of lines) {
      const paddedLine = line.padEnd(this.width - 6);
      output += chalk.gray('│ ') + chalk.white(paddedLine) + chalk.gray(' │\n');
    }
    
    // Add bottom border
    output += chalk.gray('└' + '─'.repeat(this.width - 4) + '┘\n');
    
    return output + '\n';
  }

  private renderBlockquote(text: string): string {
    const processed = this.processInlineFormatting(text);
    const lines = processed.split('\n');
    let output = '\n';
    
    for (const line of lines) {
      output += chalk.gray('│ ') + chalk.italic(line) + '\n';
    }
    
    return output + '\n';
  }

  private renderHorizontalRule(): string {
    return '\n' + chalk.gray('─'.repeat(this.width - 4)) + '\n\n';
  }

  private processInlineFormatting(text: string): string {
    // Process bold
    text = text.replace(/\*\*(.*?)\*\*/g, (_, content) => chalk.bold(content));
    
    // Process italic
    text = text.replace(/\*(.*?)\*/g, (_, content) => chalk.italic(content));
    
    // Process code
    text = text.replace(/`(.*?)`/g, (_, content) => chalk.bgGray.black(` ${content} `));
    
    // Process links (just highlight them)
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, (_, linkText) => chalk.blue.underline(linkText));
    
    return text;
  }

  renderBorderedInput(prompt: string): string {
    const promptWidth = this.width - 4;
    const topBorder = '┌' + '─'.repeat(promptWidth) + '┐';
    const promptLine = '│ ' + prompt.padEnd(promptWidth - 2) + '│';
    const inputLine = '│ ' + ''.padEnd(promptWidth - 2) + '│';
    const bottomBorder = '└' + '─'.repeat(promptWidth) + '┘';
    
    return chalk.gray(topBorder) + '\n' + 
           chalk.gray(promptLine) + '\n' + 
           chalk.gray(inputLine) + '\n' + 
           chalk.gray(bottomBorder);
  }

  renderConversationSeparator(): string {
    return '\n' + chalk.gray('─'.repeat(this.width - 4)) + '\n';
  }

  renderUserMessage(message: string): string {
    return chalk.cyan.bold('You: ') + chalk.white(message);
  }

  renderAssistantMessage(message: string): string {
    const rendered = this.renderMarkdown(message);
    return chalk.blue.bold('🤖 AI: ') + rendered;
  }

  renderSystemMessage(message: string): string {
    return chalk.yellow('ℹ️  ') + chalk.gray(message);
  }

  renderSuccessMessage(message: string): string {
    return chalk.green('✅ ') + chalk.white(message);
  }

  renderErrorMessage(message: string): string {
    return chalk.red('❌ ') + chalk.white(message);
  }

  renderWarningMessage(message: string): string {
    return chalk.yellow('⚠️  ') + chalk.white(message);
  }

  renderProgressMessage(message: string): string {
    return chalk.blue('🔄 ') + chalk.gray(message);
  }

  clearLine(): void {
    process.stdout.write('\u001b[1A\u001b[2K');
  }

  moveCursorUp(lines: number = 1): void {
    process.stdout.write(`\u001b[${lines}A`);
  }

  clearLines(lines: number): void {
    for (let i = 0; i < lines; i++) {
      process.stdout.write('\u001b[1A\u001b[2K');
    }
  }
}

export const ui = new UIRenderer();