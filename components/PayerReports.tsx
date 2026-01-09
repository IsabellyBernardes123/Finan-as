
import React, { useState, useMemo } from 'react';
import { Transaction, UserCategories } from '../types';
import { getCategoryIcon } from '../utils/icons';

interface PayerReportsProps {
  transactions: Transaction[];
  categories: UserCategories;
}

const PayerReports: React.FC<PayerReportsProps> = ({ transactions, categories }) => {
  const getInitialDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { firstDay, lastDay };
  };

  const { firstDay: initStart, lastDay: initEnd } = getInitialDates();
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate] = useState(initEnd);
  const [expandedPayer, setExpandedPayer] = useState<string | null>(null);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const payerData = useMemo(() => {
    const results: Record<string, {
      totalToReceive: number;
      paid: number;
      pending: number;
      transactions: Transaction[];
    }> = {};

    // Inicializar com todos os pagantes cadastrados
    categories.payers.forEach(p => {
      results[p] = { totalToReceive: 0, paid: 0, pending: 0, transactions: [] };
    });

    // Filtrar e agrupar transações splitadas
    transactions
      .filter(t => t.is_split && t.split_details)
      .forEach(t => {
        const tDate = t.date.split('T')[0];
        if (tDate >= startDate && tDate <= endDate) {
          const name = t.split_details!.partnerName;
          const part = Number(t.split_details!.partnerPart);

          if (!results[name]) {
            results[name] = { totalToReceive: 0, paid: 0, pending: 0, transactions: [] };
          }

          results[name].totalToReceive += part;
          if (t.is_paid) results[name].paid += part;
          else results[name].pending += part;
          
          results[name].transactions.push(t);
        }
      });

    return Object.entries(results).map(([name, data]) => ({ name, ...data }));
  }, [transactions, categories.payers, startDate, endDate]);

  const grandTotalPending = payerData.reduce((acc, curr) => acc + curr.pending, 0);

  const exportToExcel = () => {
    const headers = ["Pagante", "Status", "Data", "Descrição", "Valor Total", "Parte do Pagante"];
    const rows: string[][] = [];

    payerData.forEach(payer => {
      payer.transactions.forEach(t => {
        rows.push([
          payer.name,
          t.is_paid ? "Pago" : "Pendente",
          new Date(t.date).toLocaleDateString('pt-BR'),
          t.description.replace(/;/g, ','),
          t.amount.toString().replace('.', ','),
          (t.split_details?.partnerPart || 0).toString().replace('.', ',')
        ]);
      });
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(";") + "\n" 
      + rows.map(e => e.join(";")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_pagantes_${startDate}_ate_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-0">
      {/* Header com Filtros e Exportação */}
      <div className="bg-white p-4 md:p-6 rounded-lg border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-3 w-full lg:w-auto">
           <div className="p-3 bg-amber-50 rounded-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
           </div>
           <div>
             <h3 className="text-xl font-bold text-slate-900">Extrato de Pagantes</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Resumo de divisões e pendências</p>
           </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="flex-1 md:flex-none bg-slate-50 border-none rounded-md px-4 py-2.5 text-xs font-bold text-indigo-600 outline-none" 
            />
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="flex-1 md:flex-none bg-slate-50 border-none rounded-md px-4 py-2.5 text-xs font-bold text-indigo-600 outline-none" 
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4">
            <button 
              onClick={exportToExcel}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-md text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              Exportar
            </button>
            <button 
              onClick={() => window.print()}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-md text-[9px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card de Resumo Geral */}
        <div className="md:col-span-2 lg:col-span-3 bg-white p-6 rounded-lg border border-indigo-100 shadow-sm flex items-center justify-between print:border-slate-200">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Geral a Receber</p>
            <h2 className="text-3xl font-black text-indigo-600">{formatCurrency(grandTotalPending)}</h2>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Já Pago</p>
             <p className="text-xl font-black text-slate-400">{formatCurrency(payerData.reduce((acc, curr) => acc + curr.paid, 0))}</p>
          </div>
        </div>

        {payerData.map(payer => {
          const isExpanded = expandedPayer === payer.name;
          return (
            <div key={payer.name} className={`bg-white rounded-lg border transition-all print:break-inside-avoid print:border-slate-200 print:mb-6 print:shadow-none ${isExpanded ? 'ring-2 ring-indigo-50 border-indigo-200 lg:col-span-3 md:col-span-2' : 'border-slate-100 hover:shadow-lg no-print'}`}>
              <div 
                onClick={() => setExpandedPayer(isExpanded ? null : payer.name)}
                className={`p-6 cursor-pointer flex justify-between items-center ${isExpanded ? 'border-b border-slate-50' : ''} print:cursor-default print:border-b print:pb-4`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-md bg-slate-50 flex items-center justify-center text-indigo-600 font-black text-lg border border-slate-100 print:bg-slate-100">
                    {payer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{payer.name}</h4>
                    <p className={`text-[10px] font-black uppercase tracking-tighter ${payer.pending > 0 ? 'text-amber-500' : 'text-teal-600'}`}>
                      {payer.pending > 0 ? `Pendente: ${formatCurrency(payer.pending)}` : 'Tudo em dia'}
                    </p>
                  </div>
                </div>
                <div className={`transition-transform duration-300 no-print ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>

              {/* Detalhes (Sempre visível na impressão) */}
              <div className={`px-6 pb-6 ${isExpanded ? 'animate-in slide-in-from-top-2 block pt-6' : 'hidden print:block print:pt-6'}`}>
                <div className="bg-slate-50 rounded-lg p-4 mb-6 grid grid-cols-2 gap-4 print:bg-white print:border print:border-slate-100">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Recebido</p>
                    <p className="text-sm font-bold text-teal-600">{formatCurrency(payer.paid)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">A Receber</p>
                    <p className="text-sm font-bold text-rose-500">{formatCurrency(payer.pending)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Transações Vinculadas</h5>
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left min-w-[500px] print:min-w-0">
                      <thead>
                        <tr className="text-[8px] font-black text-slate-300 uppercase border-b border-slate-100">
                          <th className="pb-2">Data</th>
                          <th className="pb-2">Descrição / Categoria</th>
                          <th className="pb-2 text-right">Total</th>
                          <th className="pb-2 text-right">Parte Dele(a)</th>
                          <th className="pb-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {payer.transactions.map(t => (
                          <tr key={t.id} className="text-xs group hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 text-slate-400 font-bold whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md bg-white border border-slate-100 flex items-center justify-center shrink-0 print:hidden">
                                  {getCategoryIcon(t.category)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 leading-tight">{t.description}</p>
                                  <p className="text-[9px] text-indigo-400 font-bold uppercase">{t.category}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-right font-medium text-slate-400 italic">{formatCurrency(t.amount)}</td>
                            <td className="py-3 text-right font-black text-slate-900">{formatCurrency(Number(t.split_details?.partnerPart || 0))}</td>
                            <td className="py-3 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${t.is_paid ? 'bg-teal-50 border-teal-100 text-teal-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                                {t.is_paid ? 'PAGO' : 'PENDENTE'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PayerReports;
