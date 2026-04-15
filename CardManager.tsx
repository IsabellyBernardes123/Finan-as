
import React from 'react';
import { Summary } from '../types';

interface SummaryCardsProps {
  summary: Summary;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const cardBase = "bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex items-center gap-3 transition-all hover:shadow-md w-full";
  const iconBase = "w-10 h-10 rounded-md flex items-center justify-center shrink-0";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 md:mb-6">
      {/* Saldo */}
      <div className={cardBase}>
        <div className={`${iconBase} bg-indigo-50 text-indigo-600`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">Saldo Geral</p>
          <h3 className={`text-lg font-black truncate ${summary.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {formatCurrency(summary.balance)}
          </h3>
        </div>
      </div>

      {/* Entradas */}
      <div className={cardBase}>
        <div className={`${iconBase} bg-teal-50 text-teal-600`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">Entradas</p>
          <h3 className="text-lg font-black text-teal-600 truncate">
            {formatCurrency(summary.income)}
          </h3>
        </div>
      </div>

      {/* Saídas */}
      <div className={cardBase}>
        <div className={`${iconBase} bg-rose-50 text-rose-500`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m17 14-5-5-5 5"/><path d="M12 9v12"/></svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">Saídas</p>
          <h3 className="text-lg font-black text-rose-500 truncate">
            {formatCurrency(summary.expenses)}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
