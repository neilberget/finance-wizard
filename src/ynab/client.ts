import axios, { AxiosInstance } from 'axios';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { subMonths, format } from 'date-fns';
import chalk from 'chalk';
import { 
  YNABTransaction, 
  YNABBudget, 
  YNABTransactionResponse, 
  YNABBudgetResponse 
} from '../types/ynab';
import { BudgetManager } from '../utils/budget-manager';

export class YNABClient {
  private client: AxiosInstance;
  private cacheDir: string;
  private budgetId?: string;
  private budgetManager: BudgetManager;

  constructor(accessToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.ynab.com/v1',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.cacheDir = join(process.cwd(), 'data');
    if (!existsSync(this.cacheDir)) {
      require('fs').mkdirSync(this.cacheDir, { recursive: true });
    }
    
    this.budgetManager = new BudgetManager();
  }

  async getBudgets(): Promise<YNABBudget[]> {
    const response = await this.client.get('/budgets');
    return response.data.data.budgets;
  }

  async getSelectedBudget(): Promise<YNABBudget> {
    if (!this.budgetId) {
      await this.ensureBudgetSelected();
    }

    const response = await this.client.get<YNABBudgetResponse>(`/budgets/${this.budgetId}`);
    return response.data.data.budget;
  }

  async ensureBudgetSelected(): Promise<void> {
    const budgets = await this.getBudgets();
    
    if (budgets.length === 0) {
      throw new Error('No budgets found in your YNAB account');
    }

    // Check if we have a saved budget selection
    const savedBudgetId = this.budgetManager.getSelectedBudgetId();
    
    if (savedBudgetId && this.budgetManager.validateSelectedBudget(budgets)) {
      this.budgetId = savedBudgetId;
      console.log(chalk.blue(`Using selected budget: ${this.budgetManager.getSelectedBudgetName()}`));
      return;
    }

    // Need to select a budget
    this.budgetId = await this.budgetManager.selectBudget(budgets);
  }

  async changeBudget(): Promise<void> {
    const budgets = await this.getBudgets();
    const oldBudgetId = this.budgetId;
    this.budgetId = await this.budgetManager.promptForBudgetReselection(budgets);
    
    // Clear cache for old budget if it changed
    if (oldBudgetId && oldBudgetId !== this.budgetId) {
      this.clearCache(true);
      console.log(chalk.yellow('Cleared cache for previous budget'));
    }
  }

  // Keep for backward compatibility
  async getDefaultBudget(): Promise<YNABBudget> {
    return this.getSelectedBudget();
  }

  async getTransactions(options: {
    months?: number;
    sinceDate?: Date;
    useCache?: boolean;
  } = {}): Promise<YNABTransaction[]> {
    const { months = 3, sinceDate, useCache = true } = options;
    
    const startDate = sinceDate || subMonths(new Date(), months);
    // Include budget ID in cache key to avoid mixing data between budgets
    const budgetId = this.budgetId || 'unknown';
    const cacheKey = `transactions_${budgetId}_${format(startDate, 'yyyy-MM-dd')}_${months}`;
    const cacheFile = join(this.cacheDir, `${cacheKey}.json`);

    if (useCache && existsSync(cacheFile)) {
      const cacheData = JSON.parse(readFileSync(cacheFile, 'utf-8'));
      const cacheAge = Date.now() - cacheData.timestamp;
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge < maxCacheAge) {
        console.log('Using cached transaction data');
        return cacheData.transactions;
      }
    }

    console.log('Fetching fresh transaction data from YNAB...');
    
    if (!this.budgetId) {
      await this.ensureBudgetSelected();
    }

    const sinceParam = format(startDate, 'yyyy-MM-dd');
    const response = await this.client.get<YNABTransactionResponse>(
      `/budgets/${this.budgetId}/transactions?since_date=${sinceParam}`
    );

    const transactions = response.data.data.transactions
      .filter(t => !t.deleted)
      .map(t => ({
        ...t,
        amount: t.amount / 1000, // YNAB amounts are in milliunits
      }));

    // Cache the results
    const cacheData = {
      timestamp: Date.now(),
      transactions,
    };
    writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));

    return transactions;
  }

  async syncData(): Promise<void> {
    console.log('Syncing budget data...');
    const budget = await this.getSelectedBudget();
    
    console.log('Syncing transactions...');
    await this.getTransactions({ useCache: false });
    
    console.log(`Synced data for budget: ${budget.name}`);
  }

  async getCategories(): Promise<any[]> {
    if (!this.budgetId) {
      await this.ensureBudgetSelected();
    }

    const response = await this.client.get(`/budgets/${this.budgetId}/categories`);
    return response.data.data.category_groups;
  }

  async getAccounts(): Promise<any[]> {
    if (!this.budgetId) {
      await this.ensureBudgetSelected();
    }

    const response = await this.client.get(`/budgets/${this.budgetId}/accounts`);
    return response.data.data.accounts;
  }

  clearCache(budgetSpecific: boolean = false): void {
    const fs = require('fs');
    const files = fs.readdirSync(this.cacheDir);
    
    if (budgetSpecific && this.budgetId) {
      // Clear only cache files for the current budget
      const budgetFiles = files.filter((file: string) => 
        file.startsWith(`transactions_${this.budgetId}_`) && file.endsWith('.json')
      );
      
      budgetFiles.forEach((file: string) => {
        fs.unlinkSync(join(this.cacheDir, file));
      });
      
      console.log(`Cache cleared for budget: ${this.budgetManager.getSelectedBudgetName()}`);
    } else {
      // Clear all cache files
      files.forEach((file: string) => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(join(this.cacheDir, file));
        }
      });
      
      console.log('All cache cleared');
    }
  }

  getBudgetManager(): BudgetManager {
    return this.budgetManager;
  }
}