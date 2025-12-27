
import { useState, useEffect, useCallback } from 'react';
import { Transaction, Summary, UserCategories, CreditCard } from '../types';
import { supabase } from '../services/supabaseClient';

const DEFAULT_CATEGORIES: UserCategories = {
  expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Cartão', 'Outros'],
  income: ['Salário', 'Freelance', 'Investimentos', 'Presentes', 'Outros']
};

export const useFinanceData = (userId: string | null) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<UserCategories>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase.from('profiles').select('categories').eq('id', userId).single();
      if (profile?.categories) setCategories(profile.categories as unknown as UserCategories);

      const { data: cardsData } = await supabase.from('credit_cards').select('*').eq('user_id', userId);
      setCards(cardsData || []);

      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (transError) throw transError;
      setTransactions(transData || []);
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transaction, user_id: userId, is_paid: transaction.is_paid ?? true }])
        .select().single();
      if (error) throw error;
      setTransactions(prev => [data, ...prev]);
    } catch (err) { console.error(err); }
  }, [userId]);

  const togglePaid = useCallback(async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ is_paid: !currentStatus })
        .eq('id', id);
      
      if (!error) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_paid: !currentStatus } : t));
      }
    } catch (err) { console.error(err); }
  }, []);

  const addCard = async (card: Omit<CreditCard, 'id'>) => {
    if (!userId) return;
    const { data, error } = await supabase.from('credit_cards').insert([{ ...card, user_id: userId }]).select().single();
    if (!error && data) setCards(prev => [...prev, data]);
  };

  const deleteCard = async (id: string) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (!error) setCards(prev => prev.filter(c => c.id !== id));
  };

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const persistCategories = async (newCats: UserCategories) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update({ categories: newCats }).eq('id', userId);
    if (!error) setCategories(newCats);
  };

  const addCategory = (type: 'income' | 'expense', name: string) => {
    const newCats = { ...categories, [type]: [...new Set([...categories[type], name])] };
    persistCategories(newCats);
  };

  const deleteCategory = (type: 'income' | 'expense', name: string) => {
    const newCats = { ...categories, [type]: categories[type].filter(cat => cat !== name) };
    persistCategories(newCats);
  };

  const getSummary = (): Summary => {
    return transactions.reduce((acc, t) => {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        acc.income += amt;
        acc.balance += amt;
      } else {
        acc.expenses += amt;
        acc.balance -= amt;
      }
      return acc;
    }, { balance: 0, income: 0, expenses: 0 });
  };

  return {
    transactions, cards, categories,
    addTransaction, deleteTransaction, togglePaid,
    addCard, deleteCard,
    addCategory, deleteCategory,
    summary: getSummary(),
    loading
  };
};
