
import { useState, useEffect, useCallback } from 'react';
import { Transaction, Summary, UserCategories, CreditCard } from '../types';
import { supabase } from '../services/supabaseClient';

const DEFAULT_CATEGORIES: UserCategories = {
  expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Cartão', 'Outros'],
  income: ['Salário', 'Freelance', 'Investimentos', 'Presentes', 'Outros'],
  payers: ['Isa'],
  colors: {},
  icons: {}
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
        const cats = profile.categories as unknown as UserCategories;
        setCategories({
          ...DEFAULT_CATEGORIES,
          ...cats,
          payers: cats.payers || DEFAULT_CATEGORIES.payers,
          colors: cats.colors || {},
          icons: cats.icons || {}
        });
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
      const allowedKeys = ['description', 'amount', 'type', 'category', 'date', 'payment_date', 'card_id', 'is_split', 'split_details', 'is_paid'];
      const payload = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowedKeys.includes(key))
      );

      const { data, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select();
      
      if (error) return false;
      if (data && data.length > 0) {
        setTransactions(prev => prev.map(t => t.id === id ? data[0] : t));
        return true;
      }
      return false;
    } catch (err) { 
      console.error('Erro no update:', err);
      return false;
    }
  }, [userId]);

  const togglePaid = useCallback(async (id: string, currentStatus: boolean, paymentDate?: string | null) => {
    if (!userId) return;
    try {
      const updates: any = { is_paid: !currentStatus };
      if (!currentStatus) {
        updates.payment_date = paymentDate || new Date().toISOString();
      } else {
        updates.payment_date = null;
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select();
      
      if (!error && data && data.length > 0) {
        setTransactions(prev => prev.map(t => t.id === id ? data[0] : t));
      }
    } catch (err) { console.error('Erro ao alternar status:', err); }
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

  const addCategory = (type: 'income' | 'expense' | 'payers', name: string, color?: string, icon?: string) => {
    const target = type === 'payers' ? 'payers' : type;
    const newColors = { ...categories.colors, [name]: color || '#64748b' };
    const newIcons = { ...categories.icons, [name]: icon || 'other' };
    
    const newCats = { 
      ...categories, 
      [target]: [...new Set([...categories[target as keyof UserCategories] as string[], name])],
      colors: type !== 'payers' ? newColors : categories.colors,
      icons: type !== 'payers' ? newIcons : categories.icons
    };
    persistCategories(newCats);
  };

  const updateCategory = async (type: 'income' | 'expense', oldName: string, newName: string, newColor: string, newIcon: string) => {
    if (!userId) return;
    const target = type === 'expense' ? 'expense' : 'income';
    const newList = [...categories[target]];
    const index = newList.indexOf(oldName);
    
    if (index !== -1) {
      newList[index] = newName;
    } else {
      newList.push(newName);
    }

    const newColors = { ...categories.colors };
    const newIcons = { ...categories.icons };

    if (oldName !== newName) {
      delete newColors[oldName];
      delete newIcons[oldName];
    }
    
    newColors[newName] = newColor;
    newIcons[newName] = newIcon;

    const newCats = {
      ...categories,
      [target]: newList,
      colors: newColors,
      icons: newIcons
    };
    
    await persistCategories(newCats);
  };

  const deleteCategory = (type: 'income' | 'expense' | 'payers', name: string) => {
    const target = type === 'payers' ? 'payers' : type;
    const newColors = { ...categories.colors };
    const newIcons = { ...categories.icons };
    delete newColors[name];
    delete newIcons[name];
    
    const newCats = { 
      ...categories, 
      [target]: (categories[target as keyof UserCategories] as string[]).filter(cat => cat !== name),
      colors: type !== 'payers' ? newColors : categories.colors,
      icons: type !== 'payers' ? newIcons : categories.icons
    };
    persistCategories(newCats);
  };

  return {
    transactions, cards, categories,
    addTransaction, updateTransaction, deleteTransaction, togglePaid,
    addCard, deleteCard,
    addCategory, updateCategory, deleteCategory,
    loading
  };
};
