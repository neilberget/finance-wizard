export interface UserContext {
  personal: {
    name?: string;
    age?: number;
    location?: string;
    occupation?: string;
  };
  family: {
    maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
    children?: number;
    dependents?: string[];
    householdSize?: number;
  };
  financial: {
    annualIncome?: number;
    monthlyIncome?: number;
    primaryIncomeSource?: string;
    secondaryIncome?: number;
    debtTotal?: number;
    emergencyFundTarget?: number;
    currentSavings?: number;
  };
  goals: {
    shortTerm?: string[]; // Goals within 1 year
    mediumTerm?: string[]; // Goals within 1-5 years
    longTerm?: string[]; // Goals 5+ years
    monthlyBudgetTarget?: number;
    savingsRate?: number; // Percentage of income to save
  };
  preferences: {
    riskTolerance?: 'low' | 'medium' | 'high';
    investmentExperience?: 'beginner' | 'intermediate' | 'advanced';
    budgetingStyle?: 'strict' | 'flexible' | 'loose';
    priorityCategories?: string[]; // Categories user wants to focus on
  };
  notes: {
    financialConcerns?: string[];
    upcomingExpenses?: string[];
    budgetChallenges?: string[];
    additionalContext?: string;
  };
}

export interface ContextConfig {
  contextFile: string;
  autoLoad: boolean;
  includeInChat: boolean;
  includeInInsights: boolean;
}