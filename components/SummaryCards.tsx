
import React from 'react';
import { Summary } from '../types';

interface SummaryCardsProps {
  summary: Summary;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 transition-all">
        <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-1.5">Saldo</p>
        <h3 className={`text-xl md:text-2xl font-bold truncate ${summary.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
          {formatCurrency(summary.balance)}
        </h3>
      </div>
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 transition-all">
        <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-1.5">Entradas</p>
        <h3 className="text-xl md:text-2xl font-bold text-teal-600 truncate">
          {formatCurrency(summary.income)}
        </h3>
      </div>
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 transition-all">
        <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-1.5">Saídas</p>
        <h3 className="text-xl md:text-2xl font-bold text-rose-500 truncate">
          {formatCurrency(summary.expenses)}
        </h3>
      </div>
    </div>
  );
};

export default SummaryCards;
