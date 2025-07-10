import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

config();

export interface AppConfig {
  ynabAccessToken: string;
  anthropicApiKey: string;
  cacheDurationHours: number;
  defaultAnalysisMonths: number;
  dataDir: string;
  selectedBudgetId?: string;
}

export function loadConfig(): AppConfig {
  const requiredEnvVars = {
    ynabAccessToken: process.env.YNAB_ACCESS_TOKEN,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  };

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key.toUpperCase()}`);
    }
  }

  const dataDir = join(process.cwd(), 'data');
  
  return {
    ynabAccessToken: requiredEnvVars.ynabAccessToken!,
    anthropicApiKey: requiredEnvVars.anthropicApiKey!,
    cacheDurationHours: parseInt(process.env.CACHE_DURATION_HOURS || '24', 10),
    defaultAnalysisMonths: parseInt(process.env.DEFAULT_ANALYSIS_MONTHS || '3', 10),
    dataDir,
    selectedBudgetId: process.env.SELECTED_BUDGET_ID,
  };
}

export function validateConfig(config: AppConfig): void {
  if (!config.ynabAccessToken.startsWith('ynab-')) {
    console.warn('Warning: YNAB access token should start with "ynab-"');
  }

  if (!existsSync(config.dataDir)) {
    console.log(`Creating data directory: ${config.dataDir}`);
    require('fs').mkdirSync(config.dataDir, { recursive: true });
  }
}