import inquirer from 'inquirer';
import chalk from 'chalk';
import { YNABClient } from '../ynab/client';
import { FinanceAnalyzer } from '../analysis/analyzer';
import { AIChat } from '../ai/chat';
import { FinancialInsights } from '../types/analysis';
import { YNABTransaction } from '../types/ynab';
import { quickContextSetup } from './context-setup';
import { ToolExecutor } from '../utils/tool-executor';
import { ui } from '../utils/ui';
import { borderedInput } from '../utils/bordered-input';

interface InteractiveOptions {
  ynabClient: YNABClient;
  analyzer: FinanceAnalyzer;
  aiChat: AIChat;
  analysisMonths: number;
}

export async function startInteractiveMode(options: InteractiveOptions): Promise<void> {
  const { ynabClient, analyzer, aiChat, analysisMonths } = options;
  
  console.log(chalk.blue('\n🧙 Welcome to Finance Wizard!'));
  console.log(chalk.gray('Loading your financial data...\n'));

  try {
    // Check if user has context set up
    const contextManager = aiChat.getContextManager();
    if (!contextManager.hasContext()) {
      console.log(chalk.yellow('👋 First time setup!'));
      const { setupContext } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'setupContext',
          message: 'Would you like to set up your personal context for better AI recommendations?',
          default: true,
        },
      ]);

      if (setupContext) {
        await quickContextSetup(contextManager);
        console.log();
      }
    }

    // Load data
    const transactions = await ynabClient.getTransactions({ months: analysisMonths });
    const insights = analyzer.analyzeTransactions(transactions);
    
    console.log(chalk.green('✅ Data loaded successfully!'));
    console.log(chalk.gray(`Analyzed ${transactions.length} transactions from the last ${analysisMonths} months\n`));

    // Generate initial insights
    console.log(ui.renderProgressMessage('Generating AI insights...'));
    const initialInsights = await aiChat.generateInsights(insights);
    console.log(ui.renderAssistantMessage(initialInsights));
    console.log(ui.renderConversationSeparator());

    // Create tool executor
    const toolExecutor = new ToolExecutor(ynabClient, analyzer);

    // Start interactive chat
    await startChatLoop(insights, transactions, aiChat, toolExecutor);
    
  } catch (error) {
    console.error(chalk.red('Error loading data:'), error);
  }
}

