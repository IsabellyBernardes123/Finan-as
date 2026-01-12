
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Transaction, CreditCard, UserCategories, Account } from '../types';

interface DataManagementProps {
  userId: string;
  transactions: Transaction[];
  cards: CreditCard[];
  categories: UserCategories;
  onRefresh: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ userId, transactions, cards, categories, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');

  useEffect(() => {
    const storedUrl = localStorage.getItem('financepro_sb_url');
    const storedKey = localStorage.getItem('financepro_sb_key');
    if (storedUrl) setSbUrl(storedUrl);
    if (storedKey) setSbKey(storedKey);
  }, []);

  const handleSaveConnection = () => {
    if (!sbUrl || !sbKey) {
      if (confirm('Deseja limpar as configurações e usar o banco de dados de demonstração?')) {
        localStorage.removeItem('financepro_sb_url');
        localStorage.removeItem('financepro_sb_key');
        window.location.reload();
      }
      return;
    }
    localStorage.setItem('financepro_sb_url', sbUrl);
    localStorage.setItem('financepro_sb_key', sbKey);
    alert('Conexão salva! A página será recarregada para aplicar as mudanças.');
    window.location.reload();
  };

  const sqlFixCode = `-- SCRIPT CORRIGIDO E SEGURO (IDEMPOTENTE)
-- 1. Cria tabelas se não existirem
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  name TEXT,
  avatar_color TEXT,
  categories JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  initial_balance DECIMAL DEFAULT 0,
  initial_invested_balance DECIMAL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.credit_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  credit_limit DECIMAL DEFAULT 0,
  closing_day INTEGER,
  due_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  is_paid BOOLEAN DEFAULT FALSE,
  is_split BOOLEAN DEFAULT FALSE,
  split_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Adiciona colunas novas se faltarem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='initial_invested_balance') THEN
        ALTER TABLE public.accounts ADD COLUMN initial_invested_balance DECIMAL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='credit_cards' AND column_name='account_id') THEN
        ALTER TABLE public.credit_cards ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='account_id') THEN
        ALTER TABLE public.transactions ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='card_id') THEN
        ALTER TABLE public.transactions ADD COLUMN card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Habilita RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Cria Políticas (Reduzido para brevidade)
DO $$
BEGIN
    -- PROFILES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- ACCOUNTS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'Users can view own accounts') THEN
        CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'Users can insert own accounts') THEN
        CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'Users can update own accounts') THEN
        CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'Users can delete own accounts') THEN
        CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- CARDS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cards' AND policyname = 'Users can view own cards') THEN
        CREATE POLICY "Users can view own cards" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cards' AND policyname = 'Users can insert own cards') THEN
        CREATE POLICY "Users can insert own cards" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cards' AND policyname = 'Users can update own cards') THEN
        CREATE POLICY "Users can update own cards" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cards' AND policyname = 'Users can delete own cards') THEN
        CREATE POLICY "Users can delete own cards" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- TRANSACTIONS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can view own transactions') THEN
        CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can insert own transactions') THEN
        CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can update own transactions') THEN
        CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can delete own transactions') THEN
        CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: 'Script copiado! Agora cole no SQL Editor do Supabase.', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportJSON = async () => {
    try {
      const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', userId);
      const dataToExport = { version: "1.1", exportDate: new Date().toISOString(), categories, cards, accounts: accounts || [], transactions };
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_financepro_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMessage({ text: 'Backup JSON exportado!', type: 'success' });
    } catch (err) { setMessage({ text: 'Erro ao exportar JSON.', type: 'error' }); }
  };

  const handleExportSQL = async () => {
    try {
      const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', userId);
      let sql = `-- SCRIPT DE MIGRAÇÃO FINANCEPRO v1.1\nDO $$\nDECLARE\n    v_user_id UUID;\nBEGIN\n    SELECT id INTO v_user_id FROM auth.users LIMIT 1;\n`;
      const catsJson = JSON.stringify(categories).replace(/'/g, "''");
      sql += `    INSERT INTO profiles (id, categories) VALUES (v_user_id, '${catsJson}'::jsonb) ON CONFLICT (id) DO UPDATE SET categories = EXCLUDED.categories;\n`;
      if (accounts) accounts.forEach(acc => {
          sql += `    INSERT INTO accounts (id, user_id, name, type, initial_balance, initial_invested_balance, color) VALUES ('${acc.id}', v_user_id, '${acc.name.replace(/'/g, "''")}', '${acc.type}', ${acc.initial_balance}, ${acc.initial_invested_balance || 0}, '${acc.color}') ON CONFLICT (id) DO NOTHING;\n`;
      });
      if (transactions) transactions.forEach(t => {
          sql += `    INSERT INTO transactions (id, user_id, description, amount, type, category, date, is_paid, is_split, account_id, card_id) VALUES ('${t.id}', v_user_id, '${t.description.replace(/'/g, "''")}', ${t.amount}, '${t.type}', '${t.category}', '${t.date}', ${t.is_paid}, ${t.is_split}, ${t.account_id ? `'${t.account_id}'` : 'NULL'}, ${t.card_id ? `'${t.card_id}'` : 'NULL'}) ON CONFLICT (id) DO NOTHING;\n`;
      });
      sql += `END $$;`;
      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `migracao_full.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage({ text: 'Script de migração gerado!', type: 'success' });
    } catch (err) { setMessage({ text: 'Erro ao gerar script SQL.', type: 'error' }); }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.accounts) await supabase.from('accounts').insert(data.accounts.map((a:any) => ({...a, user_id: userId})));
        if (data.transactions) await supabase.from('transactions').insert(data.transactions.map((t:any) => ({...t, user_id: userId})));
        setMessage({ text: 'Importação concluída!', type: 'success' });
        setTimeout(() => { onRefresh(); setLoading(false); }, 2000);
      } catch (err) { setLoading(false); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-2">Conexão com Banco de Dados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input type="text" value={sbUrl} onChange={e => setSbUrl(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-xs font-bold" placeholder="Supabase URL"/>
          <input type="password" value={sbKey} onChange={e => setSbKey(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-xs font-bold" placeholder="Anon Key"/>
        </div>
        <button onClick={handleSaveConnection} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Salvar e Recarregar</button>
      </div>

      <div className="bg-indigo-900 p-8 rounded-[32px] border border-indigo-700">
        <h2 className="text-xl font-black text-white tracking-tight uppercase mb-6">Atualizar Estrutura (SQL)</h2>
        <div className="bg-slate-900/50 rounded-2xl p-4 border border-indigo-500/30 mb-6">
          <pre className="text-[10px] font-mono text-indigo-300 overflow-x-auto h-40">{sqlFixCode}</pre>
        </div>
        <button onClick={() => copyToClipboard(sqlFixCode)} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">Copiar Script SQL</button>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-8">Backup & Migração</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={handleExportSQL} className="py-3 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase">Gerar Migração SQL</button>
          <button onClick={handleExportJSON} className="py-3 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase">Baixar Backup JSON</button>
          <label className="py-3 bg-teal-600 text-white rounded-xl text-[9px] font-black uppercase text-center cursor-pointer">
            Importar JSON
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
        {message && <div className={`mt-4 p-3 text-center text-[10px] font-bold uppercase rounded-lg ${message.type === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>{message.text}</div>}
      </div>
    </div>
  );
};

export default DataManagement;
