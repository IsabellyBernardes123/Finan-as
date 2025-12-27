
import React, { useState, useEffect, useMemo } from 'react';
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
import AuthScreen from './components/AuthScreen';
import { TransactionType, User, Summary, Transaction } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  const { 
    transactions, 
    cards,
    categories, 
    addTransaction,
    updateTransaction,
    deleteTransaction, 
    togglePaid,
    addCard,
    deleteCard,
    addCategory, 
    deleteCategory, 
    loading: dataLoading
  } = useFinanceData(currentUser?.id || null);
  
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id);
      else { setCurrentUser(null); setSessionLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, avatar_color')
      .eq('id', uid)
      .maybeSingle();

    if (profile) {
      setCurrentUser({ id: uid, name: profile.name, avatarColor: profile.avatar_color });
    } else {
      setCurrentUser({ id: uid, name: 'Usuário', avatarColor: '#4f46e5' });
    }
    setSessionLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setCurrentView('dashboard'); };
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const resetFilters = () => {
    const { firstDay, lastDay } = getInitialDates();
    setStartDate(firstDay);
    setEndDate(lastDay);
    setSelectedCategory('all');
    setStatusFilter('all');
  };

  const dashboardData = useMemo(() => {
    const filtered = transactions
      .filter(t => {
        const tDate = t.date.split('T')[0];
        const matchesRange = tDate >= startDate && tDate <= endDate;
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesRange && matchesCategory;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const summary: Summary = filtered.reduce((acc, t) => {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        acc.income += amt;
        acc.balance += amt;
      } else {
        acc.expenses += amt;
        acc.balance -= amt;
      }
      return acc;
    }, { balance: 0, income: 0, expenses: 0 });

    // Agrupamento por Cartão para o Dashboard
    const groupedByCard = filtered.reduce((acc: any, t) => {
      if (t.type !== 'expense') return acc;
      const cardKey = t.card_id || 'no-card';
      if (!acc[cardKey]) {
        acc[cardKey] = {
          cardId: t.card_id,
          total: 0,
          userPart: 0,
          partnerPart: 0,
          partnerName: t.split_details?.partnerName || 'Isa',
          hasPending: false,
          description: t.card_id ? cards.find(c => c.id === t.card_id)?.name : 'Dinheiro/Pix'
        };
      }
      
      const amt = Number(t.amount);
      acc[cardKey].total += amt;
      if (!t.is_paid) acc[cardKey].hasPending = true;
      
      if (t.is_split && t.split_details) {
        acc[cardKey].userPart += Number(t.split_details.userPart);
        acc[cardKey].partnerPart += Number(t.split_details.partnerPart);
        acc[cardKey].partnerName = t.split_details.partnerName;
      } else {
        acc[cardKey].userPart += amt;
      }
      
      return acc;
    }, {});

    return { filteredTransactions: filtered, summary, cardSummaries: Object.values(groupedByCard) };
  }, [transactions, startDate, endDate, selectedCategory, cards]);

  if (sessionLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!currentUser) return <AuthScreen onSelectUser={setCurrentUser} />;

  const renderTransactionManagement = (type: TransactionType) => {
    const filtered = transactions
      .filter(t => {
        if (t.type !== type) return false;
        const tDate = t.date.split('T')[0];
        if (tDate < startDate || tDate > endDate) return false;
        if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
        if (statusFilter === 'paid' && !t.is_paid) return false;
        if (statusFilter === 'pending' && t.is_paid) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto pb-24 md:pb-0">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-100 shadow-sm">
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
                {categories[type].map(cat => (
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
            <div className="flex items-center">
               <button 
                onClick={resetFilters}
                className="w-full py-3 text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors text-center"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left min-w-[750px] md:min-w-full">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                  <th className="py-5 px-6 w-12 text-center">Pago</th>
                  <th className="py-5 px-6">Data</th>
                  <th className="py-5 px-6">Descrição</th>
                  <th className="py-5 px-6 text-center">Divisão</th>
                  <th className="py-5 px-6 text-right">Valor</th>
                  <th className="py-5 px-6 w-28 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((t) => (
                  <tr key={t.id} className={`transition-colors ${!t.is_paid ? 'bg-amber-50/10' : ''}`}>
                    <td className="py-5 px-6 text-center">
                      <button 
                        onClick={() => togglePaid(t.id, t.is_paid)}
                        className={`w-6 h-6 rounded flex items-center justify-center border-2 mx-auto transition-all ${
                          t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200 hover:border-teal-400'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                    </td>
                    <td className="py-5 px-6 text-[11px] text-slate-400 font-bold whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-5 px-6">
                      <p className={`text-sm font-semibold truncate max-w-[150px] md:max-w-none ${t.is_paid ? 'text-slate-900' : 'text-slate-400 line-through decoration-slate-300'}`}>{t.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-tight">{t.category}</span>
                        {t.card_id && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">
                            {cards.find(c => c.id === t.card_id)?.name || 'Cartão'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      {t.is_split && t.split_details ? (
                        <div className="inline-block space-y-0.5 text-left whitespace-nowrap">
                          <div className="flex justify-between gap-4 text-[9px] font-bold">
                            <span className="text-slate-400 uppercase tracking-tighter">Você:</span>
                            <span className="text-slate-700">{formatCurrency(t.split_details.userPart)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-[9px] font-bold">
                            <span className="text-slate-400 uppercase tracking-tighter">{t.split_details.partnerName}:</span>
                            <span className="text-indigo-600">{formatCurrency(t.split_details.partnerPart)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-300 font-bold uppercase">Individual</span>
                      )}
                    </td>
                    <td className={`py-5 px-6 text-right text-sm font-bold whitespace-nowrap ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''}`}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center justify-center gap-1 md:gap-2">
                        <button onClick={() => handleEdit(t)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button onClick={() => deleteTransaction(t.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-300 text-[10px] font-bold uppercase italic">Nenhum registro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1">Início</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ colorScheme: 'light' }}
                      className="bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1">Fim</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ colorScheme: 'light' }}
                      className="bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
                <div className="flex flex-col flex-1 sm:w-48">
                  <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1">Categoria</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 w-full"
                  >
                    <option value="all">Todas</option>
                    {[...categories.expense, ...categories.income].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-2">
                <button 
                  onClick={resetFilters}
                  className="text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors px-3 py-2"
                >
                  Mês Atual
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              <div className="lg:col-span-8 space-y-6 md:space-y-8">
                <SummaryCards summary={dashboardData.summary} />
                <div className="grid grid-cols-1 gap-6 md:gap-8">
                   <AIInsights transactions={dashboardData.filteredTransactions} />
                   <Charts transactions={dashboardData.filteredTransactions} />
                </div>
              </div>
              <div className="lg:col-span-4">
                <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 h-full">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
                       Faturas do Período
                     </h2>
                     <button onClick={() => setCurrentView('reports')} className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest hover:text-indigo-700 transition-colors">Ver tudo</button>
                  </div>
                  
                  <div className="space-y-6">
                    {dashboardData.cardSummaries.map((card: any) => (
                      <div key={card.cardId || 'cash'} className="p-5 bg-slate-50/40 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:border-indigo-100 hover:shadow-xl">
                        <div className="flex justify-between items-start mb-5">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-black text-xs text-slate-900 uppercase tracking-widest">{card.description}</h4>
                              {card.hasPending && (
                                <span className="text-[7px] text-amber-600 font-black uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Pendente</span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Resumo da fatura no período</p>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400 group-hover:text-indigo-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                          </div>
                        </div>

                        <div className="flex justify-between items-end pt-4 border-t border-slate-100/60">
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase w-6">EU:</span>
                              <span className="text-[13px] font-black text-slate-900">{formatCurrency(card.userPart)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black text-indigo-400 uppercase w-6">{card.partnerName.toUpperCase()}:</span>
                              <span className="text-[13px] font-black text-indigo-600">{formatCurrency(card.partnerPart)}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Total Fatura</p>
                            <span className="text-lg font-black text-slate-900 tracking-tight">
                              {formatCurrency(card.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {dashboardData.cardSummaries.length === 0 && (
                      <div className="py-20 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300"><path d="M12 2v20M2 12h20"/></svg>
                        </div>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">Nenhum gasto registrado</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'cards': return <div className="pb-24 md:pb-0"><CardManager cards={cards} transactions={transactions} onAdd={addCard} onDelete={deleteCard} /></div>;
      case 'add-expense': return renderTransactionManagement('expense');
      case 'add-income': return renderTransactionManagement('income');
      case 'categories': return <div className="pb-24 md:pb-0"><CategoryManager categories={categories} onAdd={addCategory} onDelete={deleteCategory} /></div>;
      case 'reports': return <div className="pb-24 md:pb-0"><Reports transactions={transactions} onDelete={deleteTransaction} onTogglePaid={togglePaid} onEdit={handleEdit} categories={categories} /></div>;
      default: return null;
    }
  };

  const viewTitles: Record<string, string> = {
    'dashboard': 'Visão Geral',
    'cards': 'Meus Cartões',
    'add-expense': 'Gerenciar Despesas',
    'add-income': 'Gerenciar Receitas',
    'categories': 'Minhas Categorias',
    'reports': 'Extrato Detalhado'
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 lg:p-12 w-full max-w-7xl mx-auto">
          <header className="mb-6 md:mb-14 flex flex-col items-center text-center relative pt-4 md:pt-0">
            <div className="space-y-1">
              <h2 className="text-xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{viewTitles[currentView]}</h2>
              <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">FinancePro Cloud</p>
            </div>
            {(currentView === 'dashboard' || currentView === 'add-expense' || currentView === 'add-income') && (
              <button onClick={() => setIsFormOpen(true)} className="mt-6 md:mt-8 bg-indigo-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center transform active:scale-95 font-bold text-[10px] md:text-xs uppercase tracking-widest gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Novo Lançamento
              </button>
            )}
            <div className="md:hidden absolute right-0 top-4">
               <div className={`w-9 h-9 ${currentUser?.avatarColor || 'bg-slate-300'} rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-sm`} onClick={handleLogout}>
                 {currentUser?.name.charAt(0).toUpperCase() || 'U'}
               </div>
            </div>
          </header>

          {isFormOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-2 md:p-4">
              <TransactionForm 
                onAdd={addTransaction} 
                onUpdate={updateTransaction}
                editingTransaction={editingTransaction}
                categories={categories} 
                cards={cards} 
                onCancel={closeForm} 
                initialType={currentView === 'add-income' ? 'income' : 'expense'}
              />
            </div>
          )}

          <div className="min-h-[60vh]">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