async function startChatLoop(
  insights: FinancialInsights,
  transactions: YNABTransaction[],
  aiChat: AIChat,
  toolExecutor: ToolExecutor
): Promise<void> {
  console.log(ui.renderSystemMessage('Chat mode activated! Ask me anything about your finances.'));
  console.log(ui.renderSystemMessage('Type "help" for commands or "quit" to exit.'));
  console.log();

  // Maintain conversation history for context
  const conversationHistory: any[] = [];
  const MAX_HISTORY_LENGTH = 20; // Keep last 20 messages
  while (true) {
    let message: string;
    
    // Simple prompt input with bordered box
    message = await borderedInput.prompt({
      validate: (input: string) => input.trim().length > 0 || 'Please enter a message',
    });

    const trimmedMessage = message.trim().toLowerCase();
    
    // Show user message with nice formatting
    console.log(ui.renderUserMessage(message));
    console.log();

    if (shouldQuit(trimmedMessage)) {
      console.log(ui.renderSystemMessage('Thanks for using Finance Wizard!'));
      break;
    }

    if (trimmedMessage === 'help') {
      showHelp();
      continue;
    }

    if (trimmedMessage === 'summary') {
      showSummary(insights);
      continue;
    }

    if (trimmedMessage === 'savings') {
      showSavingsOpportunities(insights);
      continue;
    }

    if (trimmedMessage === 'trends') {
      showTrends(insights);
      continue;
    }

    if (trimmedMessage === 'recommendations') {
      console.log(ui.renderProgressMessage('Generating budget recommendations...'));
      try {
        const recommendations = await aiChat.generateBudgetRecommendations(insights);
        console.log(ui.renderAssistantMessage(recommendations));
      } catch (error) {
        console.log(ui.renderErrorMessage(`Error generating recommendations: ${error}`));
      }
      continue;
    }

    if (trimmedMessage === 'context') {
      const contextManager = aiChat.getContextManager();
      const context = contextManager.getContext();
      if (context) {
        const contextContent = `# Your Personal Context

${contextManager.generateContextPrompt()}

*To update: run \`finance-wizard context --setup\`*`;
        console.log(ui.renderMarkdown(contextContent));
      } else {
        console.log(ui.renderWarningMessage('No personal context set up.'));
        console.log(ui.renderSystemMessage('Run `finance-wizard context --setup` to add your information.'));
      }
      continue;
    }

    // Regular chat
    try {
      console.log(ui.renderProgressMessage('Thinking...'));
      
      // Make a copy of conversation history for this request
      const currentHistory = [...conversationHistory];
      
      const chatResult = await aiChat.chat(message, {
        insights,
        recentTransactions: transactions.slice(-20),
      }, currentHistory);
      
      // Clear the "thinking" line
      ui.clearLine();
      
      // Add user message to history
      conversationHistory.push({
        role: 'user',
        content: message
      });
      
      // Build assistant message with both text and tool calls
      const assistantMessage: any = {
        role: 'assistant',
        content: []
      };
      
      // Show AI response
      if (chatResult.response) {
        console.log(ui.renderAssistantMessage(chatResult.response));
        assistantMessage.content.push({
          type: 'text',
          text: chatResult.response
        });
      }
      
      // Execute any tool calls
      if (chatResult.toolCalls) {
        console.log(); // Add space before tool execution
        
        const toolResults = [];
        
        for (const toolCall of chatResult.toolCalls) {
          // Generate a unique ID for this tool use
          const toolUseId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Add tool use to assistant message
          assistantMessage.content.push({
            type: 'tool_use',
            id: toolUseId,
            name: toolCall.name,
            input: toolCall.parameters
          });
          
          const result = await toolExecutor.executeTool(toolCall);
          
          if (result.success) {
            console.log(ui.renderSuccessMessage(result.message));
            
            // If we synced or analyzed data, update our local state
            if (toolCall.name === 'sync_transactions' && result.data) {
              // Re-fetch transactions after sync
              transactions = await toolExecutor.getYnabClient().getTransactions({ 
                months: result.data.months || 3 
              });
            }
            
            if (toolCall.name === 'analyze_transactions' && result.data?.insights) {
              // Update insights after analysis
              Object.assign(insights, result.data.insights);
            }
          } else {
            console.log(ui.renderErrorMessage(result.message));
          }
          
          // Store tool result for later
          toolResults.push({
            tool_use_id: toolUseId,
            content: result.success ? result.message : `Error: ${result.message}`
          });
        }
        
        // Add assistant message to history
        conversationHistory.push(assistantMessage);
        
        // Add tool results as a user message
        conversationHistory.push({
          role: 'user',
          content: toolResults.map(tr => ({
            type: 'tool_result',
            tool_use_id: tr.tool_use_id,
            content: tr.content
          }))
        });
        
        // Continue the conversation to let AI execute more tools or respond
        console.log(ui.renderProgressMessage('Continuing...'));
        
        const continuationResult = await aiChat.chat('', {
          insights,
          recentTransactions: transactions.slice(-20),
        }, conversationHistory);
        
        // Clear the "continuing" line
        ui.clearLine();
          
        // Handle continuation response
        if (continuationResult.response) {
          console.log(ui.renderAssistantMessage(continuationResult.response));
        }
        
        // Execute any additional tool calls
        if (continuationResult.toolCalls) {
          for (const toolCall of continuationResult.toolCalls) {
            const result = await toolExecutor.executeTool(toolCall);
            
            if (result.success) {
              console.log(ui.renderSuccessMessage(result.message));
              
              // Update state as needed
              if (toolCall.name === 'sync_transactions' && result.data) {
                transactions = await toolExecutor.getYnabClient().getTransactions({ 
                  months: result.data.months || 3 
                });
              }
              
              if (toolCall.name === 'analyze_transactions' && result.data?.insights) {
                Object.assign(insights, result.data.insights);
              }
            } else {
              console.log(ui.renderErrorMessage(result.message));
            }
          }
        }
      } else {
        // No tool calls, just add the assistant message to history
        conversationHistory.push(assistantMessage);
      }
      
      // Trim conversation history if it gets too long
      if (conversationHistory.length > MAX_HISTORY_LENGTH) {
        conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY_LENGTH);
      }
      
    } catch (error) {
      console.log(ui.renderErrorMessage(`Error: ${error}`));
    }
    
    console.log(ui.renderConversationSeparator());
  }
}

