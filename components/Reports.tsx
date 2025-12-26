
import React, { useState } from 'react';
import { Transaction } from '../types';

interface ReportsProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const Reports: React.FC<ReportsProps> = ({ transactions, onDelete }) => {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <h2 className="text-xl font-bold">Relatório Detalhado</h2>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['all', 'income', 'expense'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
                }`}
              >
                {f === 'all' ? 'Tudo' : f === 'income' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <th className="pb-4 px-2">Data</th>
                <th className="pb-4 px-2">Descrição</th>
                <th className="pb-4 px-2">Categoria</th>
                <th className="pb-4 px-2 text-right">Valor</th>
                <th className="pb-4 px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-2 text-sm text-gray-500">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4 px-2 font-medium text-gray-900">
                    {t.description}
                  </td>
                  <td className="py-4 px-2">
                    <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-bold text-gray-500 uppercase">
                      {t.category}
                    </span>
                  </td>
                  <td className={`py-4 px-2 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="py-4 px-2 text-right">
                    <button 
                      onClick={() => onDelete(t.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                    Nenhum registro encontrado para este filtro.
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
