import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { YNABBudget } from '../types/ynab';

interface BudgetConfig {
  selectedBudgetId: string;
  selectedBudgetName: string;
  lastSelected: string; // ISO date
}

export class BudgetManager {
  private configFile: string;

  constructor() {
    this.configFile = join(process.cwd(), 'budget-config.json');
  }

  async selectBudget(budgets: YNABBudget[]): Promise<string> {
    if (budgets.length === 1) {
      console.log(chalk.blue(`Using budget: ${budgets[0].name}`));
      this.saveBudgetConfig(budgets[0].id, budgets[0].name);
      return budgets[0].id;
    }

    console.log(chalk.yellow('\n📊 Multiple budgets found in your YNAB account:'));
    console.log(chalk.gray('Please select which budget to analyze:\n'));

    budgets.forEach((budget, index) => {
      const lastModified = new Date(budget.last_modified_on).toLocaleDateString();
      console.log(chalk.white(`${index + 1}. ${budget.name}`));
      console.log(chalk.gray(`   Last modified: ${lastModified}`));
      console.log(chalk.gray(`   Currency: ${budget.currency_format.currency_symbol}`));
      console.log();
    });

    const { selectedIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedIndex',
        message: 'Which budget would you like to use?',
        choices: budgets.map((budget, index) => ({
          name: `${budget.name} (${budget.currency_format.currency_symbol})`,
          value: index,
        })),
      },
    ]);

    const selectedBudget = budgets[selectedIndex];
    console.log(chalk.green(`\n✅ Selected budget: ${selectedBudget.name}`));

    this.saveBudgetConfig(selectedBudget.id, selectedBudget.name);
    return selectedBudget.id;
  }

  getSelectedBudgetId(): string | null {
    if (!existsSync(this.configFile)) {
      return null;
    }

    try {
      const config: BudgetConfig = JSON.parse(readFileSync(this.configFile, 'utf-8'));
      return config.selectedBudgetId;
    } catch (error) {
      console.error('Error reading budget config:', error);
      return null;
    }
  }

  getSelectedBudgetName(): string | null {
    if (!existsSync(this.configFile)) {
      return null;
    }

    try {
      const config: BudgetConfig = JSON.parse(readFileSync(this.configFile, 'utf-8'));
      return config.selectedBudgetName;
    } catch (error) {
      console.error('Error reading budget config:', error);
      return null;
    }
  }

  async promptForBudgetReselection(budgets: YNABBudget[]): Promise<string> {
    const currentBudgetName = this.getSelectedBudgetName();
    
    console.log(chalk.yellow(`\n🔄 Current budget: ${currentBudgetName || 'Unknown'}`));
    
    const { shouldChange } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldChange',
        message: 'Would you like to switch to a different budget?',
        default: false,
      },
    ]);

    if (shouldChange) {
      return await this.selectBudget(budgets);
    }

    return this.getSelectedBudgetId()!;
  }

  private saveBudgetConfig(budgetId: string, budgetName: string): void {
    const config: BudgetConfig = {
      selectedBudgetId: budgetId,
      selectedBudgetName: budgetName,
      lastSelected: new Date().toISOString(),
    };

    try {
      writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving budget config:', error);
    }
  }

  clearBudgetConfig(): void {
    if (existsSync(this.configFile)) {
      require('fs').unlinkSync(this.configFile);
      console.log(chalk.green('Budget selection cleared.'));
    }
  }

  hasBudgetConfig(): boolean {
    return existsSync(this.configFile);
  }

  validateSelectedBudget(budgets: YNABBudget[]): boolean {
    const selectedId = this.getSelectedBudgetId();
    if (!selectedId) return false;

    return budgets.some(budget => budget.id === selectedId);
  }
}