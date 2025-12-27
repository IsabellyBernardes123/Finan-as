
import React, { useState } from 'react';
import { Transaction } from '../types';

interface ReportsProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, currentStatus: boolean) => void;
}

const Reports: React.FC<ReportsProps> = ({ transactions, onDelete, onTogglePaid }) => {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="text-center md:text-left">
            <h2 className="text-xl font-bold text-slate-900">Extrato Detalhado</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Todos os lançamentos do período</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
            {(['all', 'income', 'expense'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                  filter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                }`}
              >
                {f === 'all' ? 'Tudo' : f === 'income' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full text-left min-w-[550px]">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/20">
                <th className="py-4 px-3 text-center w-12">Pago</th>
                <th className="py-4 px-3">Data</th>
                <th className="py-4 px-3">Descrição</th>
                <th className="py-4 px-3">Categoria</th>
                <th className="py-4 px-3 text-right">Valor</th>
                <th className="py-4 px-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className={`group hover:bg-slate-50/50 transition-colors ${!t.is_paid ? 'bg-amber-50/10' : ''}`}>
                  <td className="py-4 px-3 text-center">
                    <button 
                      onClick={() => onTogglePaid(t.id, t.is_paid)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center border-2 mx-auto transition-all ${
                        t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200 hover:border-teal-400'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                  </td>
                  <td className="py-4 px-3 text-[10px] font-bold text-slate-400">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4 px-3">
                    <p className={`text-sm font-semibold text-slate-900 ${!t.is_paid ? 'text-slate-400 line-through decoration-slate-300' : ''}`}>
                      {t.description}
                    </p>
                  </td>
                  <td className="py-4 px-3">
                    <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold text-indigo-600 uppercase tracking-tighter">
                      {t.category}
                    </span>
                  </td>
                  <td className={`py-4 px-3 text-right font-bold text-sm ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="py-4 px-3 text-right">
                    <button 
                      onClick={() => onDelete(t.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-200 hover:text-rose-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Nenhum registro encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
