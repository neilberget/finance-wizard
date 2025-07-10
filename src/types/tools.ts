export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface AvailableTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export const AVAILABLE_TOOLS: AvailableTool[] = [
  {
    name: 'sync_transactions',
    description: 'Force sync fresh transaction data from YNAB, ignoring cache. Use this when user mentions updating categories or wants fresh data.',
    parameters: {
      type: 'object',
      properties: {
        months: {
          type: 'number',
          description: 'Number of months to sync (default: 3)'
        }
      }
    }
  },
  {
    name: 'clear_cache',
    description: 'Clear all cached transaction data. Use when user wants to force fresh data or mentions cache issues.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'analyze_transactions',
    description: 'Re-run analysis on current or newly synced transaction data. Use after syncing or when user asks for updated insights.',
    parameters: {
      type: 'object',
      properties: {
        months: {
          type: 'number',
          description: 'Number of months to analyze (default: 3)'
        },
        focus: {
          type: 'string',
          description: 'Focus area for analysis',
          enum: ['savings', 'spending', 'trends', 'budget']
        }
      }
    }
  },
  {
    name: 'generate_report',
    description: 'Generate a comprehensive financial report. Use when user asks for a summary or detailed analysis.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of report to generate',
          enum: ['summary', 'savings', 'budget', 'trends']
        }
      }
    }
  },
  {
    name: 'change_budget',
    description: 'Change the selected YNAB budget. Use when user mentions switching budgets or working with a different budget.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_transactions',
    description: 'List example transactions based on criteria. Use when user asks for specific transaction examples.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category name (e.g., "Uncategorized", "Groceries")'
        },
        payee: {
          type: 'string',
          description: 'Filter by payee name'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of transactions to show (default: 10)'
        },
        minAmount: {
          type: 'number',
          description: 'Minimum transaction amount'
        },
        maxAmount: {
          type: 'number',
          description: 'Maximum transaction amount'
        }
      }
    }
  }
];