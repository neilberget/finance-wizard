import inquirer from 'inquirer';
import chalk from 'chalk';
import { ContextManager } from '../utils/context';
import { UserContext } from '../types/context';

export async function startContextSetup(contextManager: ContextManager): Promise<void> {
  console.log(chalk.blue('\n🔧 User Context Setup'));
  console.log(chalk.gray('This information will be used to personalize your AI financial advisor.\n'));
  console.log(chalk.gray('All fields are optional - you can skip any you prefer not to share.\n'));

  const context: UserContext = {
    personal: {},
    family: {},
    financial: {},
    goals: {
      shortTerm: [],
      mediumTerm: [],
      longTerm: [],
    },
    preferences: {
      priorityCategories: [],
    },
    notes: {
      financialConcerns: [],
      upcomingExpenses: [],
      budgetChallenges: [],
    },
  };

  // Personal Information
  console.log(chalk.yellow('📋 Personal Information'));
  const personal = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Name (optional):',
    },
    {
      type: 'number',
      name: 'age',
      message: 'Age (optional):',
    },
    {
      type: 'input',
      name: 'location',
      message: 'Location (optional):',
    },
    {
      type: 'input',
      name: 'occupation',
      message: 'Occupation (optional):',
    },
  ]);

  Object.assign(context.personal, personal);

  // Family Information
  console.log(chalk.yellow('\n👨‍👩‍👧‍👦 Family Information'));
  const family = await inquirer.prompt([
    {
      type: 'list',
      name: 'maritalStatus',
      message: 'Marital Status:',
      choices: ['single', 'married', 'divorced', 'widowed', 'prefer not to say'],
      filter: (val) => val === 'prefer not to say' ? undefined : val,
    },
    {
      type: 'number',
      name: 'children',
      message: 'Number of children (optional):',
    },
    {
      type: 'number',
      name: 'householdSize',
      message: 'Total household size (optional):',
    },
  ]);

  Object.assign(context.family, family);

  // Financial Information
  console.log(chalk.yellow('\n💰 Financial Information'));
  const financial = await inquirer.prompt([
    {
      type: 'number',
      name: 'annualIncome',
      message: 'Annual household income (optional):',
    },
    {
      type: 'number',
      name: 'monthlyIncome',
      message: 'Monthly household income (optional):',
    },
    {
      type: 'input',
      name: 'primaryIncomeSource',
      message: 'Primary income source (optional):',
    },
    {
      type: 'number',
      name: 'debtTotal',
      message: 'Total debt amount (optional):',
    },
    {
      type: 'number',
      name: 'emergencyFundTarget',
      message: 'Emergency fund target (optional):',
    },
    {
      type: 'number',
      name: 'currentSavings',
      message: 'Current savings amount (optional):',
    },
  ]);

  Object.assign(context.financial, financial);

  // Goals
  console.log(chalk.yellow('\n🎯 Financial Goals'));
  const goals = await inquirer.prompt([
    {
      type: 'input',
      name: 'shortTermGoals',
      message: 'Short-term goals (1 year) - separate with commas:',
    },
    {
      type: 'input',
      name: 'mediumTermGoals',
      message: 'Medium-term goals (1-5 years) - separate with commas:',
    },
    {
      type: 'input',
      name: 'longTermGoals',
      message: 'Long-term goals (5+ years) - separate with commas:',
    },
    {
      type: 'number',
      name: 'monthlyBudgetTarget',
      message: 'Monthly budget target (optional):',
    },
    {
      type: 'number',
      name: 'savingsRate',
      message: 'Target savings rate (% of income, optional):',
    },
  ]);

  if (goals.shortTermGoals) {
    context.goals.shortTerm = goals.shortTermGoals.split(',').map((g: string) => g.trim()).filter(Boolean);
  }
  if (goals.mediumTermGoals) {
    context.goals.mediumTerm = goals.mediumTermGoals.split(',').map((g: string) => g.trim()).filter(Boolean);
  }
  if (goals.longTermGoals) {
    context.goals.longTerm = goals.longTermGoals.split(',').map((g: string) => g.trim()).filter(Boolean);
  }
  if (goals.monthlyBudgetTarget) context.goals.monthlyBudgetTarget = goals.monthlyBudgetTarget;
  if (goals.savingsRate) context.goals.savingsRate = goals.savingsRate;

  // Preferences
  console.log(chalk.yellow('\n⚙️ Preferences'));
  const preferences = await inquirer.prompt([
    {
      type: 'list',
      name: 'riskTolerance',
      message: 'Risk tolerance for investments:',
      choices: ['low', 'medium', 'high', 'prefer not to say'],
      filter: (val) => val === 'prefer not to say' ? undefined : val,
    },
    {
      type: 'list',
      name: 'investmentExperience',
      message: 'Investment experience:',
      choices: ['beginner', 'intermediate', 'advanced', 'prefer not to say'],
      filter: (val) => val === 'prefer not to say' ? undefined : val,
    },
    {
      type: 'list',
      name: 'budgetingStyle',
      message: 'Budgeting style preference:',
      choices: ['strict', 'flexible', 'loose', 'prefer not to say'],
      filter: (val) => val === 'prefer not to say' ? undefined : val,
    },
    {
      type: 'input',
      name: 'priorityCategories',
      message: 'Priority spending categories to focus on - separate with commas:',
    },
  ]);

  Object.assign(context.preferences, preferences);
  if (preferences.priorityCategories) {
    context.preferences.priorityCategories = preferences.priorityCategories.split(',').map((c: string) => c.trim()).filter(Boolean);
  }

  // Notes
  console.log(chalk.yellow('\n📝 Additional Notes'));
  const notes = await inquirer.prompt([
    {
      type: 'input',
      name: 'financialConcerns',
      message: 'Financial concerns or challenges - separate with commas:',
    },
    {
      type: 'input',
      name: 'upcomingExpenses',
      message: 'Upcoming major expenses - separate with commas:',
    },
    {
      type: 'input',
      name: 'budgetChallenges',
      message: 'Budget challenges you face - separate with commas:',
    },
    {
      type: 'editor',
      name: 'additionalContext',
      message: 'Any additional context you\'d like to share:',
    },
  ]);

  if (notes.financialConcerns) {
    context.notes.financialConcerns = notes.financialConcerns.split(',').map((c: string) => c.trim()).filter(Boolean);
  }
  if (notes.upcomingExpenses) {
    context.notes.upcomingExpenses = notes.upcomingExpenses.split(',').map((e: string) => e.trim()).filter(Boolean);
  }
  if (notes.budgetChallenges) {
    context.notes.budgetChallenges = notes.budgetChallenges.split(',').map((c: string) => c.trim()).filter(Boolean);
  }
  if (notes.additionalContext) {
    context.notes.additionalContext = notes.additionalContext;
  }

  // Review and Save
  console.log(chalk.yellow('\n📄 Review Your Context'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(contextManager.generateContextPrompt());
  console.log(chalk.gray('─'.repeat(50)));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Save this context?',
      default: true,
    },
  ]);

  if (confirm) {
    contextManager.saveContext(context);
    console.log(chalk.green('\n✅ Context saved successfully!'));
    console.log(chalk.gray('Your AI financial advisor will now provide personalized advice based on this information.'));
  } else {
    console.log(chalk.yellow('\n❌ Context not saved.'));
  }
}

