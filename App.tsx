
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

  // Estados de Filtro
  const currentYYYYMM = new Date().toISOString().slice(0, 7); 
  const [selectedMonth, setSelectedMonth] = useState(currentYYYYMM);
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
    const { data: profile } = await supabase.from('profiles').select('name, avatar_color').eq('id', uid).single();
    if (profile) setCurrentUser({ id: uid, name: profile.name, avatarColor: profile.avatar_color });
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
    setSelectedMonth(currentYYYYMM);
    setSelectedCategory('all');
    setStatusFilter('all');
  };

  // Lógica de Filtragem para a Dashboard
  const dashboardData = useMemo(() => {
    const filtered = transactions
      .filter(t => {
        const tMonth = t.date.slice(0, 7);
        const matchesMonth = tMonth === selectedMonth;
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesMonth && matchesCategory;
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

    return { filteredTransactions: filtered, summary };
  }, [transactions, selectedMonth, selectedCategory]);

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
        const tMonth = t.date.slice(0, 7);
        if (selectedMonth && tMonth !== selectedMonth) return false;
        if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
        if (statusFilter === 'paid' && !t.is_paid) return false;
        if (statusFilter === 'pending' && t.is_paid) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const accentColor = type === 'expense' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-teal-600 hover:bg-teal-700';

    return (
      <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto pb-24 md:pb-0">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-end">
            <div>
              <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Mês de Referência</label>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-lg px-4 py-3 text-xs font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-lg px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">Todas as Categorias</option>
                {categories[type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Status Pago</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-slate-50 border-none rounded-lg px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">Todos</option>
                <option value="paid">Já Pagos</option>
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
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="flex flex-col w-full sm:w-auto">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1">Período</label>
                  <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100 w-full"
                  />
                </div>
                <div className="flex flex-col flex-1 w-full sm:w-48">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1">Categoria</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 w-full"
                  >
                    <option value="all">Todas as Categorias</option>
                    {[...categories.expense, ...categories.income].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-2">
                <button 
                  onClick={() => { setSelectedMonth(currentYYYYMM); setSelectedCategory('all'); }}
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
                <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                       Recentes do Mês
                     </h2>
                     <button onClick={() => setCurrentView('reports')} className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest hover:text-indigo-700 transition-colors">Ver tudo</button>
                  </div>
                  <div className="space-y-4">
                    {[...dashboardData.filteredTransactions].reverse().slice(0, 10).map((t) => (
                      <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0 group">
                        <button 
                          onClick={() => togglePaid(t.id, t.is_paid)}
                          className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
                            t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200 hover:border-teal-400'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </button>
                        <div className="overflow-hidden flex-1">
                          <h4 className={`font-semibold text-xs text-slate-900 truncate ${!t.is_paid ? 'text-slate-400 line-through' : ''}`}>{t.description}</h4>
                          <div className="flex gap-1.5 items-center mt-0.5">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">{t.category}</span>
                            {!t.is_paid && <span className="text-[7px] text-amber-600 font-black uppercase">Pendente</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                           <span className={`text-xs font-bold ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''}`}>{formatCurrency(t.amount)}</span>
                           <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                           </button>
                        </div>
                      </div>
                    ))}
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
                 {currentUser?.name.charAt(0).toUpperCase()}
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
