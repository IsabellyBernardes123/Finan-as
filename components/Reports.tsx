
import React, { useState, useMemo } from 'react';
import { Transaction, UserCategories, Summary, CreditCard } from '../types';
import { supabase } from '../services/supabaseClient';

interface ReportsProps {
  transactions: Transaction[];
  categories: UserCategories;
}

const Reports: React.FC<ReportsProps> = ({ transactions, categories }) => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('credit_cards').select('*').eq('user_id', session.user.id).then(({ data }) => {
          if (data) setCards(data);
        });
      }
    });
  }, []);

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
  const [selectedPayer, setSelectedPayer] = useState('all');
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
        
        if (selectedPayer === 'individual') return true;
        if (selectedPayer !== 'all') return t.is_split && t.split_details?.partnerName === selectedPayer;
        
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const stats = filtered.reduce((acc, t) => {
      let amt = Number(t.amount);
      if (selectedPayer === 'individual' && t.is_split && t.split_details) {
        amt = Number(t.split_details.userPart);
      } else if (selectedPayer !== 'all' && t.is_split && t.split_details) {
        amt = Number(t.split_details.partnerPart);
      }

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
  }, [transactions, filter, startDate, endDate, selectedCategory, selectedPayer, statusFilter]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const resetFilters = () => {
    const { firstDay, lastDay } = getInitialDates();
    setFilter('all');
    setStartDate(firstDay);
    setEndDate(lastDay);
    setSelectedCategory('all');
    setSelectedPayer('all');
    setStatusFilter('all');
  };

  const exportToExcel = () => {
    const headers = ["Data", "Descrição", "Categoria", "Pagamento", "Tipo", "Valor", "Status"];
    const rows = filteredTransactions.map(t => {
      const card = cards.find(c => c.id === t.card_id);
      let val = t.amount;
      if (selectedPayer === 'individual' && t.is_split && t.split_details) {
        val = t.split_details.userPart;
      } else if (selectedPayer !== 'all' && t.is_split && t.split_details) {
        val = t.split_details.partnerPart;
      }

      return [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.description.replace(/;/g, ','),
        t.category,
        card ? card.name : 'Dinheiro/Pix',
        t.type === 'income' ? 'Entrada' : 'Saída',
        val.toString().replace('.', ','),
        t.is_paid ? 'Pago' : 'Pendente'
      ];
    });
    
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
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.1em] mb-1">SALDO</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
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
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Pagante</label>
            <select 
              value={selectedPayer} 
              onChange={(e) => setSelectedPayer(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-lg px-4 py-3 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Todos</option>
              <option value="individual">Apenas Eu</option>
              {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
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
          <table className="w-full text-left min-w-[900px] print:min-w-0">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b-2 border-slate-50 bg-slate-50/20">
                <th className="py-5 px-4 text-center w-24">Status</th>
                <th className="py-5 px-4">Data</th>
                <th className="py-5 px-4">Descrição</th>
                <th className="py-5 px-4">Categoria</th>
                <th className="py-5 px-4">Pagamento</th>
                <th className="py-5 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => {
                const card = cards.find(c => c.id === t.card_id);
                // Calcula o valor proporcional para exibição
                let displayVal = t.amount;
                if (selectedPayer === 'individual' && t.is_split && t.split_details) {
                  displayVal = t.split_details.userPart;
                } else if (selectedPayer !== 'all' && t.is_split && t.split_details) {
                  displayVal = t.split_details.partnerPart;
                }

                return (
                  <tr key={t.id} className={`hover:bg-slate-50/40 transition-colors ${!t.is_paid ? 'bg-amber-50/5' : ''}`}>
                    <td className="py-6 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded-[4px] text-[8px] font-black uppercase tracking-widest border ${
                        t.is_paid 
                          ? 'bg-teal-50 border-teal-100 text-teal-600' 
                          : 'bg-amber-50 border-amber-100 text-amber-600'
                      }`}>
                        {t.is_paid ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-6 px-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-6 px-4">
                      <p className={`text-sm font-semibold text-slate-900 truncate max-w-[200px] md:max-w-none print:max-w-none ${!t.is_paid ? 'text-slate-400 italic' : ''}`}>
                        {t.description}
                      </p>
                      {t.is_split && t.split_details && (
                        <span className="text-[8px] text-indigo-400 font-bold uppercase block mt-0.5">Participação: {t.split_details.partnerName}</span>
                      )}
                    </td>
                    <td className="py-6 px-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-bold text-indigo-600 uppercase tracking-tighter print:border-none print:p-0">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-6 px-4 whitespace-nowrap">
                       <span className="text-[10px] font-bold text-slate-500 uppercase">
                         {card ? card.name : 'Dinheiro/Pix'}
                       </span>
                    </td>
                    <td className={`py-6 px-4 text-right font-bold text-sm whitespace-nowrap ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''}`}>
                      {formatCurrency(displayVal)}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                   <td colSpan={6} className="py-20 text-center text-slate-300 text-[10px] font-bold uppercase italic tracking-widest">Nenhum registro no período</td>
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
