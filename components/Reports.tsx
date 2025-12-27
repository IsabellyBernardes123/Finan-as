
import React, { useState, useMemo } from 'react';
import { Transaction, UserCategories, Summary } from '../types';

interface ReportsProps {
  transactions: Transaction[];
  categories: UserCategories;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, currentStatus: boolean) => void;
  onEdit: (t: Transaction) => void;
}

const Reports: React.FC<ReportsProps> = ({ transactions, categories, onDelete, onTogglePaid, onEdit }) => {
  const getInitialDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { firstDay, lastDay };
  };

  const { firstDay: initStart, lastDay: initEnd } = getInitialDates();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate] = useState(initEnd);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const { filteredTransactions, summary } = useMemo(() => {
    const filtered = transactions
      .filter(t => {
        if (filter !== 'all' && t.type !== filter) return false;
        const tDate = t.date.split('T')[0];
        if (tDate < startDate || tDate > endDate) return false;
        if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
        if (statusFilter === 'paid' && !t.is_paid) return false;
        if (statusFilter === 'pending' && t.is_paid) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const stats = filtered.reduce((acc, t) => {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        acc.income += amt;
        acc.balance += amt;
      } else {
        acc.expenses += amt;
        acc.balance -= amt;
      }
      return acc;
    }, { balance: 0, income: 0, expenses: 0 } as Summary);

    return { filteredTransactions: filtered, summary: stats };
  }, [transactions, filter, startDate, endDate, selectedCategory, statusFilter]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const resetFilters = () => {
    const { firstDay, lastDay } = getInitialDates();
    setFilter('all');
    setStartDate(firstDay);
    setEndDate(lastDay);
    setSelectedCategory('all');
    setStatusFilter('all');
  };

  const exportToExcel = () => {
    const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Status"];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      t.description.replace(/;/g, ','),
      t.category,
      t.type === 'income' ? 'Entrada' : 'Saída',
      t.amount.toString().replace('.', ','),
      t.is_paid ? 'Pago' : 'Pendente'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(";") + "\n" 
      + rows.map(e => e.join(";")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_${startDate}_ate_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 print:mb-8 print:border-b print:pb-6">
        <div className="bg-white p-5 md:p-7 rounded-xl shadow-sm border border-slate-50 flex flex-col justify-center print:border-none print:p-0">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.1em] mb-1">PATRIMÔNIO LÍQUIDO</p>
          <h3 className="text-xl md:text-3xl font-bold text-slate-900">{formatCurrency(summary.balance)}</h3>
        </div>
        <div className="bg-white p-5 md:p-7 rounded-xl shadow-sm border border-slate-50 flex flex-col justify-center print:border-none print:p-0">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.1em] mb-1">ENTRADAS</p>
          <h3 className="text-xl md:text-3xl font-bold text-teal-600">{formatCurrency(summary.income)}</h3>
        </div>
        <div className="bg-white p-5 md:p-7 rounded-xl shadow-sm border border-slate-50 flex flex-col justify-center print:border-none print:p-0">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.1em] mb-1">SAÍDAS</p>
          <h3 className="text-xl md:text-3xl font-bold text-rose-500">{formatCurrency(summary.expenses)}</h3>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Início</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ colorScheme: 'light' }}
                className="w-full bg-slate-50 border-none rounded-lg px-3 py-3 text-xs font-bold text-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Fim</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ colorScheme: 'light' }}
                className="w-full bg-slate-50 border-none rounded-lg px-3 py-3 text-xs font-bold text-indigo-600 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Categoria</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-lg px-4 py-3 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Todas</option>
              {[...categories.expense, ...categories.income].sort().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Status</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border-none rounded-lg px-4 py-3 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Todos</option>
              <option value="paid">Pagos</option>
              <option value="pending">Pendentes</option>
            </select>
          </div>
          <button 
            onClick={resetFilters}
            className="w-full py-3 text-[9px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors text-center"
          >
            Resetar
          </button>
        </div>
      </div>

      <div className="bg-white p-4 md:p-10 rounded-xl shadow-sm border border-slate-100 overflow-hidden print:p-0 print:border-none print:shadow-none">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 print:mb-4">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">Registros do Período</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Filtrado de {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <div className="flex gap-2 no-print w-full md:w-auto">
            <button 
              onClick={exportToExcel}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              Exportar
            </button>
            <button 
              onClick={() => window.print()}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 print:overflow-visible print:mx-0 print:px-0">
          <table className="w-full text-left min-w-[700px] print:min-w-0">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b-2 border-slate-50 bg-slate-50/20">
                <th className="py-5 px-4 text-center w-16 no-print">Pago</th>
                <th className="py-5 px-4">Data</th>
                <th className="py-5 px-4">Descrição</th>
                <th className="py-5 px-4">Categoria</th>
                <th className="py-5 px-4 text-right">Valor</th>
                <th className="py-5 px-4 w-24 no-print text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50/40 transition-colors ${!t.is_paid ? 'bg-amber-50/10' : ''}`}>
                  <td className="py-6 px-4 text-center no-print">
                    <button 
                      onClick={() => onTogglePaid(t.id, t.is_paid)}
                      className={`w-6 h-6 rounded flex items-center justify-center border-2 mx-auto transition-all ${
                        t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200 hover:border-teal-400'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                  </td>
                  <td className="py-6 px-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-6 px-4">
                    <p className={`text-sm font-semibold text-slate-900 truncate max-w-[150px] md:max-w-none print:max-w-none ${!t.is_paid ? 'text-slate-400 line-through decoration-slate-300' : ''}`}>
                      {t.description}
                    </p>
                  </td>
                  <td className="py-6 px-4 whitespace-nowrap">
                    <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-bold text-indigo-600 uppercase tracking-tighter print:border-none print:p-0">
                      {t.category}
                    </span>
                  </td>
                  <td className={`py-6 px-4 text-right font-bold text-sm whitespace-nowrap ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''}`}>
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="py-6 px-4 text-center no-print">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onEdit(t)} className="p-2 text-slate-400 hover:text-indigo-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                      <button onClick={() => onDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
