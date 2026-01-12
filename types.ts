
export type TransactionType = 'income' | 'expense';

export interface User {
  id: string;
  name: string;
  avatarColor: string;
}

export interface SplitDetails {
  userPart: number;
  partnerPart: number;
  partnerName: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'investment' | 'cash' | 'savings' | 'other';
  initial_balance: number;
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  payment_date?: string | null;
  card_id?: string | null;
  account_id?: string | null; // Nova vinculação
  is_split?: boolean;
  split_details?: SplitDetails;
  is_paid: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  color: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  account_id?: string | null; // Vinculação com conta para pagamento
}

export interface Summary {
  balance: number;
  income: number;
  expenses: number;
}

export interface UserCategories {
  expense: string[];
  income: string[];
  payers: string[];
  colors?: Record<string, string>;
  icons?: Record<string, string>;
}
