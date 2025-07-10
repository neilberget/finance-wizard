import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import * as readline from 'readline';

interface OnboardingConfig {
  ynabAccessToken?: string;
  anthropicApiKey?: string;
}

export class OnboardingManager {
  private envFilePath: string;

  constructor() {
    this.envFilePath = join(process.cwd(), '.env');
  }

  private createReadlineInterface(): readline.Interface {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async promptForInput(question: string): Promise<string> {
    const rl = this.createReadlineInterface();
    
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  private displayWelcomeMessage(): void {
    console.log(chalk.cyan('🧙 Welcome to Finance Wizard!'));
    console.log(chalk.white('To get started, we need to set up your API keys.\n'));
  }

  private displayYnabInstructions(): void {
    console.log(chalk.yellow('📊 YNAB Personal Access Token'));
    console.log(chalk.white('To get your YNAB Personal Access Token:'));
    console.log(chalk.white('1. Go to: https://app.ynab.com/settings/developer'));
    console.log(chalk.white('2. Click "New Token"'));
    console.log(chalk.white('3. Copy the generated token (long string of letters and numbers)'));
    console.log();
  }

  private displayAnthropicInstructions(): void {
    console.log(chalk.yellow('🤖 Anthropic API Key'));
    console.log(chalk.white('To get your Anthropic API Key:'));
    console.log(chalk.white('1. Go to: https://console.anthropic.com/settings/keys'));
    console.log(chalk.white('2. Click "Create Key"'));
    console.log(chalk.white('3. Give it a name (e.g., "Finance Wizard")'));
    console.log(chalk.white('4. Copy the API key (starts with "sk-")'));
    console.log();
  }

  private saveToEnvFile(config: OnboardingConfig): void {
    let envContent = '';
    
    if (existsSync(this.envFilePath)) {
      envContent = require('fs').readFileSync(this.envFilePath, 'utf8');
    }

    // Update or add YNAB token
    if (config.ynabAccessToken) {
      if (envContent.includes('YNAB_ACCESS_TOKEN=')) {
        envContent = envContent.replace(
          /YNAB_ACCESS_TOKEN=.*/,
          `YNAB_ACCESS_TOKEN=${config.ynabAccessToken}`
        );
      } else {
        envContent += `\nYNAB_ACCESS_TOKEN=${config.ynabAccessToken}`;
      }
    }

    // Update or add Anthropic API key
    if (config.anthropicApiKey) {
      if (envContent.includes('ANTHROPIC_API_KEY=')) {
        envContent = envContent.replace(
          /ANTHROPIC_API_KEY=.*/,
          `ANTHROPIC_API_KEY=${config.anthropicApiKey}`
        );
      } else {
        envContent += `\nANTHROPIC_API_KEY=${config.anthropicApiKey}`;
      }
    }

    writeFileSync(this.envFilePath, envContent.trim() + '\n');
  }

  private validateYnabToken(token: string): boolean {
    return token.length > 20 && /^[a-zA-Z0-9]+$/.test(token);
  }

  private validateAnthropicKey(key: string): boolean {
    return key.startsWith('sk-') && key.length > 10;
  }

  async runOnboarding(missingKeys: { ynab: boolean; anthropic: boolean }): Promise<void> {
    this.displayWelcomeMessage();
    
    const config: OnboardingConfig = {};

    // Handle YNAB token
    if (missingKeys.ynab) {
      this.displayYnabInstructions();
      
      while (true) {
        const token = await this.promptForInput(
          chalk.cyan('Please paste your YNAB Personal Access Token: ')
        );
        
        if (this.validateYnabToken(token)) {
          config.ynabAccessToken = token;
          console.log(chalk.green('✅ YNAB token saved successfully!\n'));
          break;
        } else {
          console.log(chalk.red('❌ Invalid YNAB token. Please check that you copied the full token.\n'));
        }
      }
    }

    // Handle Anthropic API key
    if (missingKeys.anthropic) {
      this.displayAnthropicInstructions();
      
      while (true) {
        const key = await this.promptForInput(
          chalk.cyan('Please paste your Anthropic API Key: ')
        );
        
        if (this.validateAnthropicKey(key)) {
          config.anthropicApiKey = key;
          console.log(chalk.green('✅ Anthropic API key saved successfully!\n'));
          break;
        } else {
          console.log(chalk.red('❌ Invalid Anthropic API key. It should start with "sk-"\n'));
        }
      }
    }

    // Save to .env file
    this.saveToEnvFile(config);
    
    console.log(chalk.green('🎉 Setup complete! Your API keys have been saved to .env'));
    console.log(chalk.white('You can now run any Finance Wizard command.'));
    console.log(chalk.cyan('Try running: npm start chat'));
  }
}