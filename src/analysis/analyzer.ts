import { YNABTransaction } from '../types/ynab';
import { 
  FinancialInsights, 
  SpendingPattern, 
  SavingsOpportunity, 
  BudgetAnalysis,
  AnalysisConfig 
} from '../types/analysis';
import { startOfMonth, endOfMonth, format, differenceInDays } from 'date-fns';

export class FinanceAnalyzer {
  analyzeTransactions(transactions: YNABTransaction[], config?: AnalysisConfig): FinancialInsights {
    const filteredTransactions = this.filterTransactions(transactions, config);
    
    return {
      totalSpent: this.calculateTotalSpent(filteredTransactions),
      totalIncome: this.calculateTotalIncome(filteredTransactions),
      netCashFlow: this.calculateNetCashFlow(filteredTransactions),
      topSpendingCategories: this.analyzeSpendingPatterns(filteredTransactions),
      savingsOpportunities: this.findSavingsOpportunities(filteredTransactions),
      budgetAnalysis: this.analyzeBudgetPerformance(filteredTransactions),
      unusualTransactions: this.findUnusualTransactions(filteredTransactions),
      monthlyTrends: this.analyzeMonthlyTrends(filteredTransactions),
    };
  }

  private filterTransactions(transactions: YNABTransaction[], config?: AnalysisConfig): YNABTransaction[] {
    let filtered = transactions.filter(t => !t.deleted);

    if (config?.startDate) {
      filtered = filtered.filter(t => new Date(t.date) >= config.startDate);
    }

    if (config?.endDate) {
      filtered = filtered.filter(t => new Date(t.date) <= config.endDate);
    }

    if (config?.includedAccounts?.length) {
      filtered = filtered.filter(t => config.includedAccounts!.includes(t.account_id));
    }

    if (config?.excludedCategories?.length) {
      filtered = filtered.filter(t => !config.excludedCategories!.includes(t.category_id || ''));
    }

    if (config?.minTransactionAmount) {
      filtered = filtered.filter(t => Math.abs(t.amount) >= config.minTransactionAmount!);
    }

    return filtered;
  }

