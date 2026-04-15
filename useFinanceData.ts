
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
    const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('financepro_sb_url') : null;
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('financepro_sb_key') : null;
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

  const sqlFixCode = `-- SCRIPT DE ATUALIZAÇÃO E REPARO v1.3
-- Este script garante que todas as colunas necessárias existam.

-- 1. Garante que a coluna 'is_reserve_withdrawal' exista na tabela de transações
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS is_reserve_withdrawal BOOLEAN DEFAULT FALSE;

-- 2. Garante que a coluna 'initial_invested_balance' exista na tabela de contas
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS initial_invested_balance DECIMAL DEFAULT 0;

-- 3. Garante que vínculos de conta existam nos cartões e transações
ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL;

-- 4. Notifica o sistema para atualizar o cache de colunas
NOTIFY pgrst, 'reload schema';
`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: 'Script copiado! Agora cole no SQL Editor do Supabase.', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportJSON = async () => {
    try {
      const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', userId);
      const dataToExport = { version: "1.3", exportDate: new Date().toISOString(), categories, cards, accounts: accounts || [], transactions };
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
      let sql = `-- SCRIPT DE MIGRAÇÃO FINANCEPRO\nDO $$\nDECLARE\n    v_user_id UUID;\nBEGIN\n    SELECT id INTO v_user_id FROM auth.users LIMIT 1;\n`;
      const catsJson = JSON.stringify(categories).replace(/'/g, "''");
      sql += `    INSERT INTO public.profiles (id, categories) VALUES (v_user_id, '${catsJson}'::jsonb) ON CONFLICT (id) DO UPDATE SET categories = EXCLUDED.categories;\n`;
      if (accounts) accounts.forEach(acc => {
          sql += `    INSERT INTO public.accounts (id, user_id, name, type, initial_balance, initial_invested_balance, color) VALUES ('${acc.id}', v_user_id, '${acc.name.replace(/'/g, "''")}', '${acc.type}', ${acc.initial_balance}, ${acc.initial_invested_balance || 0}, '${acc.color}') ON CONFLICT (id) DO NOTHING;\n`;
      });
      if (transactions) transactions.forEach(t => {
          sql += `    INSERT INTO public.transactions (id, user_id, description, amount, type, category, date, is_paid, is_split, is_reserve_withdrawal, account_id, card_id) VALUES ('${t.id}', v_user_id, '${t.description.replace(/'/g, "''")}', ${t.amount}, '${t.type}', '${t.category}', '${t.date}', ${t.is_paid}, ${t.is_split}, ${!!t.is_reserve_withdrawal}, ${t.account_id ? `'${t.account_id}'` : 'NULL'}, ${t.card_id ? `'${t.card_id}'` : 'NULL'}) ON CONFLICT (id) DO NOTHING;\n`;
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

      <div className="bg-amber-900 p-8 rounded-[32px] border border-amber-700">
        <h2 className="text-xl font-black text-white tracking-tight uppercase mb-6">Correção de Erros (SQL)</h2>
        <p className="text-amber-200 text-xs mb-4">Se você estiver vendo erros ao salvar transações, copie e execute este script no SQL Editor do seu Supabase.</p>
        <div className="bg-slate-900/50 rounded-2xl p-4 border border-amber-500/30 mb-6">
          <pre className="text-[10px] font-mono text-amber-300 overflow-x-auto h-40">{sqlFixCode}</pre>
        </div>
        <button onClick={() => copyToClipboard(sqlFixCode)} className="bg-white text-amber-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">Copiar Script de Reparo</button>
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
