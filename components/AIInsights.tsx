
import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { getFinancialInsights, AIInsightResponse } from '../services/geminiService';

interface AIInsightsProps {
  transactions: Transaction[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ transactions }) => {
  const [insight, setInsight] = useState<AIInsightResponse | string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async () => {
    if (transactions.length < 3) {
      setInsight("Adicione ao menos 3 transações para que eu possa analisar seu equilíbrio de vida.");
      return;
    }
    setLoading(true);
    const result = await getFinancialInsights(transactions);
    setInsight(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsight();
  }, [transactions.length < 3]);

  const isStructured = (data: any): data is AIInsightResponse => {
    return data && typeof data === 'object' && 'analysis' in data;
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden transition-all hover:border-indigo-200">
      <div className="bg-indigo-600/5 px-5 py-4 flex items-center justify-between border-b border-indigo-50">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v8"/><path d="m4.93 4.93 7.07 7.07"/><path d="M2 12h8"/><path d="m4.93 19.07 7.07-7.07"/><path d="M12 22v-8"/><path d="m19.07 19.07-7.07-7.07"/><path d="M22 12h-8"/><path d="m19.07 4.93-7.07 7.07"/></svg>
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Equilíbrio Estratégico</h3>
            <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter">Consultoria via Inteligência Artificial</span>
          </div>
        </div>
        
        {transactions.length >= 3 && (
          <button 
            onClick={fetchInsight} 
            disabled={loading}
            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={loading ? 'animate-spin' : ''}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
          </button>
        )}
      </div>
      
      <div className="p-5">
        {loading ? (
          <div className="space-y-4 py-2">
            <div className="h-4 bg-slate-50 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-slate-50 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-slate-50 rounded animate-pulse w-2/3"></div>
          </div>
        ) : isStructured(insight) ? (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="shrink-0 w-1 bg-indigo-500 rounded-full"></div>
              <div>
                <h4 className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Diagnóstico de Estilo de Vida</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed font-medium">{insight.analysis}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 w-1 bg-teal-500 rounded-full"></div>
              <div>
                <h4 className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">Ajuste Fino de Orçamento</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed font-medium">{insight.savings}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 w-1 bg-amber-500 rounded-full"></div>
              <div>
                <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Visão de Futuro</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed font-medium">{insight.tip}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-xs font-semibold">
              {insight || "Analisando seu padrão de vida..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
