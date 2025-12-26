
import React from 'react';
import { Summary } from '../types';

interface SummaryCardsProps {
  summary: Summary;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Patrimônio Líquido</p>
        <h3 className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
          {formatCurrency(summary.balance)}
        </h3>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-teal-100 transition-colors">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Entradas</p>
        <h3 className="text-2xl font-bold text-teal-600">
          {formatCurrency(summary.income)}
        </h3>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-rose-100 transition-colors">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Saídas</p>
        <h3 className="text-2xl font-bold text-rose-500">
          {formatCurrency(summary.expenses)}
        </h3>
      </div>
    </div>
  );
};

export default SummaryCards;
