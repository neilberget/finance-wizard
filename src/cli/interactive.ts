import inquirer from 'inquirer';
import chalk from 'chalk';
import { YNABClient } from '../ynab/client';
import { FinanceAnalyzer } from '../analysis/analyzer';
import { AIChat } from '../ai/chat';
import { FinancialInsights } from '../types/analysis';
import { YNABTransaction } from '../types/ynab';
import { quickContextSetup } from './context-setup';
import { ToolExecutor } from '../utils/tool-executor';

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
    console.log(chalk.blue('🔍 Generating AI insights...'));
    const initialInsights = await aiChat.generateInsights(insights);
    console.log(chalk.white(initialInsights));
    console.log(chalk.gray('\n' + '─'.repeat(50) + '\n'));

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
  console.log(chalk.blue('💬 Chat mode activated! Ask me anything about your finances.'));
  console.log(chalk.gray('Type "help" for commands or "quit" to exit.\n'));

  // Maintain conversation history for context
  const conversationHistory: any[] = [];
  const MAX_HISTORY_LENGTH = 20; // Keep last 20 messages

  while (true) {
    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: chalk.cyan('You:'),
        validate: (input: string) => input.trim().length > 0 || 'Please enter a message',
      },
    ]);

    const trimmedMessage = message.trim().toLowerCase();

    if (shouldQuit(trimmedMessage)) {
      console.log(chalk.blue('👋 Thanks for using Finance Wizard!'));
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
      console.log(chalk.blue('🎯 Generating budget recommendations...'));
      try {
        const recommendations = await aiChat.generateBudgetRecommendations(insights);
        console.log(chalk.white(recommendations));
      } catch (error) {
        console.error(chalk.red('Error generating recommendations:'), error);
      }
      continue;
    }

    if (trimmedMessage === 'context') {
      const contextManager = aiChat.getContextManager();
      const context = contextManager.getContext();
      if (context) {
        console.log(chalk.blue('\n👤 Your Personal Context:'));
        console.log(chalk.gray('─'.repeat(30)));
        console.log(contextManager.generateContextPrompt());
        console.log(chalk.gray('\nTo update: run `finance-wizard context --setup`'));
      } else {
        console.log(chalk.yellow('\n⚠️  No personal context set up.'));
        console.log(chalk.gray('Run `finance-wizard context --setup` to add your information.'));
      }
      continue;
    }

    // Regular chat
    try {
      console.log(chalk.blue('🤖 AI:'), chalk.gray('Thinking...'));
      
      // Make a copy of conversation history for this request
      const currentHistory = [...conversationHistory];
      
      const chatResult = await aiChat.chat(message, {
        insights,
        recentTransactions: transactions.slice(-20),
      }, currentHistory);
      
      // Clear the "thinking" line
      process.stdout.write('\u001b[1A\u001b[2K'); // Move up and clear line
      
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
        console.log(chalk.blue('🤖 AI:'), chalk.white(chatResult.response));
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
            console.log(chalk.green(result.message));
            
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
            console.log(chalk.red(result.message));
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
        console.log(chalk.blue('\n🤖 AI:'), chalk.gray('Continuing...'));
        
        const continuationResult = await aiChat.chat('', {
          insights,
          recentTransactions: transactions.slice(-20),
        }, conversationHistory);
        
        // Clear the "continuing" line
        process.stdout.write('\u001b[1A\u001b[2K');
          
        // Handle continuation response
        if (continuationResult.response) {
          console.log(chalk.blue('🤖 AI:'), chalk.white(continuationResult.response));
        }
        
        // Execute any additional tool calls
        if (continuationResult.toolCalls) {
          for (const toolCall of continuationResult.toolCalls) {
            const result = await toolExecutor.executeTool(toolCall);
            
            if (result.success) {
              console.log(chalk.green(result.message));
              
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
              console.log(chalk.red(result.message));
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
      console.error(chalk.red('Error:'), error);
    }
    
    console.log(); // Empty line for readability
  }
}

function showHelp(): void {
  console.log(chalk.yellow('\n📋 Available Commands:'));
  console.log(chalk.gray('• help - Show this help message'));
  console.log(chalk.gray('• summary - Show financial summary'));
  console.log(chalk.gray('• savings - Show savings opportunities'));
  console.log(chalk.gray('• trends - Show monthly trends'));
  console.log(chalk.gray('• recommendations - Get budget recommendations'));
  console.log(chalk.gray('• context - View your personal context'));
  console.log(chalk.gray('• quit/exit - Exit the application'));
  console.log(chalk.gray('\nOr just ask me anything about your finances!\n'));
}

function showSummary(insights: FinancialInsights): void {
  console.log(chalk.yellow('\n📊 Financial Summary:'));
  console.log(chalk.gray('─'.repeat(30)));
  console.log(chalk.green(`Total Income: $${insights.totalIncome.toFixed(2)}`));
  console.log(chalk.red(`Total Spent: $${insights.totalSpent.toFixed(2)}`));
  console.log(chalk.blue(`Net Cash Flow: $${insights.netCashFlow.toFixed(2)}`));
  
  console.log(chalk.yellow('\n🏆 Top Spending Categories:'));
  insights.topSpendingCategories.slice(0, 5).forEach((cat, index) => {
    console.log(
      chalk.gray(`${index + 1}. ${cat.category}: `) +
      chalk.white(`$${cat.totalAmount.toFixed(2)} `) +
      chalk.gray(`(${cat.percentageOfTotal.toFixed(1)}%)`)
    );
  });
  console.log();
}

function showSavingsOpportunities(insights: FinancialInsights): void {
  console.log(chalk.yellow('\n💰 Savings Opportunities:'));
  console.log(chalk.gray('─'.repeat(30)));
  
  if (insights.savingsOpportunities.length === 0) {
    console.log(chalk.gray('No major savings opportunities identified.'));
    return;
  }

  insights.savingsOpportunities.slice(0, 5).forEach((opp, index) => {
    const confidenceColor = opp.confidence === 'high' ? chalk.green : 
                           opp.confidence === 'medium' ? chalk.yellow : chalk.red;
    
    console.log(
      chalk.white(`${index + 1}. ${opp.description}`) +
      chalk.gray(` (${confidenceColor(opp.confidence)} confidence)`)
    );
    console.log(chalk.green(`   Potential savings: $${opp.potentialSavings.toFixed(2)}`));
    
    if (opp.recommendations.length > 0) {
      console.log(chalk.gray('   Recommendations:'));
      opp.recommendations.forEach(rec => {
        console.log(chalk.gray(`   • ${rec}`));
      });
    }
    console.log();
  });
}

function showTrends(insights: FinancialInsights): void {
  console.log(chalk.yellow('\n📈 Monthly Trends:'));
  console.log(chalk.gray('─'.repeat(30)));
  
  insights.monthlyTrends.forEach(trend => {
    const netFlowColor = trend.netFlow >= 0 ? chalk.green : chalk.red;
    console.log(
      chalk.white(`${trend.month}: `) +
      chalk.gray(`Spent $${trend.spent.toFixed(2)}, Income $${trend.income.toFixed(2)}, `) +
      netFlowColor(`Net $${trend.netFlow.toFixed(2)}`)
    );
  });
  console.log();
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