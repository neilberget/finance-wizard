import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { UserContext } from '../types/context';

export class ContextManager {
  private contextFile: string;
  private context: UserContext | null = null;

  constructor(contextFile?: string) {
    this.contextFile = contextFile || join(process.cwd(), 'user-context.json');
  }

  loadContext(): UserContext | null {
    if (!existsSync(this.contextFile)) {
      return null;
    }

    try {
      const data = readFileSync(this.contextFile, 'utf-8');
      this.context = JSON.parse(data);
      return this.context;
    } catch (error) {
      console.error('Error loading user context:', error);
      return null;
    }
  }

  saveContext(context: UserContext): void {
    try {
      writeFileSync(this.contextFile, JSON.stringify(context, null, 2));
      this.context = context;
      console.log(`Context saved to ${this.contextFile}`);
    } catch (error) {
      console.error('Error saving user context:', error);
      throw error;
    }
  }

  getContext(): UserContext | null {
    return this.context || this.loadContext();
  }

  updateContext(updates: Partial<UserContext>): void {
    const currentContext = this.getContext() || this.getEmptyContext();
    const newContext = this.mergeContext(currentContext, updates);
    this.saveContext(newContext);
  }

  private mergeContext(current: UserContext, updates: Partial<UserContext>): UserContext {
    return {
      personal: { ...current.personal, ...updates.personal },
      family: { ...current.family, ...updates.family },
      financial: { ...current.financial, ...updates.financial },
      goals: { 
        ...current.goals, 
        ...updates.goals,
        shortTerm: updates.goals?.shortTerm || current.goals?.shortTerm || [],
        mediumTerm: updates.goals?.mediumTerm || current.goals?.mediumTerm || [],
        longTerm: updates.goals?.longTerm || current.goals?.longTerm || [],
      },
      preferences: { 
        ...current.preferences, 
        ...updates.preferences,
        priorityCategories: updates.preferences?.priorityCategories || current.preferences?.priorityCategories || [],
      },
      notes: { 
        ...current.notes, 
        ...updates.notes,
        financialConcerns: updates.notes?.financialConcerns || current.notes?.financialConcerns || [],
        upcomingExpenses: updates.notes?.upcomingExpenses || current.notes?.upcomingExpenses || [],
        budgetChallenges: updates.notes?.budgetChallenges || current.notes?.budgetChallenges || [],
      },
    };
  }

  generateContextPrompt(): string {
    const context = this.getContext();
    if (!context) {
      return '';
    }

    const sections: string[] = [];

    // Personal Information
    if (context.personal && Object.keys(context.personal).length > 0) {
      sections.push('PERSONAL INFORMATION:');
      if (context.personal.name) sections.push(`- Name: ${context.personal.name}`);
      if (context.personal.age) sections.push(`- Age: ${context.personal.age}`);
      if (context.personal.location) sections.push(`- Location: ${context.personal.location}`);
      if (context.personal.occupation) sections.push(`- Occupation: ${context.personal.occupation}`);
    }

    // Family Information
    if (context.family && Object.keys(context.family).length > 0) {
      sections.push('\nFAMILY INFORMATION:');
      if (context.family.maritalStatus) sections.push(`- Marital Status: ${context.family.maritalStatus}`);
      if (context.family.children) sections.push(`- Children: ${context.family.children}`);
      if (context.family.householdSize) sections.push(`- Household Size: ${context.family.householdSize}`);
      if (context.family.dependents?.length) {
        sections.push(`- Dependents: ${context.family.dependents.join(', ')}`);
      }
    }

    // Financial Information
    if (context.financial && Object.keys(context.financial).length > 0) {
      sections.push('\nFINANCIAL INFORMATION:');
      if (context.financial.annualIncome) sections.push(`- Annual Income: $${context.financial.annualIncome.toLocaleString()}`);
      if (context.financial.monthlyIncome) sections.push(`- Monthly Income: $${context.financial.monthlyIncome.toLocaleString()}`);
      if (context.financial.primaryIncomeSource) sections.push(`- Primary Income Source: ${context.financial.primaryIncomeSource}`);
      if (context.financial.secondaryIncome) sections.push(`- Secondary Income: $${context.financial.secondaryIncome.toLocaleString()}`);
      if (context.financial.debtTotal) sections.push(`- Total Debt: $${context.financial.debtTotal.toLocaleString()}`);
      if (context.financial.emergencyFundTarget) sections.push(`- Emergency Fund Target: $${context.financial.emergencyFundTarget.toLocaleString()}`);
      if (context.financial.currentSavings) sections.push(`- Current Savings: $${context.financial.currentSavings.toLocaleString()}`);
    }

    // Goals
    if (context.goals && Object.keys(context.goals).length > 0) {
      sections.push('\nFINANCIAL GOALS:');
      if (context.goals.shortTerm?.length) {
        sections.push(`- Short-term (1 year): ${context.goals.shortTerm.join(', ')}`);
      }
      if (context.goals.mediumTerm?.length) {
        sections.push(`- Medium-term (1-5 years): ${context.goals.mediumTerm.join(', ')}`);
      }
      if (context.goals.longTerm?.length) {
        sections.push(`- Long-term (5+ years): ${context.goals.longTerm.join(', ')}`);
      }
      if (context.goals.monthlyBudgetTarget) sections.push(`- Monthly Budget Target: $${context.goals.monthlyBudgetTarget.toLocaleString()}`);
      if (context.goals.savingsRate) sections.push(`- Target Savings Rate: ${context.goals.savingsRate}%`);
    }

    // Preferences
    if (context.preferences && Object.keys(context.preferences).length > 0) {
      sections.push('\nPREFERENCES:');
      if (context.preferences.riskTolerance) sections.push(`- Risk Tolerance: ${context.preferences.riskTolerance}`);
      if (context.preferences.investmentExperience) sections.push(`- Investment Experience: ${context.preferences.investmentExperience}`);
      if (context.preferences.budgetingStyle) sections.push(`- Budgeting Style: ${context.preferences.budgetingStyle}`);
      if (context.preferences.priorityCategories?.length) {
        sections.push(`- Priority Categories: ${context.preferences.priorityCategories.join(', ')}`);
      }
    }

    // Notes
    if (context.notes && Object.keys(context.notes).length > 0) {
      sections.push('\nADDITIONAL NOTES:');
      if (context.notes.financialConcerns?.length) {
        sections.push(`- Financial Concerns: ${context.notes.financialConcerns.join(', ')}`);
      }
      if (context.notes.upcomingExpenses?.length) {
        sections.push(`- Upcoming Expenses: ${context.notes.upcomingExpenses.join(', ')}`);
      }
      if (context.notes.budgetChallenges?.length) {
        sections.push(`- Budget Challenges: ${context.notes.budgetChallenges.join(', ')}`);
      }
      if (context.notes.additionalContext) {
        sections.push(`- Additional Context: ${context.notes.additionalContext}`);
      }
    }

    return sections.join('\n');
  }

  hasContext(): boolean {
    return existsSync(this.contextFile);
  }

  getContextFile(): string {
    return this.contextFile;
  }

  private getEmptyContext(): UserContext {
    return {
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
  }
}