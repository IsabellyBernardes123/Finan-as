
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, UserCategories, Summary, CreditCard, Account } from '../types';
import { supabase } from '../services/supabaseClient';
import { getCategoryIcon, getCategoryStyles } from '../utils/icons';

interface ReportsProps {
  transactions: Transaction[];
  categories: UserCategories;
}

const Reports: React.FC<ReportsProps> = ({ transactions, categories }) => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [isPayerDropdownOpen, setIsPayerDropdownOpen] = useState(false);
  const payerDropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('credit_cards').select('*').eq('user_id', session.user.id).then(({ data }) => {
          if (data) setCards(data);
        });
        supabase.from('accounts').select('*').eq('user_id', session.user.id).then(({ data }) => {
          if (data) setAccounts(data);
        });
      }
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (payerDropdownRef.current && !payerDropdownRef.current.contains(event.target as Node)) {
        setIsPayerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
  const [selectedPayers, setSelectedPayers] = useState<string[]>(['all']);
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
        
        let matchesPayer = selectedPayers.includes('all');
        if (!matchesPayer) {
           if (selectedPayers.includes('individual') && !t.is_split) matchesPayer = true;
           if (t.is_split && selectedPayers.includes(t.split_details?.partnerName || '')) matchesPayer = true;
        }
        return matchesPayer;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stats = filtered.reduce((acc, t) => {
      let amt = Number(t.amount);
      if (selectedPayers.length === 1 && selectedPayers[0] === 'individual' && t.is_split && t.split_details) {
        amt = Number(t.split_details.userPart);
      } else if (selectedPayers.length === 1 && selectedPayers[0] !== 'all' && t.is_split && t.split_details) {
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
  }, [transactions, filter, startDate, endDate, selectedCategory, selectedPayers, statusFilter]);

  const togglePayerFilter = (payerId: string) => {
    setSelectedPayers(prev => {
      if (payerId === 'all') return ['all'];
      const newFilters = prev.filter(f => f !== 'all');
      if (newFilters.includes(payerId)) {
        const filtered = newFilters.filter(f => f !== payerId);
        return filtered.length === 0 ? ['all'] : filtered;
      } else {
        return [...newFilters, payerId];
      }
    });
  };

  const getPayerButtonLabel = () => {
    if (selectedPayers.includes('all')) return 'Todos';
    if (selectedPayers.length === 1) {
      return selectedPayers[0] === 'individual' ? 'Apenas Eu' : selectedPayers[0];
    }
    return `${selectedPayers.length} Selecionados`;
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const resetFilters = () => {
    const { firstDay, lastDay } = getInitialDates();
    setFilter('all');
    setStartDate(firstDay);
    setEndDate(lastDay);
    setSelectedCategory('all');
    setSelectedPayers(['all']);
    setStatusFilter('all');
    if (window.innerWidth < 1024) setIsFiltersVisible(false);
  };

  const exportToExcel = () => {
    const headers = ["Vencimento", "Pagamento", "Descrição", "Categoria", "Tipo", "Conta / Origem", "Método", "Valor", "Status"];
    const rows = filteredTransactions.map(t => {
      let val = t.amount;
      if (selectedPayers.length === 1 && selectedPayers[0] === 'individual' && t.is_split && t.split_details) {
        val = t.split_details.userPart;
      } else if (selectedPayers.length === 1 && selectedPayers[0] !== 'all' && t.is_split && t.split_details) {
        val = t.split_details.partnerPart;
      }

      const card = t.card_id ? cards.find(c => c.id === t.card_id) : null;
      const account = t.account_id ? accounts.find(a => a.id === t.account_id) : null;
      const source = card ? card.name : (account ? account.name : 'Carteira');
      const method = card ? 'Cartão de Crédito' : 'Dinheiro / Pix';

      return [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.payment_date ? new Date(t.payment_date).toLocaleDateString('pt-BR') : '-',
        t.description.replace(/;/g, ','),
        t.category,
        t.type === 'income' ? 'Entrada' : 'Saída',
        source,
        method,
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

  // Garante que a lista de categorias seja única para o filtro
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set([...categories.expense, ...categories.income])).sort();
  }, [categories]);

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

      <div className="bg-white rounded-lg shadow-sm border border-slate-100 no-print filter-bar relative z-30">
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

        <div className={`p-4 ${isFiltersVisible ? 'block' : 'hidden lg:block'}`}>
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
                {uniqueCategories.map(cat => (
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
            
            <div className="relative" ref={payerDropdownRef}>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Pagantes</label>
              <button 
                onClick={() => setIsPayerDropdownOpen(!isPayerDropdownOpen)}
                className="w-full bg-slate-50 rounded-md px-4 py-2 text-xs font-bold text-slate-700 flex items-center justify-between border border-transparent hover:border-indigo-100 transition-colors"
              >
                <span className="truncate">{getPayerButtonLabel()}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-300 ml-1"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              
              {isPayerDropdownOpen && (
                <div className="absolute bottom-full lg:bottom-auto lg:top-full left-0 right-0 mb-2 lg:mb-0 lg:mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in slide-in-from-bottom-2 lg:slide-in-from-top-2 duration-200 min-w-[200px]">
                  <button onClick={() => togglePayerFilter('all')} className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedPayers.includes('all') ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                      {selectedPayers.includes('all') && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>}
                    </div>
                    <span className="flex-1">Todos</span>
                  </button>
                  <button onClick={() => togglePayerFilter('individual')} className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedPayers.includes('individual') ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                      {selectedPayers.includes('individual') && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>}
                    </div>
                    <span className="flex-1">Apenas Eu</span>
                  </button>
                  <div className="h-px bg-slate-50 my-1 mx-2"></div>
                  {categories.payers?.map(p => (
                    <button key={p} onClick={() => togglePayerFilter(p)} className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedPayers.includes(p) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                        {selectedPayers.includes(p) && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>}
                      </div>
                      <span className="flex-1 truncate">{p}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={resetFilters} className="w-full py-2 text-[9px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors">Resetar</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 md:p-8 rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 print:mb-2">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">Extrato Detalhado</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Filtro aplicado pelo período selecionado</p>
          </div>
          <div className="flex gap-2 no-print w-full md:w-auto">
            <button onClick={exportToExcel} className="flex-1 md:flex-none bg-emerald-50 text-emerald-700 px-4 py-2 rounded-md text-[9px] font-bold uppercase transition-all border border-emerald-100">Exportar</button>
            <button onClick={() => window.print()} className="flex-1 md:flex-none bg-slate-900 text-white px-4 py-2 rounded-md text-[9px] font-bold uppercase transition-all shadow-lg">PDF</button>
          </div>
        </div>

        <div className="hidden md:block print:block print-table-container overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b-2 border-slate-50 bg-slate-50/20 print:bg-transparent print:border-slate-200">
                <th className="py-4 px-3 text-center w-16">Status</th>
                <th className="py-4 px-3 w-24">Vencimento</th>
                <th className="py-4 px-3 w-24">Pagamento</th>
                <th className="py-4 px-3 min-w-[150px]">Descrição</th>
                <th className="py-4 px-3">Categoria</th>
                <th className="py-4 px-3 w-28">Conta / Origem</th>
                <th className="py-4 px-3 w-28">Método</th>
                <th className="py-4 px-3 text-right w-28">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 print:divide-slate-200">
              {filteredTransactions.map((t) => {
                const style = getCategoryStyles(t.category, categories);
                const inlineStyles = style.isCustom ? {
                  backgroundColor: `${style.customColor}15`,
                  color: style.customColor,
                  borderColor: `${style.customColor}30`
                } : {};

                let displayVal = t.amount;
                if (selectedPayers.length === 1 && selectedPayers[0] === 'individual' && t.is_split && t.split_details) { displayVal = t.split_details.userPart; }
                else if (selectedPayers.length === 1 && selectedPayers[0] !== 'all' && t.is_split && t.split_details) { displayVal = t.split_details.partnerPart; }

                const card = t.card_id ? cards.find(c => c.id === t.card_id) : null;
                const account = t.account_id ? accounts.find(a => a.id === t.account_id) : null;

                return (
                  <tr key={t.id} className="hover:bg-slate-50/40 transition-colors print:hover:bg-transparent">
                    <td className="py-4 px-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-[4px] text-[8px] font-black uppercase tracking-widest border ${t.is_paid ? 'bg-teal-50 border-teal-100 text-teal-600' : 'bg-amber-50 border-amber-100 text-amber-600'} print:border-slate-300`}>
                        {t.is_paid ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter print:text-black">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td className="py-4 px-3">
                      {t.payment_date ? (
                        <p className="text-[10px] font-bold text-teal-600 uppercase tracking-tighter">
                          {new Date(t.payment_date).toLocaleDateString('pt-BR')}
                        </p>
                      ) : (
                        <span className="text-[8px] text-slate-200 font-bold italic">-</span>
                      )}
                    </td>
                    <td className="py-4 px-3">
                      <p className="text-[11px] font-bold text-slate-900 leading-tight print:text-black">{t.description}</p>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 print:hidden ${!style.isCustom ? `${style.bg} ${style.text} ${style.border}` : ''}`}
                          style={inlineStyles}
                        >
                          {getCategoryIcon(t.category, 12)}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400 print:text-slate-600">{t.category}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-[10px] font-bold text-slate-500 uppercase print:text-slate-600">
                      {card ? card.name : (account ? account.name : 'CARTEIRA')}
                    </td>
                    <td className="py-4 px-3 text-[10px] font-bold text-indigo-500 uppercase print:text-indigo-600">
                      {card ? 'CARTÃO DE CRÉDITO' : 'DINHEIRO / PIX'}
                    </td>
                    <td className={`py-4 px-3 text-right font-bold text-sm ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''} print:opacity-100`}>
                      {formatCurrency(displayVal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden print:hidden space-y-4">
          {filteredTransactions.map((t) => {
            const style = getCategoryStyles(t.category, categories);
            const inlineStyles = style.isCustom ? {
              backgroundColor: `${style.customColor}15`,
              color: style.customColor,
              borderColor: `${style.customColor}30`
            } : {};

            let displayVal = t.amount;
            if (selectedPayers.length === 1 && selectedPayers[0] === 'individual' && t.is_split && t.split_details) { displayVal = t.split_details.userPart; }
            else if (selectedPayers.length === 1 && selectedPayers[0] !== 'all' && t.is_split && t.split_details) { displayVal = t.split_details.partnerPart; }

            const accountName = t.account_id ? accounts.find(a => a.id === t.account_id)?.name : null;
            const cardName = t.card_id ? cards.find(c => c.id === t.card_id)?.name : null;

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
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${!style.isCustom ? `${style.bg}  ${style.text} ${style.border}` : ''}`}
                        style={inlineStyles}
                      >
                        {getCategoryIcon(t.category, 16)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 leading-tight mb-0.5">{t.description}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">{t.category}</span>
                          <span className="text-[8px] font-black uppercase tracking-tighter text-slate-600">• {cardName || accountName || 'Carteira'}</span>
                          <span className={`text-[8px] font-black uppercase tracking-tighter ${cardName ? 'text-indigo-500' : 'text-slate-400'}`}>• {cardName ? 'Crédito' : 'À Vista'}</span>
                        </div>
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
