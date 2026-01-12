
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

  // Estados para configuração de conexão
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
-- Pode rodar quantas vezes quiser, ele só cria o que falta.

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

-- 2. Adiciona colunas novas se faltarem (Vínculos)
DO $$
BEGIN
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

-- 3. Habilita RLS (Segurança)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Cria Políticas de Acesso de forma segura (Checa se existe antes)
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

      const dataToExport = {
        version: "1.1",
        exportDate: new Date().toISOString(),
        categories,
        cards,
        accounts: accounts || [],
        transactions
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_financepro_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setMessage({ text: 'Backup JSON exportado com sucesso!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Erro ao exportar JSON.', type: 'error' });
    }
  };

  const handleExportSQL = async () => {
    try {
      const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', userId);

      let sql = `-- SCRIPT DE MIGRAÇÃO FINANCEPRO v1.1\n`;
      sql += `-- Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
      
      sql += `DO $$\n`;
      sql += `DECLARE\n`;
      sql += `    v_user_id UUID;\n`;
      sql += `BEGIN\n`;
      sql += `    SELECT id INTO v_user_id FROM auth.users LIMIT 1;\n\n`;
      sql += `    IF v_user_id IS NULL THEN\n`;
      sql += `        RAISE EXCEPTION 'Nenhum usuário encontrado!';\n`;
      sql += `    END IF;\n\n`;

      const catsJson = JSON.stringify(categories).replace(/'/g, "''");
      sql += `    INSERT INTO profiles (id, categories) VALUES (v_user_id, '${catsJson}'::jsonb) ON CONFLICT (id) DO UPDATE SET categories = EXCLUDED.categories;\n\n`;

      if (accounts && accounts.length > 0) {
        accounts.forEach(acc => {
          const name = acc.name.replace(/'/g, "''");
          sql += `    INSERT INTO accounts (id, user_id, name, type, initial_balance, color) VALUES ('${acc.id}', v_user_id, '${name}', '${acc.type}', ${acc.initial_balance}, '${acc.color}') ON CONFLICT (id) DO NOTHING;\n`;
        });
      }

      if (cards.length > 0) {
        cards.forEach(card => {
          const name = card.name.replace(/'/g, "''");
          const accId = card.account_id ? `'${card.account_id}'` : 'NULL';
          sql += `    INSERT INTO credit_cards (id, user_id, name, color, credit_limit, closing_day, due_day, account_id) VALUES ('${card.id}', v_user_id, '${name}', '${card.color}', ${card.credit_limit}, ${card.closing_day}, ${card.due_day}, ${accId}) ON CONFLICT (id) DO NOTHING;\n`;
        });
      }

      if (transactions.length > 0) {
        transactions.forEach(t => {
          const desc = t.description.replace(/'/g, "''");
          const cardId = t.card_id ? `'${t.card_id}'` : 'NULL';
          const accId = t.account_id ? `'${t.account_id}'` : 'NULL';
          const pDate = t.payment_date ? `'${t.payment_date}'` : 'NULL';
          const splitDetails = t.split_details ? `'${JSON.stringify(t.split_details).replace(/'/g, "''")}'::jsonb` : 'NULL';

          sql += `    INSERT INTO transactions (id, user_id, description, amount, type, category, date, payment_date, card_id, account_id, is_split, split_details, is_paid) \n`;
          sql += `    VALUES ('${t.id}', v_user_id, '${desc}', ${t.amount}, '${t.type}', '${t.category}', '${t.date}', ${pDate}, ${cardId}, ${accId}, ${t.is_split}, ${splitDetails}, ${t.is_paid}) \n`;
          sql += `    ON CONFLICT (id) DO NOTHING;\n`;
        });
      }

      sql += `END $$;`;

      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `migracao_full_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ text: 'Script de migração gerado!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Erro ao gerar script SQL.', type: 'error' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if(!window.confirm("Isso adicionará dados ao banco atual. Continuar?")) return;
    setLoading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          
          const accountIdMap: Record<string, string> = {};
          if (importedData.accounts && Array.isArray(importedData.accounts)) {
             for (const acc of importedData.accounts) {
               const { id: oldId, ...accData } = acc;
               const { data } = await supabase.from('accounts').insert([{ ...accData, user_id: userId }]).select().single();
               if(data) accountIdMap[oldId] = data.id;
             }
          }

          const cardIdMap: Record<string, string> = {};
          if (importedData.cards) {
             for (const c of importedData.cards) {
               const { id: oldId, ...cData } = c;
               const newCard = {
                   ...cData,
                   user_id: userId,
                   account_id: c.account_id ? (accountIdMap[c.account_id] || null) : null
               };
               const { data } = await supabase.from('credit_cards').insert([newCard]).select().single();
               if(data) cardIdMap[oldId] = data.id;
             }
          }

          if (importedData.transactions) {
            const transactionsToInsert = importedData.transactions.map((t: any) => {
              const { id, ...tData } = t;
              return {
                ...tData,
                user_id: userId,
                card_id: t.card_id ? (cardIdMap[t.card_id] || null) : null,
                account_id: t.account_id ? (accountIdMap[t.account_id] || null) : null
              };
            });
            
            const batchSize = 50;
            for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
              await supabase.from('transactions').insert(transactionsToInsert.slice(i, i + batchSize));
            }
          }

          setMessage({ text: 'Importação concluída!', type: 'success' });
          setTimeout(() => { onRefresh(); setLoading(false); }, 2000);
        } catch (err: any) {
          setMessage({ text: `Erro: ${err.message}`, type: 'error' });
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Configuração de Conexão */}
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-2">Conexão com Banco de Dados</h2>
        <p className="text-xs text-slate-400 font-medium mb-6">Configure seu próprio projeto do Supabase ou troque as credenciais da API.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Supabase Project URL</label>
            <input 
              type="text" 
              value={sbUrl} 
              onChange={e => setSbUrl(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 text-xs font-bold text-slate-700 placeholder:text-slate-300"
              placeholder="https://seu-projeto.supabase.co"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Supabase Anon Key</label>
            <input 
              type="password" 
              value={sbKey} 
              onChange={e => setSbKey(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 text-xs font-bold text-slate-700 placeholder:text-slate-300"
              placeholder="eyJh..."
            />
          </div>
        </div>
        <button onClick={handleSaveConnection} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
          Salvar e Recarregar
        </button>
      </div>

      <div className="bg-indigo-900 p-8 rounded-[32px] shadow-2xl shadow-indigo-200 border border-indigo-700 overflow-hidden relative group">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Atualizar Estrutura (SQL)</h2>
          </div>
          <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-6 leading-relaxed">
            Copie o código abaixo e execute no <strong>SQL Editor</strong> do Supabase. Ele foi corrigido para não dar erro se as tabelas já existirem.
          </p>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-4 border border-indigo-500/30 mb-6">
            <pre className="text-[10px] font-mono text-indigo-300 leading-relaxed overflow-x-auto whitespace-pre h-40 scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-transparent">
              {sqlFixCode}
            </pre>
          </div>
          <button onClick={() => copyToClipboard(sqlFixCode)} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center gap-2">
            Copiar Script SQL
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-8">Backup & Migração</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border-2 border-slate-50 bg-slate-50/30 flex flex-col items-center text-center">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Exportar SQL</h3>
            <button onClick={handleExportSQL} className="w-full py-3 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">Gerar Migração</button>
          </div>
          <div className="p-6 rounded-2xl border-2 border-slate-50 bg-slate-50/30 flex flex-col items-center text-center">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Backup JSON</h3>
            <button onClick={handleExportJSON} className="w-full py-3 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">Baixar Backup</button>
          </div>
          <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center text-center">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Importar JSON</h3>
            <label className={`w-full py-3 bg-teal-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center cursor-pointer hover:bg-teal-700 transition-all ${loading ? 'opacity-50' : ''}`}>
              {loading ? 'Lendo...' : 'Selecionar'}
              <input type="file" accept=".json" onChange={handleImport} disabled={loading} className="hidden" />
            </label>
          </div>
        </div>
        {message && <div className={`mt-4 p-3 text-center text-[10px] font-bold uppercase rounded-lg ${message.type === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>{message.text}</div>}
      </div>
    </div>
  );
};

export default DataManagement;
