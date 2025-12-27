
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('categories')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.categories) {
        setCategories(profile.categories as unknown as UserCategories);
      }

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
      console.error('Erro ao sincronizar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transaction, user_id: userId, is_paid: transaction.is_paid ?? true }])
        .select();
      
      if (error) throw error;
      if (data && data.length > 0) {
        setTransactions(prev => [data[0], ...prev]);
        return true;
      }
      return false;
    } catch (err) { 
      console.error('Erro ao adicionar transação:', err);
      return false;
    }
  }, [userId]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!userId || !id) return false;
    
    try {
      // Campos permitidos para atualização (removemos o que não deve ser enviado)
      const allowedKeys = ['description', 'amount', 'type', 'category', 'date', 'card_id', 'is_split', 'split_details', 'is_paid'];
      const payload = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowedKeys.includes(key))
      );

      console.log('Update payload:', payload);

      // Executa o update sem filtro redundante de user_id no .eq se o RLS já estiver cuidando disso, 
      // mas mantemos para garantir que o usuário só edite o que é dele.
      const { data, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select();
      
      if (error) {
        console.error('Erro Supabase:', error.message);
        return false;
      }

      if (data && data.length > 0) {
        setTransactions(prev => prev.map(t => t.id === id ? data[0] : t));
        return true;
      }
      
      // Se chegou aqui, a query rodou mas 0 linhas foram afetadas (Erro de RLS no Banco)
      console.error('Erro RLS: O banco de dados recusou a atualização. Verifique as Policies no Supabase.');
      return false;
    } catch (err) { 
      console.error('Erro inesperado no update:', err);
      return false;
    }
  }, [userId]);

  const togglePaid = useCallback(async (id: string, currentStatus: boolean) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ is_paid: !currentStatus })
        .eq('id', id)
        .eq('user_id', userId)
        .select();
      
      if (!error && data && data.length > 0) {
        setTransactions(prev => prev.map(t => t.id === id ? data[0] : t));
      }
    } catch (err) { console.error('Erro ao alternar status de pagamento:', err); }
  }, [userId]);

  const addCard = async (card: Omit<CreditCard, 'id'>) => {
    if (!userId) return;
    const { data, error } = await supabase.from('credit_cards').insert([{ ...card, user_id: userId }]).select();
    if (!error && data && data.length > 0) setCards(prev => [...prev, data[0]]);
  };

  const deleteCard = async (id: string) => {
    if (!userId) return;
    const { error } = await supabase.from('credit_cards').delete().eq('id', id).eq('user_id', userId);
    if (!error) setCards(prev => prev.filter(c => c.id !== id));
  };

  const deleteTransaction = useCallback(async (id: string) => {
    if (!userId) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
    if (!error) setTransactions(prev => prev.filter(t => t.id !== id));
  }, [userId]);

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
    addTransaction, updateTransaction, deleteTransaction, togglePaid,
    addCard, deleteCard,
    addCategory, deleteCategory,
    summary: getSummary(),
    loading
  };
};
