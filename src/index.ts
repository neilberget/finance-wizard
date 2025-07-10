#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, validateConfig } from './utils/config';
import { YNABClient } from './ynab/client';
import { FinanceAnalyzer } from './analysis/analyzer';
import { AIChat } from './ai/chat';
import { startInteractiveMode } from './cli/interactive';
import { ContextManager } from './utils/context';
import { startContextSetup } from './cli/context-setup';

const program = new Command();

program
  .name('finance-wizard')
  .description('Interactive CLI for YNAB transaction analysis with AI insights')
  .version('1.0.0');

program
  .command('chat')
  .description('Start interactive chat mode')
  .option('-m, --months <number>', 'Number of months to analyze', '3')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🧙 Finance Wizard - Starting up...'));
      
      const config = await loadConfig();
      validateConfig(config);
      
      const ynabClient = new YNABClient(config.ynabAccessToken);
      const analyzer = new FinanceAnalyzer();
      const aiChat = new AIChat(config.anthropicApiKey);
      
      await startInteractiveMode({
        ynabClient,
        analyzer,
        aiChat,
        analysisMonths: parseInt(options.months, 10)
      });
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Sync data from YNAB')
  .action(async () => {
    try {
      console.log(chalk.blue('Syncing data from YNAB...'));
      
      const config = await loadConfig();
      validateConfig(config);
      
      const ynabClient = new YNABClient(config.ynabAccessToken);
      await ynabClient.syncData();
      
      console.log(chalk.green('✅ Data synced successfully!'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Run analysis on cached data')
  .option('-m, --months <number>', 'Number of months to analyze', '3')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Analyzing financial data...'));
      
      const config = await loadConfig();
      validateConfig(config);
      
      const ynabClient = new YNABClient(config.ynabAccessToken);
      const analyzer = new FinanceAnalyzer();
      
      const transactions = await ynabClient.getTransactions({
        months: parseInt(options.months, 10)
      });
      
      const insights = analyzer.analyzeTransactions(transactions);
      
      console.log(chalk.green('✅ Analysis complete!'));
      console.log(chalk.yellow('Top Savings Opportunities:'));
      
      insights.savingsOpportunities.slice(0, 5).forEach((opportunity, index) => {
        console.log(`${index + 1}. ${opportunity.description} - Potential savings: $${opportunity.potentialSavings.toFixed(2)}`);
      });
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('context')
  .description('Manage user context for personalized AI responses')
  .option('-s, --setup', 'Interactive context setup')
  .option('-v, --view', 'View current context')
  .option('-c, --clear', 'Clear context file')
  .action(async (options) => {
    try {
      const contextManager = new ContextManager();
      
      if (options.setup) {
        await startContextSetup(contextManager);
      } else if (options.view) {
        const context = contextManager.getContext();
        if (context) {
          console.log(chalk.blue('Current User Context:'));
          console.log(contextManager.generateContextPrompt());
        } else {
          console.log(chalk.yellow('No context file found. Use --setup to create one.'));
        }
      } else if (options.clear) {
        const fs = require('fs');
        const contextFile = contextManager.getContextFile();
        if (fs.existsSync(contextFile)) {
          fs.unlinkSync(contextFile);
          console.log(chalk.green('Context file cleared.'));
        } else {
          console.log(chalk.yellow('No context file to clear.'));
        }
      } else {
        console.log(chalk.yellow('Use --setup, --view, or --clear'));
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('budget')
  .description('Manage YNAB budget selection')
  .option('-s, --select', 'Select a different budget')
  .option('-v, --view', 'View current budget selection')
  .option('-c, --clear', 'Clear budget selection')
  .action(async (options) => {
    try {
      const config = await loadConfig();
      validateConfig(config);
      
      const ynabClient = new YNABClient(config.ynabAccessToken);
      
      if (options.select) {
        await ynabClient.changeBudget();
      } else if (options.view) {
        const budgetManager = ynabClient.getBudgetManager();
        const budgetName = budgetManager.getSelectedBudgetName();
        if (budgetName) {
          console.log(chalk.blue(`Current budget: ${budgetName}`));
        } else {
          console.log(chalk.yellow('No budget selected. Use --select to choose one.'));
        }
      } else if (options.clear) {
        const budgetManager = ynabClient.getBudgetManager();
        budgetManager.clearBudgetConfig();
      } else {
        console.log(chalk.yellow('Use --select, --view, or --clear'));
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

if (process.argv.length === 2) {
  program.outputHelp();
} else {
  program.parse();
}