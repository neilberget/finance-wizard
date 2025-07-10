import { YNABTransaction } from './ynab';

export interface SpendingPattern {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  monthlyAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentageOfTotal: number;
}

export interface SavingsOpportunity {
  type: 'recurring_subscription' | 'high_frequency_small' | 'category_overspend' | 'unusual_spike';
  category: string;
  description: string;
  potentialSavings: number;
  confidence: 'high' | 'medium' | 'low';
  recommendations: string[];
  transactions: YNABTransaction[];
}

export interface BudgetAnalysis {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'under_budget' | 'on_track' | 'over_budget';
  daysRemaining: number;
  projectedSpend: number;
}

export interface FinancialInsights {
  totalSpent: number;
  totalIncome: number;
  netCashFlow: number;
  topSpendingCategories: SpendingPattern[];
  savingsOpportunities: SavingsOpportunity[];
  budgetAnalysis: BudgetAnalysis[];
  unusualTransactions: YNABTransaction[];
  monthlyTrends: {
    month: string;
    spent: number;
    income: number;
    netFlow: number;
  }[];
}

export interface AnalysisConfig {
  startDate: Date;
  endDate: Date;
  includedAccounts?: string[];
  excludedCategories?: string[];
  minTransactionAmount?: number;
}