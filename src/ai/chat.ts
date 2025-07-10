import Anthropic from '@anthropic-ai/sdk';
import { FinancialInsights } from '../types/analysis';
import { YNABTransaction } from '../types/ynab';
import { ContextManager } from '../utils/context';
import { AVAILABLE_TOOLS, ToolCall } from '../types/tools';

export class AIChat {
  private anthropic: Anthropic;
  private contextManager: ContextManager;

  constructor(apiKey: string, contextFile?: string) {
    this.anthropic = new Anthropic({
      apiKey,
    });
    this.contextManager = new ContextManager(contextFile);
  }

  async generateInsights(insights: FinancialInsights): Promise<string> {
    const prompt = this.buildInsightsPrompt(insights);
    const systemPrompt = this.buildSystemPromptForInsights();
    
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-0',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  async chat(message: string, context: {
    insights: FinancialInsights;
    recentTransactions: YNABTransaction[];
  }, conversationHistory?: Anthropic.MessageParam[]): Promise<{ response: string; toolCalls?: ToolCall[] }> {
    const systemPrompt = this.buildSystemPrompt(context);
    
    const messages: Anthropic.MessageParam[] = conversationHistory ? [...conversationHistory] : [];
    
    // Only add user message if it's not empty
    if (message && message.trim().length > 0) {
      messages.push({
        role: 'user',
        content: message,
      });
    }
    
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-0',
      max_tokens: 1000,
      system: systemPrompt,
      tools: AVAILABLE_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters
      })),
      messages,
    });

    let textResponse = '';
    const toolCalls: ToolCall[] = [];

    for (const content of response.content) {
      if (content.type === 'text') {
        textResponse += content.text;
      } else if (content.type === 'tool_use') {
        toolCalls.push({
          name: content.name,
          parameters: content.input as Record<string, any>
        });
      }
    }

    return {
      response: textResponse,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }

  async generateBudgetRecommendations(insights: FinancialInsights): Promise<string> {
    const prompt = `
Based on the following financial data, provide specific, actionable budget recommendations:

Financial Overview:
- Total Spent: $${insights.totalSpent.toFixed(2)}
- Total Income: $${insights.totalIncome.toFixed(2)}
- Net Cash Flow: $${insights.netCashFlow.toFixed(2)}

Top Spending Categories:
${insights.topSpendingCategories.slice(0, 5).map(cat => 
  `- ${cat.category}: $${cat.totalAmount.toFixed(2)} (${cat.percentageOfTotal.toFixed(1)}% of total)`
).join('\n')}

Top Savings Opportunities:
${insights.savingsOpportunities.slice(0, 5).map(opp => 
  `- ${opp.description} (Potential: $${opp.potentialSavings.toFixed(2)})`
).join('\n')}

Please provide:
1. Specific budget adjustments
2. Priority areas to focus on
3. Realistic savings goals
4. Action items for next month

Keep recommendations practical and achievable.
`;

    const systemPrompt = this.buildSystemPromptForInsights();

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-0',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  private buildInsightsPrompt(insights: FinancialInsights): string {
    return `
Analyze this financial data and provide a comprehensive summary with key insights and actionable recommendations:

FINANCIAL OVERVIEW:
- Total Spent: $${insights.totalSpent.toFixed(2)}
- Total Income: $${insights.totalIncome.toFixed(2)}
- Net Cash Flow: $${insights.netCashFlow.toFixed(2)}

TOP SPENDING CATEGORIES:
${insights.topSpendingCategories.slice(0, 8).map(cat => 
  `- ${cat.category}: $${cat.totalAmount.toFixed(2)} (${cat.transactionCount} transactions, trend: ${cat.trend})`
).join('\n')}

SAVINGS OPPORTUNITIES:
${insights.savingsOpportunities.slice(0, 5).map(opp => 
  `- ${opp.type}: ${opp.description} (Potential: $${opp.potentialSavings.toFixed(2)}, Confidence: ${opp.confidence})`
).join('\n')}

MONTHLY TRENDS:
${insights.monthlyTrends.map(trend => 
  `- ${trend.month}: Spent $${trend.spent.toFixed(2)}, Income $${trend.income.toFixed(2)}, Net $${trend.netFlow.toFixed(2)}`
).join('\n')}

Please provide:
1. A concise financial health summary
2. Key insights and patterns
3. Top 3 immediate action items
4. Potential monthly savings amount
5. Risk areas to monitor

Format your response in a clear, conversational tone as if you're a financial advisor.
`;
  }

  private buildSystemPrompt(context: {
    insights: FinancialInsights;
    recentTransactions: YNABTransaction[];
  }): string {
    const userContext = this.contextManager.generateContextPrompt();
    
    return `
You are a helpful financial advisor AI assistant. You have access to the user's YNAB transaction data and financial insights.

${userContext ? `USER CONTEXT:\n${userContext}\n` : ''}

Current Financial Context:
- Total Spent: $${context.insights.totalSpent.toFixed(2)}
- Total Income: $${context.insights.totalIncome.toFixed(2)}
- Net Cash Flow: $${context.insights.netCashFlow.toFixed(2)}

Top Spending Categories:
${context.insights.topSpendingCategories.slice(0, 5).map(cat => 
  `- ${cat.category}: $${cat.totalAmount.toFixed(2)} (${cat.percentageOfTotal.toFixed(1)}%)`
).join('\n')}

Top Savings Opportunities:
${context.insights.savingsOpportunities.slice(0, 3).map(opp => 
  `- ${opp.description} (Potential: $${opp.potentialSavings.toFixed(2)})`
).join('\n')}

Recent Transactions (last 10):
${context.recentTransactions.slice(0, 10).map(t => 
  `- ${t.date}: ${t.payee_name || 'Unknown'} - $${Math.abs(t.amount).toFixed(2)} (${t.category_name || 'Uncategorized'})`
).join('\n')}

Guidelines:
- Be conversational and helpful
- Provide specific, actionable advice that considers the user's personal context
- Reference the user's actual data and goals when relevant
- Focus on practical savings and budget optimization aligned with their situation
- Ask clarifying questions when needed
- Keep responses concise but thorough
- Use a supportive, encouraging tone
- Consider their family situation, income level, and financial goals in your advice

IMPORTANT: You have access to tools that can perform actions. Use them when appropriate:
- If user mentions updating categories in YNAB or wants fresh data, use sync_transactions
- If user wants to clear cached data or mentions cache issues, use clear_cache
- If user asks for updated analysis or insights, use analyze_transactions
- If user requests a report or summary, use generate_report
- You can use MULTIPLE tools in a single response when needed (e.g., clear_cache then sync_transactions)

You can answer questions about:
- Spending patterns and trends
- Budget optimization
- Savings opportunities
- Category analysis
- Transaction details
- Financial goal setting
- Personal finance strategy

Available Tools:
${AVAILABLE_TOOLS.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}
`;
  }

  private buildSystemPromptForInsights(): string {
    const userContext = this.contextManager.generateContextPrompt();
    
    return `
You are a personal financial advisor AI. Analyze the provided financial data and provide personalized insights.

${userContext ? `USER CONTEXT:\n${userContext}\n` : ''}

Guidelines:
- Provide personalized advice based on the user's context
- Consider their goals, family situation, and financial circumstances
- Focus on actionable recommendations
- Be supportive and encouraging
- Prioritize savings opportunities that align with their situation
- Consider their risk tolerance and investment experience
- Reference their specific goals and challenges
`;
  }

  getContextManager(): ContextManager {
    return this.contextManager;
  }
}