  private calculateTotalSpent(transactions: YNABTransaction[]): number {
    return transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  private calculateTotalIncome(transactions: YNABTransaction[]): number {
    return transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private calculateNetCashFlow(transactions: YNABTransaction[]): number {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  private analyzeSpendingPatterns(transactions: YNABTransaction[]): SpendingPattern[] {
    const categoryMap = new Map<string, YNABTransaction[]>();
    
    transactions
      .filter(t => t.amount < 0)
      .forEach(t => {
        const category = this.getCategoryName(t);
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(t);
      });

    const totalSpent = this.calculateTotalSpent(transactions);
    const patterns: SpendingPattern[] = [];

    for (const [category, categoryTransactions] of categoryMap) {
      const totalAmount = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const transactionCount = categoryTransactions.length;
      const averageAmount = totalAmount / transactionCount;
      
      // Calculate monthly average
      const months = this.getUniqueMonths(categoryTransactions);
      const monthlyAverage = totalAmount / months.length;
      
      // Simple trend analysis
      const trend = this.calculateTrend(categoryTransactions);
      
      patterns.push({
        category,
        totalAmount,
        transactionCount,
        averageAmount,
        monthlyAverage,
        trend,
        percentageOfTotal: (totalAmount / totalSpent) * 100,
      });
    }

    return patterns.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private findSavingsOpportunities(transactions: YNABTransaction[]): SavingsOpportunity[] {
    const opportunities: SavingsOpportunity[] = [];
    
    // Find recurring subscriptions
    opportunities.push(...this.findRecurringSubscriptions(transactions));
    
    // Find high-frequency small purchases
    opportunities.push(...this.findHighFrequencySmallPurchases(transactions));
    
    // Find category overspending
    opportunities.push(...this.findCategoryOverspending(transactions));
    
    // Find unusual spending spikes
    opportunities.push(...this.findUnusualSpikes(transactions));
    
    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  private findRecurringSubscriptions(transactions: YNABTransaction[]): SavingsOpportunity[] {
    const opportunities: SavingsOpportunity[] = [];
    const payeeMap = new Map<string, YNABTransaction[]>();
    
    transactions
      .filter(t => t.amount < 0 && t.payee_name)
      .forEach(t => {
        const payee = t.payee_name!;
        if (!payeeMap.has(payee)) {
          payeeMap.set(payee, []);
        }
        payeeMap.get(payee)!.push(t);
      });

    for (const [payee, payeeTransactions] of payeeMap) {
      if (payeeTransactions.length >= 2) {
        const amounts = payeeTransactions.map(t => Math.abs(t.amount));
        const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
        
        // If amounts are consistent (low variance), it's likely a subscription
        if (variance < avgAmount * 0.1) {
          const monthlyAmount = avgAmount;
          const annualSavings = monthlyAmount * 12;
          
          opportunities.push({
            type: 'recurring_subscription',
            category: payeeTransactions[0].category_name || 'Uncategorized',
            description: `Review subscription to ${payee} ($${monthlyAmount.toFixed(2)}/month)`,
            potentialSavings: annualSavings,
            confidence: 'high',
            recommendations: [
              'Review if this subscription is still needed',
              'Check for cheaper alternatives',
              'Consider annual billing for discounts',
            ],
            transactions: payeeTransactions,
          });
        }
      }
    }

    return opportunities;
  }

  private findHighFrequencySmallPurchases(transactions: YNABTransaction[]): SavingsOpportunity[] {
    const opportunities: SavingsOpportunity[] = [];
    const categoryMap = new Map<string, YNABTransaction[]>();
    
    transactions
      .filter(t => t.amount < 0 && Math.abs(t.amount) < 20)
      .forEach(t => {
        const category = this.getCategoryName(t);
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(t);
      });

    for (const [category, categoryTransactions] of categoryMap) {
      if (categoryTransactions.length >= 10) {
        const totalAmount = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const avgAmount = totalAmount / categoryTransactions.length;
        
        opportunities.push({
          type: 'high_frequency_small',
          category,
          description: `Frequent small purchases in ${category} (${categoryTransactions.length} transactions, avg $${avgAmount.toFixed(2)})`,
          potentialSavings: totalAmount * 0.3, // Assume 30% could be saved
          confidence: 'medium',
          recommendations: [
            'Set a monthly budget for this category',
            'Consider bulk purchasing',
            'Track these purchases more carefully',
          ],
          transactions: categoryTransactions,
        });
      }
    }

    return opportunities;
  }

  private findCategoryOverspending(transactions: YNABTransaction[]): SavingsOpportunity[] {
    // This would require budget data, which we'll implement later
    return [];
  }

  private findUnusualSpikes(transactions: YNABTransaction[]): SavingsOpportunity[] {
    const opportunities: SavingsOpportunity[] = [];
    const categoryMap = new Map<string, YNABTransaction[]>();
    
    transactions
      .filter(t => t.amount < 0)
      .forEach(t => {
        const category = this.getCategoryName(t);
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(t);
      });

    for (const [category, categoryTransactions] of categoryMap) {
      if (categoryTransactions.length >= 5) {
        const amounts = categoryTransactions.map(t => Math.abs(t.amount));
        const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const maxAmount = Math.max(...amounts);
        
        // If there's a transaction significantly higher than average
        if (maxAmount > avgAmount * 3) {
          const spikeTransaction = categoryTransactions.find(t => Math.abs(t.amount) === maxAmount)!;
          
          opportunities.push({
            type: 'unusual_spike',
            category,
            description: `Unusual spending spike in ${category}: $${maxAmount.toFixed(2)} (avg: $${avgAmount.toFixed(2)})`,
            potentialSavings: maxAmount - avgAmount,
            confidence: 'low',
            recommendations: [
              'Review what caused this large expense',
              'Consider if this was a one-time purchase',
              'Plan for similar expenses in the future',
            ],
            transactions: [spikeTransaction],
          });
        }
      }
    }

    return opportunities;
  }

  private analyzeBudgetPerformance(transactions: YNABTransaction[]): BudgetAnalysis[] {
    // This would require budget data from YNAB
    return [];
  }

  private findUnusualTransactions(transactions: YNABTransaction[]): YNABTransaction[] {
    const amounts = transactions
      .filter(t => t.amount < 0)
      .map(t => Math.abs(t.amount));
    
    if (amounts.length === 0) return [];
    
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const threshold = avgAmount * 5; // 5x average
    
    return transactions.filter(t => Math.abs(t.amount) > threshold);
  }

  private analyzeMonthlyTrends(transactions: YNABTransaction[]): Array<{
    month: string;
    spent: number;
    income: number;
    netFlow: number;
  }> {
    const monthMap = new Map<string, YNABTransaction[]>();
    
    transactions.forEach(t => {
      const month = format(new Date(t.date), 'yyyy-MM');
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)!.push(t);
    });

    const trends = Array.from(monthMap.entries()).map(([month, monthTransactions]) => ({
      month,
      spent: this.calculateTotalSpent(monthTransactions),
      income: this.calculateTotalIncome(monthTransactions),
      netFlow: this.calculateNetCashFlow(monthTransactions),
    }));

    return trends.sort((a, b) => a.month.localeCompare(b.month));
  }

  private getUniqueMonths(transactions: YNABTransaction[]): string[] {
    const months = new Set<string>();
    transactions.forEach(t => {
      months.add(format(new Date(t.date), 'yyyy-MM'));
    });
    return Array.from(months);
  }

  private calculateTrend(transactions: YNABTransaction[]): 'increasing' | 'decreasing' | 'stable' {
    const monthlyTotals = this.analyzeMonthlyTrends(transactions);
    
    if (monthlyTotals.length < 2) return 'stable';
    
    const first = monthlyTotals[0].spent;
    const last = monthlyTotals[monthlyTotals.length - 1].spent;
    
    const change = (last - first) / first;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private getCategoryName(transaction: YNABTransaction): string {
    // Check if this is a transfer (payee_name starts with "Transfer" and category_id is null)
    if (transaction.payee_name?.startsWith('Transfer') && !transaction.category_id) {
      return 'Credit Card Payment';
    }
    
    return transaction.category_name || 'Uncategorized';
  }
}