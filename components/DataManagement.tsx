
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Transaction, CreditCard, UserCategories } from '../types';

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

  const sqlFixCode = `-- EXECUTE ESTE SCRIPT NO 'SQL EDITOR' DO SEU SUPABASE
-- Isso vai liberar a criação de perfis, transações e cartões.

-- 1. Permissões para a tabela PROFILES
CREATE POLICY "Users can insert own profile" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Permissões para a tabela TRANSACTIONS
CREATE POLICY "Users can insert own transactions" ON public.transactions 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Permissões para a tabela CREDIT_CARDS
CREATE POLICY "Users can insert own cards" ON public.credit_cards 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- OBS: Se der erro dizendo que a política já existe, ignore e execute as outras.`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: 'Script copiado! Agora cole no SQL Editor do Supabase.', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportJSON = () => {
    try {
      const dataToExport = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        categories,
        cards,
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

  const handleExportSQL = () => {
    try {
      let sql = `-- SCRIPT DE MIGRAÇÃO FINANCEPRO\n`;
      sql += `-- Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
      
      sql += `DO $$\n`;
      sql += `DECLARE\n`;
      sql += `    v_user_id UUID;\n`;
      sql += `BEGIN\n`;
      sql += `    -- Busca o ID do primeiro usuário encontrado no novo banco\n`;
      sql += `    SELECT id INTO v_user_id FROM auth.users LIMIT 1;\n\n`;
      sql += `    IF v_user_id IS NULL THEN\n`;
      sql += `        RAISE EXCEPTION 'Nenhum usuário encontrado em auth.users. Crie uma conta no novo app ANTES de rodar este script!';\n`;
      sql += `    END IF;\n\n`;
      sql += `    RAISE NOTICE 'Vinculando dados ao usuário ID: %', v_user_id;\n\n`;

      const catsJson = JSON.stringify(categories).replace(/'/g, "''");
      sql += `    INSERT INTO profiles (id, categories) \n`;
      sql += `    VALUES (v_user_id, '${catsJson}'::jsonb) \n`;
      sql += `    ON CONFLICT (id) DO UPDATE SET categories = EXCLUDED.categories;\n\n`;

      if (cards.length > 0) {
        cards.forEach(card => {
          const name = card.name.replace(/'/g, "''");
          sql += `    INSERT INTO credit_cards (id, user_id, name, color, credit_limit, closing_day, due_day) \n`;
          sql += `    VALUES ('${card.id}', v_user_id, '${name}', '${card.color}', ${card.credit_limit}, ${card.closing_day}, ${card.due_day}) \n`;
          sql += `    ON CONFLICT (id) DO NOTHING;\n`;
        });
        sql += `\n`;
      }

      if (transactions.length > 0) {
        transactions.forEach(t => {
          const desc = t.description.replace(/'/g, "''");
          const cardId = t.card_id ? `'${t.card_id}'` : 'NULL';
          const pDate = t.payment_date ? `'${t.payment_date}'` : 'NULL';
          const splitDetails = t.split_details ? `'${JSON.stringify(t.split_details).replace(/'/g, "''")}'::jsonb` : 'NULL';

          sql += `    INSERT INTO transactions (id, user_id, description, amount, type, category, date, payment_date, card_id, is_split, split_details, is_paid) \n`;
          sql += `    VALUES ('${t.id}', v_user_id, '${desc}', ${t.amount}, '${t.type}', '${t.category}', '${t.date}', ${pDate}, ${cardId}, ${t.is_split}, ${splitDetails}, ${t.is_paid}) \n`;
          sql += `    ON CONFLICT (id) DO NOTHING;\n`;
        });
      }

      sql += `END $$;`;

      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `migracao_supabase_corrigida_${new Date().toISOString().split('T')[0]}.sql`;
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

    const confirmImport = window.confirm("Atenção: A importação irá ADICIONAR os dados do arquivo ao seu banco atual. Deseja continuar?");
    if (!confirmImport) return;

    setLoading(true);
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          
          if (importedData.categories) {
            await supabase.from('profiles').update({ categories: importedData.categories }).eq('id', userId);
          }

          const cardIdMap: Record<string, string> = {};
          if (importedData.cards && Array.isArray(importedData.cards)) {
            for (const card of importedData.cards) {
              const { id: oldId, ...cardWithoutId } = card;
              const { data, error } = await supabase.from('credit_cards').insert([{ ...cardWithoutId, user_id: userId }]).select().single();
              if (data) cardIdMap[oldId] = data.id;
            }
          }

          if (importedData.transactions && Array.isArray(importedData.transactions)) {
            const transactionsToInsert = importedData.transactions.map((t: any) => {
              const { id, ...transWithoutId } = t;
              return {
                ...transWithoutId,
                user_id: userId,
                card_id: t.card_id ? (cardIdMap[t.card_id] || null) : null
              };
            });

            const batchSize = 50;
            for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
              const batch = transactionsToInsert.slice(i, i + batchSize);
              const { error } = await supabase.from('transactions').insert(batch);
              if (error) throw error;
            }
          }

          setMessage({ text: 'Importação concluída com sucesso!', type: 'success' });
          setTimeout(() => { onRefresh(); setLoading(false); }, 2000);
        } catch (err: any) {
          setMessage({ text: `Erro: ${err.message}`, type: 'error' });
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setMessage({ text: 'Erro ao ler arquivo.', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* SEÇÃO NOVA: CONSERTAR BANCO */}
      <div className="bg-indigo-900 p-8 rounded-[32px] shadow-2xl shadow-indigo-200 border border-indigo-700 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m12 14 4-4"/><path d="m3 3 3 3"/><path d="m15 4 5 5"/><path d="M21 21l-4.5-4.5"/><path d="M22 22l-10-10"/></svg>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Corrigir Permissões de Gravação</h2>
          </div>

          <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-6 leading-relaxed">
            Se a sua tabela "profiles" ou "transactions" está vazia, é porque falta a regra de <span className="text-white underline italic">INSERT</span> no Supabase. Execute o código abaixo para liberar.
          </p>

          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-4 border border-indigo-500/30 mb-6">
            <pre className="text-[10px] font-mono text-indigo-300 leading-relaxed overflow-x-auto whitespace-pre">
              {sqlFixCode}
            </pre>
          </div>

          <button 
            onClick={() => copyToClipboard(sqlFixCode)}
            className="bg-white text-indigo-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Copiar Script SQL
          </button>
        </div>
      </div>

      {/* SEÇÃO EXISTENTE: EXPORTAR/IMPORTAR */}
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-8">
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Portabilidade & Backup</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gerencie seus dados e faça migrações.</p>
        </div>

        {message && (
          <div className={`mb-8 p-4 rounded-xl border animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-teal-50 border-teal-100 text-teal-700' : 'bg-rose-50 border-rose-100 text-rose-700'} text-[10px] font-bold uppercase tracking-widest text-center`}>
            {message.text}
          </div>
        )}

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
      </div>
    </div>
  );
};

export default DataManagement;