function showHelp(): void {
  const helpContent = `# Available Commands

• **help** - Show this help message
• **summary** - Show financial summary
• **savings** - Show savings opportunities
• **trends** - Show monthly trends
• **recommendations** - Get budget recommendations
• **context** - View your personal context
• **quit/exit** - Exit the application

Or just ask me anything about your finances!`;
  
  console.log(ui.renderMarkdown(helpContent));
}

function showSummary(insights: FinancialInsights): void {
  const incomeColor = insights.totalIncome > 0 ? 'green' : 'red';
  const spentColor = 'red';
  const netFlowColor = insights.netCashFlow >= 0 ? 'green' : 'red';
  
  const summaryContent = `# Financial Summary

**Total Income:** $${insights.totalIncome.toFixed(2)}
**Total Spent:** $${insights.totalSpent.toFixed(2)}
**Net Cash Flow:** $${insights.netCashFlow.toFixed(2)}

## Top Spending Categories

${insights.topSpendingCategories.slice(0, 5).map((cat, index) => 
    `${index + 1}. **${cat.category}**: $${cat.totalAmount.toFixed(2)} (${cat.percentageOfTotal.toFixed(1)}%)`
  ).join('\n')}`;
  
  console.log(ui.renderMarkdown(summaryContent));
}

function showSavingsOpportunities(insights: FinancialInsights): void {
  if (insights.savingsOpportunities.length === 0) {
    console.log(ui.renderMarkdown('# Savings Opportunities\n\nNo major savings opportunities identified.'));
    return;
  }

  const opportunitiesContent = `# Savings Opportunities

${insights.savingsOpportunities.slice(0, 5).map((opp, index) => {
    const recommendations = opp.recommendations.length > 0 ? 
      `\n\n**Recommendations:**\n${opp.recommendations.map(rec => `• ${rec}`).join('\n')}` : '';
    
    return `## ${index + 1}. ${opp.description}

**Confidence:** ${opp.confidence}  
**Potential Savings:** $${opp.potentialSavings.toFixed(2)}${recommendations}`;
  }).join('\n\n')}`;
  
  console.log(ui.renderMarkdown(opportunitiesContent));
}

function showTrends(insights: FinancialInsights): void {
  const trendsContent = `# Monthly Trends

${insights.monthlyTrends.map(trend => {
    const netFlowIndicator = trend.netFlow >= 0 ? '✓' : '✗';
    return `**${trend.month}:** Spent $${trend.spent.toFixed(2)}, Income $${trend.income.toFixed(2)}, Net $${trend.netFlow.toFixed(2)} ${netFlowIndicator}`;
  }).join('\n')}`;
  
  console.log(ui.renderMarkdown(trendsContent));
}

function shouldQuit(message: string): boolean {
  // Exact matches
  const exactMatches = [
    'quit', 'exit', 'bye', 'goodbye', 'done', 'stop', 'end', 'close'
  ];
  
  if (exactMatches.includes(message)) {
    return true;
  }
  
  // Natural language patterns
  const naturalLanguagePatterns = [
    /^(ok|okay|alright|well)\s+(i'?m\s+)?(all\s+)?done$/,
    /^(i'?m\s+)?(all\s+)?done(\s+now)?$/,
    /^(i'?m\s+)?finished$/,
    /^(thanks?|thank\s+you)(\s+bye|\s+goodbye)?$/,
    /^(that'?s\s+)?(it|enough)(\s+for\s+now)?$/,
    /^bye(\s+bye)?$/,
    /^see\s+you(\s+later)?$/,
    /^(i'?m\s+)?(going\s+to\s+|gonna\s+)?leave(\s+now)?$/,
    /^(i'?m\s+)?(good|all\s+set)$/,
    /^(time\s+to\s+)?(go|leave)$/
  ];
  
  for (const pattern of naturalLanguagePatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  // Fuzzy matching for typos in common quit words
  const quitWords = ['quit', 'exit', 'bye', 'done'];
  for (const word of quitWords) {
    if (calculateLevenshteinDistance(message, word) <= 2 && message.length >= 3) {
      return true;
    }
  }
  
  return false;
}

function calculateLevenshteinDistance(a: string, b: string): number {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}