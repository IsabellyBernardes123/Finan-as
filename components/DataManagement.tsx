
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

  const handleExport = () => {
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
      
      setMessage({ text: 'Dados exportados com sucesso! Guarde este arquivo em segurança.', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Erro ao exportar dados.', type: 'error' });
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
          
          // 1. Importar Categorias (Perfil)
          if (importedData.categories) {
            await supabase.from('profiles').update({ categories: importedData.categories }).eq('id', userId);
          }

          // 2. Importar Cartões (Mapeando IDs para evitar duplicatas ou conflitos)
          const cardIdMap: Record<string, string> = {};
          if (importedData.cards && Array.isArray(importedData.cards)) {
            for (const card of importedData.cards) {
              const { id: oldId, ...cardWithoutId } = card;
              const { data, error } = await supabase.from('credit_cards').insert([{ ...cardWithoutId, user_id: userId }]).select().single();
              if (data) cardIdMap[oldId] = data.id;
            }
          }

          // 3. Importar Transações
          if (importedData.transactions && Array.isArray(importedData.transactions)) {
            const transactionsToInsert = importedData.transactions.map((t: any) => {
              const { id, ...transWithoutId } = t;
              return {
                ...transWithoutId,
                user_id: userId,
                card_id: t.card_id ? (cardIdMap[t.card_id] || null) : null
              };
            });

            // Inserir em lotes de 50 para não sobrecarregar
            const batchSize = 50;
            for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
              const batch = transactionsToInsert.slice(i, i + batchSize);
              const { error } = await supabase.from('transactions').insert(batch);
              if (error) throw error;
            }
          }

          setMessage({ text: 'Importação concluída com sucesso! Recarregando dados...', type: 'success' });
          setTimeout(() => {
            onRefresh();
            setLoading(false);
          }, 2000);

        } catch (err: any) {
          setMessage({ text: `Erro ao processar arquivo: ${err.message}`, type: 'error' });
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
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div className="mb-8">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Portabilidade de Dados</h2>
          <p className="text-xs font-medium text-slate-400 mt-1">Gerencie seu backup e migre suas informações entre bancos de dados ou contas.</p>
        </div>

        {message && (
          <div className={`mb-8 p-4 rounded-xl border ${message.type === 'success' ? 'bg-teal-50 border-teal-100 text-teal-700' : 'bg-rose-50 border-rose-100 text-rose-700'} text-xs font-bold uppercase tracking-widest text-center`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exportar */}
          <div className="p-6 rounded-2xl border-2 border-slate-50 bg-slate-50/30 flex flex-col items-center text-center group hover:border-indigo-100 transition-all">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Exportar Dados</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-6">Baixe um arquivo JSON com tudo que você lançou até hoje.</p>
            <button 
              onClick={handleExport}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              Iniciar Exportação
            </button>
          </div>

          {/* Importar */}
          <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center text-center group hover:border-indigo-200 transition-all">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Importar Dados</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-6">Carregue um arquivo .json gerado anteriormente para restaurar sua conta.</p>
            
            <label className={`w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg text-center cursor-pointer hover:bg-slate-800 transition-all active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {loading ? 'Processando...' : 'Selecionar Arquivo'}
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport} 
                disabled={loading}
                className="hidden" 
              />
            </label>
          </div>
        </div>

        <div className="mt-12 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-4">
           <div className="text-amber-500 shrink-0">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
           </div>
           <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight leading-relaxed">
             Aviso de Segurança: O arquivo exportado contém suas transações financeiras reais em texto puro. Nunca compartilhe este arquivo com terceiros ou sites desconhecidos.
           </p>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
