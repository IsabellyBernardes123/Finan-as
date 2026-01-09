
import React, { useState, useMemo } from 'react';
import { Transaction, UserCategories, Summary, CreditCard } from '../types';
import { supabase } from '../services/supabaseClient';
import { getCategoryIcon, getCategoryStyles } from '../utils/icons';

interface ReportsProps {
  transactions: Transaction[];
  categories: UserCategories;
}

const Reports: React.FC<ReportsProps> = ({ transactions, categories }) => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  
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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    if (window.innerWidth < 1024) setIsFiltersVisible(false);
  };

  const exportToExcel = () => {
    const headers = ["Vencimento", "Pagamento", "Descrição", "Categoria", "Tipo", "Valor", "Status"];
    const rows = filteredTransactions.map(t => {
      let val = t.amount;
      if (selectedPayer === 'individual' && t.is_split && t.split_details) {
        val = t.split_details.userPart;
      } else if (selectedPayer !== 'all' && t.is_split && t.split_details) {
        val = t.split_details.partnerPart;
      }

      return [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.payment_date ? new Date(t.payment_date).toLocaleDateString('pt-BR') : '-',
        t.description.replace(/;/g, ','),
        t.category,
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
        <div className="bg-white p-4 md:p-7 rounded-lg shadow-sm border border-slate-50 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.1em] mb-1">SALDO</p>
          <h3 className="text-xl md:text-3xl font-bold text-slate-900">{formatCurrency(summary.balance)}</h3>
        </div>
        <div className="bg-white p-4 md:p-7 rounded-lg shadow-sm border border-slate-50 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.1em] mb-1">ENTRADAS</p>
          <h3 className="text-xl md:text-3xl font-bold text-teal-600">{formatCurrency(summary.income)}</h3>
        </div>
        <div className="bg-white p-4 md:p-7 rounded-lg shadow-sm border border-slate-50 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.1em] mb-1">SAÍDAS</p>
          <h3 className="text-xl md:text-3xl font-bold text-rose-500">{formatCurrency(summary.expenses)}</h3>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-100 no-print overflow-hidden">
        {/* Mobile Toggle Button */}
        <button 
          onClick={() => setIsFiltersVisible(!isFiltersVisible)}
          className="w-full px-4 py-3 flex items-center justify-between lg:hidden transition-colors hover:bg-slate-50 border-b border-transparent data-[open=true]:border-slate-100"
          data-open={isFiltersVisible}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-600">
              <path d="M21 4H3"/><path d="M20 8H4"/><path d="M18 12H6"/><path d="M15 16H9"/><path d="M12 20H12"/>
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Opções de Filtro</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-slate-300 transition-transform duration-300 ${isFiltersVisible ? 'rotate-180' : ''}`}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <div className={`p-4 ${isFiltersVisible ? 'block animate-in slide-in-from-top-2 duration-300' : 'hidden lg:block'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Início</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-3 py-2 text-xs font-bold text-indigo-600 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Fim</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-3 py-2 text-xs font-bold text-indigo-600 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Categoria</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-4 py-2 text-xs font-bold text-slate-700 outline-none">
                <option value="all">Todas</option>
                {[...categories.expense, ...categories.income].sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full bg-slate-50 border-none rounded-md px-4 py-2 text-xs font-bold text-slate-700 outline-none">
                <option value="all">Todos</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Pagante</label>
              <select value={selectedPayer} onChange={(e) => setSelectedPayer(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-4 py-2 text-xs font-bold text-slate-700 outline-none">
                <option value="all">Todos</option>
                <option value="individual">Apenas Eu</option>
                {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button onClick={resetFilters} className="w-full py-2 text-[9px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors">Resetar</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 md:p-8 rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">Extrato Detalhado</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Filtro aplicado pelo período selecionado</p>
          </div>
          <div className="flex gap-2 no-print w-full md:w-auto">
            <button onClick={exportToExcel} className="flex-1 md:flex-none bg-emerald-50 text-emerald-700 px-4 py-2 rounded-md text-[9px] font-bold uppercase transition-all border border-emerald-100">Exportar</button>
            <button onClick={() => window.print()} className="flex-1 md:flex-none bg-slate-900 text-white px-4 py-2 rounded-md text-[9px] font-bold uppercase transition-all shadow-lg">PDF</button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b-2 border-slate-50 bg-slate-50/20">
                <th className="py-4 px-4 text-center w-24">Status</th>
                <th className="py-4 px-4">Datas</th>
                <th className="py-4 px-4">Descrição / Categoria</th>
                <th className="py-4 px-4">Pagamento</th>
                <th className="py-4 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => {
                const card = cards.find(c => c.id === t.card_id);
                const style = getCategoryStyles(t.category, categories);
                const inlineStyles = style.isCustom ? {
                  backgroundColor: `${style.customColor}15`,
                  color: style.customColor,
                  borderColor: `${style.customColor}30`
                } : {};

                let displayVal = t.amount;
                if (selectedPayer === 'individual' && t.is_split && t.split_details) { displayVal = t.split_details.userPart; }
                else if (selectedPayer !== 'all' && t.is_split && t.split_details) { displayVal = t.split_details.partnerPart; }

                return (
                  <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded-[4px] text-[8px] font-black uppercase tracking-widest border ${t.is_paid ? 'bg-teal-50 border-teal-100 text-teal-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                        {t.is_paid ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Venc: {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                      {t.payment_date && <p className="text-[9px] font-black text-teal-600 uppercase tracking-tighter">Pago: {new Date(t.payment_date).toLocaleDateString('pt-BR')}</p>}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${!style.isCustom ? `${style.bg} ${style.text} ${style.border}` : ''}`}
                          style={inlineStyles}
                        >
                          {getCategoryIcon(t.category, 16)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">{t.description}</p>
                          <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400">{t.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-[10px] font-bold text-slate-500 uppercase">{card ? card.name : 'Dinheiro/Pix'}</td>
                    <td className={`py-4 px-4 text-right font-bold text-sm ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''}`}>
                      {formatCurrency(displayVal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4">
          {filteredTransactions.map((t) => {
            const card = cards.find(c => c.id === t.card_id);
            const style = getCategoryStyles(t.category, categories);
            const inlineStyles = style.isCustom ? {
              backgroundColor: `${style.customColor}15`,
              color: style.customColor,
              borderColor: `${style.customColor}30`
            } : {};

            let displayVal = t.amount;
            if (selectedPayer === 'individual' && t.is_split && t.split_details) { displayVal = t.split_details.userPart; }
            else if (selectedPayer !== 'all' && t.is_split && t.split_details) { displayVal = t.split_details.partnerPart; }

            return (
              <div key={t.id} className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-lg border border-transparent hover:border-slate-100 transition-all">
                <div className="flex justify-between items-center">
                   <div className="flex flex-col">
                     <span className="text-[8px] font-bold text-slate-400 uppercase">Venc: {new Date(t.date).toLocaleDateString('pt-BR')}</span>
                     {t.payment_date && <span className="text-[8px] font-black text-teal-600 uppercase">Pago: {new Date(t.payment_date).toLocaleDateString('pt-BR')}</span>}
                   </div>
                   <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${t.is_paid ? 'bg-teal-50 border-teal-100 text-teal-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                     {t.is_paid ? 'Pago' : 'Pendente'}
                   </span>
                </div>
                <div className="flex justify-between items-end">
                   <div className="flex items-center gap-3">
                      <div 
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 print:hidden ${!style.isCustom ? `${style.bg} ${style.text} ${style.border}` : ''}`}
                        style={inlineStyles}
                      >
                        {getCategoryIcon(t.category, 16)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 leading-tight mb-0.5">{t.description}</p>
                        <p className="text-[8px] font-black uppercase tracking-tighter text-slate-400">
                          {t.category} <span className="text-slate-400">• {card ? card.name : 'Dinheiro'}</span>
                        </p>
                      </div>
                   </div>
                   <p className={`text-sm font-black ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''}`}>
                     {formatCurrency(displayVal)}
                   </p>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="py-16 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">Nenhum registro no período</div>
        )}
      </div>
    </div>
  );
};

export default Reports;
