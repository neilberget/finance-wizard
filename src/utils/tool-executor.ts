import chalk from 'chalk';
import { YNABClient } from '../ynab/client';
import { FinanceAnalyzer } from '../analysis/analyzer';
import { ToolCall, ToolResult } from '../types/tools';
import { FinancialInsights } from '../types/analysis';
import { YNABTransaction } from '../types/ynab';

export class ToolExecutor {
  constructor(
    private ynabClient: YNABClient,
    private analyzer: FinanceAnalyzer
  ) {}

  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    console.log(chalk.blue(`🔧 Executing: ${toolCall.name}`));
    
    try {
      switch (toolCall.name) {
        case 'sync_transactions':
          return await this.syncTransactions(toolCall.parameters);
        
        case 'clear_cache':
          return await this.clearCache();
        
        case 'analyze_transactions':
          return await this.analyzeTransactions(toolCall.parameters);
        
        case 'generate_report':
          return await this.generateReport(toolCall.parameters);
        
        case 'change_budget':
          return await this.changeBudget();
        
        case 'list_transactions':
          return await this.listTransactions(toolCall.parameters);
        
        default:
          return {
            success: false,
            message: `Unknown tool: ${toolCall.name}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error executing ${toolCall.name}: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  private async syncTransactions(params: any): Promise<ToolResult> {
    const months = params.months || 3;
    
    console.log(chalk.gray(`Syncing ${months} months of transaction data...`));
    
    try {
      const transactions = await this.ynabClient.getTransactions({ 
        months, 
        useCache: false 
      });
      
      return {
        success: true,
        message: `✅ Successfully synced ${transactions.length} transactions from the last ${months} months`,
        data: { transactionCount: transactions.length, months }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync transactions: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  private async clearCache(): Promise<ToolResult> {
    console.log(chalk.gray('Clearing transaction cache...'));
    
    try {
      // Clear cache for current budget specifically
      this.ynabClient.clearCache(true);
      
      return {
        success: true,
        message: '✅ Cache cleared successfully for current budget'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear cache: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  private async analyzeTransactions(params: any): Promise<ToolResult> {
    const months = params.months || 3;
    const focus = params.focus;
    
    console.log(chalk.gray(`Analyzing ${months} months of transaction data${focus ? ` (focus: ${focus})` : ''}...`));
    
    try {
      const transactions = await this.ynabClient.getTransactions({ months });
      const insights = this.analyzer.analyzeTransactions(transactions);
      
      let summary = `✅ Analysis complete for ${transactions.length} transactions\n`;
      summary += `💰 Total Spent: $${insights.totalSpent.toFixed(2)}\n`;
      summary += `📈 Net Cash Flow: $${insights.netCashFlow.toFixed(2)}\n`;
      
      if (focus === 'savings') {
        summary += `\n🎯 Top Savings Opportunities:\n`;
        insights.savingsOpportunities.slice(0, 3).forEach((opp, i) => {
          summary += `${i + 1}. ${opp.description} ($${opp.potentialSavings.toFixed(2)})\n`;
        });
      } else if (focus === 'spending') {
        summary += `\n📊 Top Spending Categories:\n`;
        insights.topSpendingCategories.slice(0, 3).forEach((cat, i) => {
          summary += `${i + 1}. ${cat.category}: $${cat.totalAmount.toFixed(2)} (${cat.percentageOfTotal.toFixed(1)}%)\n`;
        });
      } else if (focus === 'trends') {
        summary += `\n📈 Monthly Trends:\n`;
        insights.monthlyTrends.slice(-3).forEach(trend => {
          summary += `${trend.month}: Net $${trend.netFlow.toFixed(2)}\n`;
        });
      }
      
      return {
        success: true,
        message: summary,
        data: { insights, transactions }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to analyze transactions: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  private async generateReport(params: any): Promise<ToolResult> {
    const reportType = params.type || 'summary';
    
    console.log(chalk.gray(`Generating ${reportType} report...`));
    
    try {
      const transactions = await this.ynabClient.getTransactions({ months: 3 });
      const insights = this.analyzer.analyzeTransactions(transactions);
      
      let report = '';
      
      switch (reportType) {
        case 'summary':
          report = this.generateSummaryReport(insights, transactions);
          break;
        case 'savings':
          report = this.generateSavingsReport(insights);
          break;
        case 'budget':
          report = this.generateBudgetReport(insights);
          break;
        case 'trends':
          report = this.generateTrendsReport(insights);
          break;
        default:
          return {
            success: false,
            message: `Unknown report type: ${reportType}`
          };
      }
      
      return {
        success: true,
        message: `✅ ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated:\n\n${report}`,
        data: { reportType, insights }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate report: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  private generateSummaryReport(insights: FinancialInsights, transactions: YNABTransaction[]): string {
    const report = `📊 FINANCIAL SUMMARY REPORT
═══════════════════════════════

💰 Financial Overview:
• Total Income: $${insights.totalIncome.toFixed(2)}
• Total Spent: $${insights.totalSpent.toFixed(2)}
• Net Cash Flow: $${insights.netCashFlow.toFixed(2)}
• Transactions Analyzed: ${transactions.length}

🏆 Top Spending Categories:
${insights.topSpendingCategories.slice(0, 5).map((cat, i) => 
  `${i + 1}. ${cat.category}: $${cat.totalAmount.toFixed(2)} (${cat.percentageOfTotal.toFixed(1)}%)`
).join('\n')}

💡 Top Savings Opportunities:
${insights.savingsOpportunities.slice(0, 3).map((opp, i) => 
  `${i + 1}. ${opp.description} - Potential: $${opp.potentialSavings.toFixed(2)}`
).join('\n')}`;

    return report;
  }

  private generateSavingsReport(insights: FinancialInsights): string {
    const totalPotentialSavings = insights.savingsOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0);
    
    const report = `💰 SAVINGS OPPORTUNITIES REPORT
═══════════════════════════════════

💡 Total Potential Savings: $${totalPotentialSavings.toFixed(2)}

🎯 Detailed Opportunities:
${insights.savingsOpportunities.map((opp, i) => `
${i + 1}. ${opp.description}
   • Potential Savings: $${opp.potentialSavings.toFixed(2)}
   • Confidence: ${opp.confidence}
   • Type: ${opp.type}
   • Recommendations: ${opp.recommendations.join('; ')}
`).join('')}`;

    return report;
  }

  private generateBudgetReport(insights: FinancialInsights): string {
    const savingsRate = insights.totalIncome > 0 ? 
      ((insights.totalIncome - insights.totalSpent) / insights.totalIncome * 100) : 0;

    const report = `📊 BUDGET PERFORMANCE REPORT
═══════════════════════════════════

💼 Budget Overview:
• Income: $${insights.totalIncome.toFixed(2)}
• Spending: $${insights.totalSpent.toFixed(2)}
• Savings Rate: ${savingsRate.toFixed(1)}%
• Net Position: $${insights.netCashFlow.toFixed(2)}

📈 Spending Breakdown:
${insights.topSpendingCategories.map((cat, i) => `
• ${cat.category}: $${cat.totalAmount.toFixed(2)}
  - ${cat.transactionCount} transactions
  - Average: $${cat.averageAmount.toFixed(2)}
  - Trend: ${cat.trend}
`).join('')}`;

    return report;
  }

  private generateTrendsReport(insights: FinancialInsights): string {
    const report = `📈 TRENDS ANALYSIS REPORT
══════════════════════════════

📊 Monthly Trends:
${insights.monthlyTrends.map(trend => `
• ${trend.month}:
  - Spent: $${trend.spent.toFixed(2)}
  - Income: $${trend.income.toFixed(2)}
  - Net Flow: $${trend.netFlow.toFixed(2)}
`).join('')}

🔍 Category Trends:
${insights.topSpendingCategories.slice(0, 5).map(cat => `
• ${cat.category}: ${cat.trend} trend
  - Monthly Average: $${cat.monthlyAverage.toFixed(2)}
  - Total Transactions: ${cat.transactionCount}
`).join('')}`;

    return report;
  }

  private async changeBudget(): Promise<ToolResult> {
    console.log(chalk.gray('Changing budget selection...'));
    
    try {
      await this.ynabClient.changeBudget();
      const budgetName = this.ynabClient.getBudgetManager().getSelectedBudgetName();
      
      return {
        success: true,
        message: `✅ Budget changed to: ${budgetName}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to change budget: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  private async listTransactions(params: any): Promise<ToolResult> {
    const {
      category,
      payee,
      limit = 10,
      minAmount,
      maxAmount
    } = params;

    console.log(chalk.gray(`Listing transactions${category ? ` in category "${category}"` : ''}${payee ? ` from payee "${payee}"` : ''}...`));

    try {
      const transactions = await this.ynabClient.getTransactions({ months: 3 });
      
      let filtered = transactions.filter(t => !t.deleted);

      // Apply filters
      if (category) {
        filtered = filtered.filter(t => 
          (t.category_name || 'Uncategorized').toLowerCase().includes(category.toLowerCase())
        );
      }

      if (payee) {
        filtered = filtered.filter(t => 
          (t.payee_name || '').toLowerCase().includes(payee.toLowerCase())
        );
      }

      if (minAmount !== undefined) {
        filtered = filtered.filter(t => Math.abs(t.amount) >= minAmount);
      }

      if (maxAmount !== undefined) {
        filtered = filtered.filter(t => Math.abs(t.amount) <= maxAmount);
      }

      // Sort by date (newest first) and limit
      const examples = filtered
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      if (examples.length === 0) {
        return {
          success: true,
          message: `No transactions found matching the criteria.`
        };
      }

      let result = `✅ Found ${filtered.length} matching transactions. Here are the ${examples.length} most recent:\n\n`;
      
      examples.forEach((transaction, index) => {
        const amount = Math.abs(transaction.amount);
        const sign = transaction.amount < 0 ? '-' : '+';
        const category = transaction.category_name || 'Uncategorized';
        const payee = transaction.payee_name || 'Unknown';
        const memo = transaction.memo ? ` (${transaction.memo})` : '';
        
        result += `${index + 1}. ${transaction.date}: ${payee}\n`;
        result += `   ${sign}$${amount.toFixed(2)} - ${category}${memo}\n`;
        if (transaction.account_name) {
          result += `   Account: ${transaction.account_name}\n`;
        }
        result += '\n';
      });

      if (category === 'Uncategorized' || (category && category.toLowerCase().includes('uncategorized'))) {
        result += `\n💡 Debug Info: These transactions have category_name = "${examples[0]?.category_name}" or null/undefined`;
      }

      return {
        success: true,
        message: result,
        data: { transactions: examples, totalFound: filtered.length }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to list transactions: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  // Getters for accessing clients
  getYnabClient(): YNABClient {
    return this.ynabClient;
  }

  getAnalyzer(): FinanceAnalyzer {
    return this.analyzer;
  }
}