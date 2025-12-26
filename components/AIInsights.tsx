
import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { getFinancialInsights } from '../services/geminiService';

interface AIInsightsProps {
  transactions: Transaction[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ transactions }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchInsight = async () => {
    setLoading(true);
    const result = await getFinancialInsights(transactions);
    setInsight(result);
    setLoading(false);
  };

  useEffect(() => {
    if (transactions.length > 2) fetchInsight();
    else setInsight("Lance 3 transações para desbloquear a análise da IA.");
  }, [transactions.length]);

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm shadow-indigo-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v8"/><path d="m4.93 4.93 7.07 7.07"/><path d="M2 12h8"/><path d="m4.93 19.07 7.07-7.07"/><path d="M12 22v-8"/><path d="m19.07 19.07-7.07-7.07"/><path d="M22 12h-8"/><path d="m19.07 4.93-7.07 7.07"/></svg>
        </div>
        <h3 className="text-[11px] font-bold text-indigo-900 uppercase tracking-widest">Consultor IA</h3>
      </div>
      
      {loading ? (
        <div className="flex gap-1.5 py-2">
          <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"></div>
          <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce delay-75"></div>
          <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce delay-150"></div>
        </div>
      ) : (
        <p className="text-indigo-900/80 text-xs leading-relaxed font-medium italic">
          "{insight}"
        </p>
      )}
    </div>
  );
};

export default AIInsights;
