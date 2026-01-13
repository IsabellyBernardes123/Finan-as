
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import { useFinanceData } from './hooks/useFinanceData';
import SummaryCards from './components/SummaryCards';
import TransactionForm from './components/TransactionForm';
import Charts from './components/Charts';
import AIInsights from './components/AIInsights';
import Sidebar, { ViewType } from './components/Sidebar';
import Reports from './components/Reports';
import CategoryManager from './components/CategoryManager';
import CardManager from './components/CardManager';
import AccountManager from './components/AccountManager';
import PayerManager from './components/PayerManager';
import PayerReports from './components/PayerReports';
import AuthScreen from './components/AuthScreen';
import Logo from './components/Logo';
import { TransactionType, User, Summary, Transaction } from './types';
import { getCategoryIcon, getCategoryStyles } from './utils/icons';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const { 
    transactions, cards, accounts, categories, 
    addTransaction, updateTransaction, deleteTransaction, togglePaid,
    addCard, updateCard, deleteCard, 
    addAccount, deleteAccount,
    addCategory, updateCategory, deleteCategory, loading: dataLoading
  } = useFinanceData(currentUser?.id || null);
  
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // --- States para Modais ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState<boolean>(false);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  
  // --- States de Filtro ---
  const getInitialDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { firstDay, lastDay };
  };

  const { firstDay: initStart, lastDay: initEnd } = getInitialDates();
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate] = useState(initEnd);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPayers, setSelectedPayers] = useState<string[]>(['all']);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [isPayerDropdownOpen, setIsPayerDropdownOpen] = useState(false);
  const payerDropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (payerDropdownRef.current && !payerDropdownRef.current.contains(event.target as Node)) {
        setIsPayerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user);
      else setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) fetchProfile(session.user);
      else { setCurrentUser(null); setSessionLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authUser: any) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_color, categories')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile) {
        setCurrentUser({ id: authUser.id, name: profile.name, avatarColor: profile.avatar_color });
        setDbError(null);
      } else {
        const userName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário';
        const defaultCategories = {
          expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Cartão', 'Outros'],
          income: ['Salário', 'Freelance', 'Investimentos', 'Presentes', 'Outros'],
          payers: [userName.split(' ')[0] || 'Eu'],
          colors: {},
          icons: {}
        };

        const { error: insertError } = await supabase.from('profiles').upsert({
          id: authUser.id,
          name: userName,
          avatar_color: '#4f46e5',
          categories: defaultCategories,
          updated_at: new Date().toISOString()
        });

        if (insertError) {
          setDbError("Atenção: Seu banco está bloqueando a gravação (Regra de INSERT faltando).");
        } else {
          setCurrentUser({ id: authUser.id, name: userName, avatarColor: '#4f46e5' });
          setDbError(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setCurrentUser(null); 
    setCurrentView('dashboard'); 
  };
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleTogglePaidRequest = (id: string, currentStatus: boolean) => {
    setPendingPaymentId(id);
    setPendingPaymentStatus(currentStatus);
    setSelectedPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  const confirmPaymentStatus = () => {
    if (pendingPaymentId) {
      const newStatus = !pendingPaymentStatus;
      togglePaid(pendingPaymentId, pendingPaymentStatus, newStatus ? selectedPaymentDate : null);
    }
    setIsPaymentModalOpen(false);
    setPendingPaymentId(null);
  };

  const handleDeleteRequest = (id: string) => {
    setTransactionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete);
    }
    setIsDeleteModalOpen(false);
    setTransactionToDelete(null);
  };

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

  const dashboardData = useMemo(() => {
    const filtered = transactions.filter(t => {
      const tDate = t.date.split('T')[0];
      const matchesDate = tDate >= startDate && tDate <= endDate;
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'paid' ? t.is_paid : !t.is_paid);
      
      let matchesPayer = selectedPayers.includes('all');
      if (!matchesPayer) {
        if (selectedPayers.includes('individual') && !t.is_split) matchesPayer = true;
        if (t.is_split && selectedPayers.includes(t.split_details?.partnerName || '')) matchesPayer = true;
      }
      
      return matchesDate && matchesCategory && matchesPayer && matchesStatus;
    });

    const summary: Summary = filtered.reduce((acc, t) => {
      let amt = Number(t.amount);
      if (selectedPayers.length === 1 && selectedPayers[0] === 'individual' && t.is_split && t.split_details) {
        amt = Number(t.split_details.userPart);
      } else if (selectedPayers.length === 1 && selectedPayers[0] !== 'all' && t.is_split && t.split_details) {
        amt = Number(t.split_details.partnerPart);
      }

      if (t.type === 'income') { acc.income += amt; acc.balance += amt; }
      else { acc.expenses += amt; acc.balance -= amt; }
      return acc;
    }, { balance: 0, income: 0, expenses: 0 });

    const groupedByCard = filtered.reduce((acc: any, t) => {
      if (t.type !== 'expense') return acc;
      const cardKey = t.card_id || 'no-card';
      if (!acc[cardKey]) {
        acc[cardKey] = {
          cardId: t.card_id,
          total: 0,
          userPart: 0,
          others: {},
          hasPending: false,
          description: t.card_id ? cards.find(c => c.id === t.card_id)?.name : 'Dinheiro/Pix'
        };
      }
      const amt = Number(t.amount);
      acc[cardKey].total += amt;
      if (!t.is_paid) acc[cardKey].hasPending = true;
      if (t.is_split && t.split_details) {
        acc[cardKey].userPart += Number(t.split_details.userPart);
        const pName = t.split_details.partnerName || 'Indefinido';
        acc[cardKey].others[pName] = (acc[cardKey].others[pName] || 0) + Number(t.split_details.partnerPart);
      } else {
        acc[cardKey].userPart += amt;
      }
      return acc;
    }, {});

    return { filteredTransactions: filtered, summary, cardSummaries: Object.values(groupedByCard) };
  }, [transactions, startDate, endDate, selectedCategory, selectedPayers, statusFilter, cards]);

  const renderFilterBar = () => {
    const allCategories = Array.from(new Set([...categories.expense, ...categories.income])).sort();
    
    const getPayerButtonLabel = () => {
      if (selectedPayers.includes('all')) return 'Todos';
      if (selectedPayers.length === 1) {
        return selectedPayers[0] === 'individual' ? 'Apenas Eu' : selectedPayers[0];
      }
      return `${selectedPayers.length} Selecionados`;
    };

    return (
      <div className="bg-white rounded-lg border border-slate-100 shadow-sm mb-6 relative z-30">
        <button 
          onClick={() => setIsFiltersVisible(!isFiltersVisible)}
          className="w-full px-4 py-3 flex items-center justify-between lg:hidden transition-colors hover:bg-slate-50 border-b border-transparent data-[open=true]:border-slate-100"
          data-open={isFiltersVisible}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-600">
              <path d="M21 4H3"/><path d="M20 8H4"/><path d="M18 12H6"/><path d="M15 16H9"/><path d="M12 20H12"/>
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Filtrar Lançamentos</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-slate-300 transition-transform duration-300 ${isFiltersVisible ? 'rotate-180' : ''}`}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <div className={`p-4 ${isFiltersVisible ? 'block' : 'hidden lg:block'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-3 py-2 text-xs font-bold text-indigo-600 outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-3 py-2 text-xs font-bold text-indigo-600 outline-none" />
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
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-200 min-w-[200px]">
                  <button 
                    onClick={() => togglePayerFilter('all')}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${selectedPayers.includes('all') ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                      {selectedPayers.includes('all') && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>}
                    </div>
                    <span className="flex-1">Todos</span>
                  </button>
                  <button 
                    onClick={() => togglePayerFilter('individual')}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${selectedPayers.includes('individual') ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                      {selectedPayers.includes('individual') && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>}
                    </div>
                    <span className="flex-1">Apenas Eu</span>
                  </button>
                  <div className="h-px bg-slate-50 my-1 mx-2"></div>
                  {categories.payers?.map(p => (
                    <button 
                      key={p}
                      onClick={() => togglePayerFilter(p)}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${selectedPayers.includes(p) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                        {selectedPayers.includes(p) && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>}
                      </div>
                      <span className="flex-1 truncate">{p}</span>
                    </button>
                  ))}
                </div>
              )}
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
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Categoria</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-4 py-2 text-xs font-bold text-slate-700 outline-none">
                <option value="all">Todas</option>
                {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <button 
              onClick={() => { 
                const { firstDay, lastDay } = getInitialDates();
                setStartDate(firstDay); 
                setEndDate(lastDay); 
                setSelectedCategory('all');
                setSelectedPayers(['all']);
                setStatusFilter('all');
                if (window.innerWidth < 1024) setIsFiltersVisible(false);
              }} 
              className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionManagement = (type: TransactionType) => {
    const filtered = transactions
      .filter(t => {
        if (t.type !== type) return false;
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

    return (
      <div className="space-y-4 max-w-full mx-auto pb-24 md:pb-0">
        {renderFilterBar()}

        <div className="hidden md:block bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                <th className="py-4 px-6 text-center w-16">Status</th>
                <th className="py-4 px-6">Vencimento</th>
                <th className="py-4 px-6">Descrição / Categoria</th>
                <th className="py-4 px-6">Conta / Origem</th>
                <th className="py-4 px-6">Método</th>
                <th className="py-4 px-6">Divisão</th>
                <th className="py-4 px-6 text-right">Valor</th>
                <th className="py-4 px-6 w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t) => {
                const card = t.card_id ? cards.find(c => c.id === t.card_id) : null;
                const account = t.account_id ? accounts.find(a => a.id === t.account_id) : null;
                const styles = getCategoryStyles(t.category, categories);
                const inlineStyles = styles.isCustom ? {
                  backgroundColor: `${styles.customColor}15`,
                  color: styles.customColor,
                  borderColor: `${styles.customColor}30`
                } : {};

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <button onClick={() => handleTogglePaidRequest(t.id, t.is_paid)} className={`w-6 h-6 rounded flex items-center justify-center border-2 mx-auto transition-all ${t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200 hover:border-teal-300'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-[11px] text-slate-900 font-black whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                      {t.is_paid && t.payment_date && (
                        <p className="text-[9px] text-teal-500 font-bold uppercase tracking-tighter whitespace-nowrap">Pago: {new Date(t.payment_date).toLocaleDateString('pt-BR')}</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-9 h-9 rounded-lg flex items-center justify-center border ${!styles.isCustom ? `${styles.bg} ${styles.text} ${styles.border}` : ''}`}
                          style={inlineStyles}
                        >
                          {getCategoryIcon(t.category, 18, categories)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 leading-tight truncate">{t.description}</p>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                       <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                         {card ? card.name : (account ? account.name : 'CARTEIRA')}
                       </span>
                    </td>
                    <td className="py-4 px-6">
                       <span className={`text-[9px] font-black uppercase tracking-tight ${card ? 'text-indigo-600' : 'text-slate-500'}`}>
                         {card ? 'CARTÃO CRÉDITO' : 'DINHEIRO / PIX'}
                       </span>
                    </td>
                    <td className="py-4 px-6">
                      {t.is_split && t.split_details ? (
                        <div className="space-y-0.5">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">VOCÊ: <span className="text-slate-900">{formatCurrency(t.split_details.userPart)}</span></p>
                           <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">{t.split_details.partnerName.toUpperCase()}: <span className="text-indigo-600">{formatCurrency(t.split_details.partnerPart)}</span></p>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase italic">SOLO</span>
                      )}
                    </td>
                    <td className={`py-4 px-6 text-right text-sm font-black ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingTransaction(t); setIsFormOpen(true); }} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                        <button onClick={() => handleDeleteRequest(t.id)} className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {filtered.map((t) => {
            const card = t.card_id ? cards.find(c => c.id === t.card_id) : null;
            const account = t.account_id ? accounts.find(a => a.id === t.account_id) : null;
            const styles = getCategoryStyles(t.category, categories);
            const inlineStyles = styles.isCustom ? {
              backgroundColor: `${styles.customColor}15`,
              color: styles.customColor,
              borderColor: `${styles.customColor}30`
            } : {};

            return (
              <div key={t.id} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm relative overflow-hidden active:scale-[0.99] transition-transform">
                <div className="flex justify-between items-start mb-3">
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                           Venc: {new Date(t.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {t.is_paid && t.payment_date && (
                        <div className="flex items-center gap-1.5 text-teal-600 animate-in fade-in slide-in-from-left-2">
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                           <span className="text-[10px] font-bold uppercase tracking-wide">
                             Pago: {new Date(t.payment_date).toLocaleDateString('pt-BR')}
                           </span>
                        </div>
                      )}
                   </div>
                   <div className="text-right">
                      <p className={`text-base font-black ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</p>
                   </div>
                </div>

                <div className="flex items-center gap-3.5 mb-4">
                  <div 
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${!styles.isCustom ? `${styles.bg} ${styles.text} ${styles.border}` : ''}`}
                    style={inlineStyles}
                  >
                    {getCategoryIcon(t.category, 18, categories)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 leading-tight truncate mb-0.5">{t.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">{t.category}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="px-2.5 py-1 bg-slate-50 rounded border border-slate-100">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider truncate max-w-[100px] block">
                          {card ? card.name : (account ? account.name : 'Carteira')}
                        </span>
                     </div>
                     <button onClick={() => handleTogglePaidRequest(t.id, t.is_paid)} className={`p-1 transition-colors ${t.is_paid ? 'text-teal-500' : 'text-slate-300 hover:text-slate-400'}`}>
                        {t.is_paid ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                        )}
                     </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingTransaction(t); setIsFormOpen(true); }} className="w-8 h-8 flex items-center justify-center text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button onClick={() => handleDeleteRequest(t.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-widest">Nenhum lançamento encontrado</div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
            {dbError && (
              <div className="p-5 bg-rose-600 rounded-xl shadow-2xl shadow-rose-100 flex flex-col md:flex-row items-center gap-6 border border-rose-500 animate-in zoom-in-95">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-xs font-black text-white uppercase tracking-widest leading-relaxed">{dbError}</p>
                </div>
              </div>
            )}

            <div className="mb-6 text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Olá, <span className="text-indigo-600">{currentUser?.name.split(' ')[0]}!</span> 👋
              </h1>
              <p className="text-xs font-medium text-slate-400 mt-1">Sua situação financeira hoje</p>
            </div>

            {renderFilterBar()}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <SummaryCards summary={dashboardData.summary} />
                <AIInsights transactions={dashboardData.filteredTransactions} />
                <Charts transactions={dashboardData.filteredTransactions} categories={categories} />
              </div>
              <div className="lg:col-span-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 h-full">
                  <h2 className="text-[10px] font-black text-slate-900 tracking-tight uppercase mb-6 border-b border-slate-50 pb-3">Extrato por Pagante</h2>
                  <div className="space-y-3">
                    {dashboardData.cardSummaries.map((card: any) => (
                      <div key={card.cardId || 'cash'} className="p-4 bg-slate-50/40 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-black text-[10px] text-slate-900 uppercase tracking-widest">{card.description}</h4>
                        </div>
                        <div className="pt-3 border-t border-slate-100/60 space-y-2">
                          <div className="flex justify-between items-baseline"><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">VOCÊ</span><span className="text-xs font-black text-slate-900">{formatCurrency(card.userPart)}</span></div>
                          {Object.entries(card.others).map(([name, val]: [any, any]) => (
                            <div key={name} className="flex justify-between items-baseline"><span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">{name}</span><span className="text-xs font-black text-indigo-600">{formatCurrency(val as number)}</span></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'add-expense': return renderTransactionManagement('expense');
      case 'add-income': return renderTransactionManagement('income');
      case 'payers': return <PayerManager categories={categories} onAdd={addCategory} onDelete={deleteCategory} />;
      case 'cards': return <CardManager cards={cards} accounts={accounts} transactions={transactions} onAdd={addCard} onUpdate={updateCard} onDelete={deleteCard} />;
      case 'accounts': return <AccountManager accounts={accounts} transactions={transactions} categories={categories} cards={cards} onAdd={addAccount} onDelete={deleteAccount} onTogglePaid={togglePaid} onDeleteTransaction={deleteTransaction} />;
      case 'reports': return <Reports transactions={transactions} categories={categories} />;
      case 'payer-reports': return <PayerReports transactions={transactions} categories={categories} />;
      case 'categories': return <CategoryManager categories={categories} onAdd={addCategory} onUpdate={updateCategory} onDelete={deleteCategory} />;
    }
  };

  if (sessionLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!currentUser) return <AuthScreen onSelectUser={setCurrentUser} />;

  const viewTitles: Record<string, string> = {
    'dashboard': 'Visão Geral', 'cards': 'Meus Cartões', 'accounts': 'Minhas Contas', 'add-expense': 'Despesas', 'add-income': 'Receitas', 'categories': 'Categorias', 'reports': 'Extrato', 'payers': 'Pagantes', 'payer-reports': 'Acerto de Contas'
  };

  const showNewTransactionButton = !['dashboard', 'reports', 'payer-reports', 'cards', 'accounts'].includes(currentView);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onAddClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
        currentUser={currentUser} 
        onLogout={handleLogout} 
      />
      <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
        <header className="mb-6 md:mb-10 flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">{viewTitles[currentView]}</h2>
          {showNewTransactionButton && (
            <button 
              onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} 
              className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-lg shadow-xl hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest hidden md:flex items-center gap-2 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
              Novo Lançamento
            </button>
          )}
        </header>

        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] overflow-y-auto p-4 md:flex md:justify-center md:items-start py-8 md:py-16">
            <div className="w-full max-w-2xl mx-auto">
              <TransactionForm onAdd={addTransaction} onUpdate={updateTransaction} editingTransaction={editingTransaction} categories={categories} cards={cards} onCancel={() => setIsFormOpen(false)} initialType={currentView === 'add-income' ? 'income' : 'expense'} />
            </div>
          </div>
        )}

        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[130] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {pendingPaymentStatus ? 'Reabrir Lançamento?' : 'Confirmar Pagamento?'}
              </h3>
              <p className="text-xs text-slate-500 mb-6 font-medium">
                {pendingPaymentStatus 
                  ? 'Isso marcará a transação como PENDENTE novamente.' 
                  : 'Informe a data que o pagamento foi realizado.'}
              </p>
              {!pendingPaymentStatus && (
                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Data do Pagamento</label>
                  <input 
                    type="date" 
                    value={selectedPaymentDate} 
                    onChange={e => setSelectedPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 rounded-lg text-sm font-bold text-slate-900 outline-none border border-transparent focus:border-indigo-100"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                <button onClick={confirmPaymentStatus} className={`flex-1 ${pendingPaymentStatus ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95`}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[130] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
             <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 border border-rose-100">
                <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-4 mx-auto">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">Excluir Lançamento?</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium text-center">Tem certeza que deseja remover este item? Esta ação não pode ser desfeita.</p>
                <div className="flex gap-3">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                  <button onClick={confirmDelete} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 transition-all active:scale-95">Sim, Excluir</button>
                </div>
             </div>
          </div>
        )}

        <div className="w-full max-w-full mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