export async function quickContextSetup(contextManager: ContextManager): Promise<void> {
  console.log(chalk.blue('\n🚀 Quick Context Setup'));
  console.log(chalk.gray('Just a few key details to get started:\n'));

  const quickContext = await inquirer.prompt([
    {
      type: 'number',
      name: 'annualIncome',
      message: 'Annual household income (optional):',
    },
    {
      type: 'number',
      name: 'monthlyBudgetTarget',
      message: 'Monthly budget target (optional):',
    },
    {
      type: 'input',
      name: 'topGoal',
      message: 'Your top financial goal:',
    },
    {
      type: 'input',
      name: 'biggestChallenge',
      message: 'Your biggest budget challenge:',
    },
  ]);

  const context: UserContext = {
    personal: {},
    family: {},
    financial: {
      annualIncome: quickContext.annualIncome,
    },
    goals: {
      shortTerm: quickContext.topGoal ? [quickContext.topGoal] : [],
      mediumTerm: [],
      longTerm: [],
      monthlyBudgetTarget: quickContext.monthlyBudgetTarget,
    },
    preferences: {
      priorityCategories: [],
    },
    notes: {
      budgetChallenges: quickContext.biggestChallenge ? [quickContext.biggestChallenge] : [],
      financialConcerns: [],
      upcomingExpenses: [],
    },
  };

  contextManager.saveContext(context);
  console.log(chalk.green('\n✅ Quick context saved!'));
  console.log(chalk.gray('You can always run `finance-wizard context --setup` for a full setup later.'));
}