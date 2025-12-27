
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

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  card_id?: string;
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
}

export interface Summary {
  balance: number;
  income: number;
  expenses: number;
}

export interface UserCategories {
  expense: string[];
  income: string[];
}
