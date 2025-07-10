export interface YNABTransaction {
  id: string;
  date: string;
  amount: number;
  memo?: string;
  cleared: 'cleared' | 'uncleared' | 'reconciled';
  approved: boolean;
  flag_color?: string;
  account_id: string;
  account_name: string;
  payee_id?: string;
  payee_name?: string;
  category_id?: string;
  category_name?: string;
  transfer_account_id?: string;
  transfer_transaction_id?: string;
  matched_transaction_id?: string;
  import_id?: string;
  deleted: boolean;
}

export interface YNABBudget {
  id: string;
  name: string;
  last_modified_on: string;
  first_month: string;
  last_month: string;
  date_format: {
    format: string;
  };
  currency_format: {
    iso_code: string;
    example_format: string;
    decimal_digits: number;
    decimal_separator: string;
    symbol_first: boolean;
    group_separator: string;
    currency_symbol: string;
    display_symbol: boolean;
  };
  accounts: YNABAccount[];
  categories: YNABCategory[];
}

export interface YNABAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'creditCard' | 'lineOfCredit' | 'otherAsset' | 'otherLiability';
  on_budget: boolean;
  closed: boolean;
  note?: string;
  balance: number;
  cleared_balance: number;
  uncleared_balance: number;
  transfer_payee_id: string;
  direct_import_linked: boolean;
  direct_import_in_error: boolean;
  deleted: boolean;
}

export interface YNABCategory {
  id: string;
  category_group_id: string;
  category_group_name: string;
  name: string;
  hidden: boolean;
  original_category_group_id?: string;
  note?: string;
  budgeted: number;
  activity: number;
  balance: number;
  goal_type?: 'TB' | 'TBD' | 'MF' | 'NEED' | 'DEBT';
  goal_day?: number;
  goal_cadence?: number;
  goal_cadence_frequency?: number;
  goal_creation_month?: string;
  goal_target?: number;
  goal_target_month?: string;
  goal_percentage_complete?: number;
  goal_months_to_budget?: number;
  goal_under_funded?: number;
  goal_overall_funded?: number;
  goal_overall_left?: number;
  deleted: boolean;
}

export interface YNABTransactionResponse {
  data: {
    transactions: YNABTransaction[];
    server_knowledge: number;
  };
}

export interface YNABBudgetResponse {
  data: {
    budget: YNABBudget;
  };
}