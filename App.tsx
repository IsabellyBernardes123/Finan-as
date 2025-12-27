
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

  // Estados de Filtro
  const currentYYYYMM = new Date().toISOString().slice(0, 7); // Ex: "2023-10"
  const [selectedMonth, setSelectedMonth] = useState(currentYYYYMM);
  const [selectedCategory, setSelectedCategory] = useState('all');

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

  // Lógica de Filtragem para a Dashboard
  const dashboardData = useMemo(() => {
    const filtered = transactions.filter(t => {
      const tMonth = t.date.slice(0, 7);
      const matchesMonth = tMonth === selectedMonth;
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      return matchesMonth && matchesCategory;
    });

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
    const filtered = transactions.filter(t => t.type === type);
    const accentColor = type === 'expense' ? 'bg-rose-500' : 'bg-teal-600';

    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{type === 'expense' ? 'Despesas' : 'Receitas'}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Histórico completo</p>
          </div>
          <button onClick={() => setIsFormOpen(true)} className={`flex items-center gap-2 ${accentColor} text-white px-4 py-2 md:px-5 md:py-2.5 rounded-2xl text-[10px] md:text-[11px] font-bold uppercase tracking-widest shadow-lg transform active:scale-95 transition-all`}>
            Novo
          </button>
        </div>

        <div className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                  <th className="py-4 px-6 w-12 text-center">Pago</th>
                  <th className="py-4 px-6">Data</th>
                  <th className="py-4 px-6">Descrição</th>
                  <th className="py-4 px-6">Divisão</th>
                  <th className="py-4 px-6 text-right">Valor</th>
                  <th className="py-4 px-6 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((t) => (
                  <tr key={t.id} className={`group hover:bg-slate-50/50 transition-colors ${!t.is_paid ? 'bg-amber-50/20' : ''}`}>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => togglePaid(t.id, t.is_paid)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                          t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200 hover:border-teal-400'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                    </td>
                    <td className="py-4 px-6 text-[11px] text-slate-400 font-bold">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-4 px-6">
                      <p className={`text-sm font-semibold ${t.is_paid ? 'text-slate-900' : 'text-slate-400 line-through decoration-slate-300'}`}>{t.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-tight">{t.category}</span>
                        {t.card_id && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-bold uppercase">
                            {cards.find(c => c.id === t.card_id)?.name || 'Cartão'}
                          </span>
                        )}
                        {!t.is_paid && <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-black uppercase">Pendente</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {t.is_split && t.split_details ? (
                        <div className="space-y-0.5">
                          <div className="flex justify-between w-24 text-[9px] font-bold">
                            <span className="text-slate-400 uppercase tracking-tighter">Você:</span>
                            <span className="text-slate-700">{formatCurrency(t.split_details.userPart)}</span>
                          </div>
                          <div className="flex justify-between w-24 text-[9px] font-bold">
                            <span className="text-slate-400 uppercase tracking-tighter">{t.split_details.partnerName}:</span>
                            <span className="text-indigo-600">{formatCurrency(t.split_details.partnerPart)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-300 font-bold uppercase">Individual</span>
                      )}
                    </td>
                    <td className={`py-4 px-6 text-right text-sm font-bold ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''}`}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                      </button>
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

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
            {/* Barra de Filtros da Dashboard */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1">Período</label>
                  <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="flex flex-col flex-1 md:w-48">
                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1">Categoria</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
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
                  Limpar Filtros
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
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                       {selectedCategory === 'all' ? 'Lançamentos do Mês' : `Em ${selectedCategory}`}
                     </h2>
                     <button onClick={() => setCurrentView('reports')} className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest hover:text-indigo-700 transition-colors">Ver tudo</button>
                  </div>
                  <div className="space-y-4">
                    {dashboardData.filteredTransactions.slice(0, 10).map((t) => (
                      <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0 group">
                        <button 
                          onClick={() => togglePaid(t.id, t.is_paid)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 transition-all ${
                            t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200'
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
                        <span className={`text-xs font-bold shrink-0 ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-50' : ''}`}>{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                    {dashboardData.filteredTransactions.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                        </div>
                        <p className="text-[10px] text-slate-300 font-bold uppercase italic">Sem registros neste período</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'cards': return <div className="pb-20 md:pb-0"><CardManager cards={cards} transactions={transactions} onAdd={addCard} onDelete={deleteCard} /></div>;
      case 'add-expense': return <div className="pb-20 md:pb-0">{renderTransactionManagement('expense')}</div>;
      case 'add-income': return <div className="pb-20 md:pb-0">{renderTransactionManagement('income')}</div>;
      case 'categories': return <div className="pb-20 md:pb-0"><CategoryManager categories={categories} onAdd={addCategory} onDelete={deleteCategory} /></div>;
      case 'reports': return <div className="pb-20 md:pb-0"><Reports transactions={transactions} onDelete={deleteTransaction} onTogglePaid={togglePaid} /></div>;
      default: return null;
    }
  };

  const viewTitles: Record<string, string> = {
    'dashboard': 'Visão Geral',
    'cards': 'Cartões',
    'add-expense': 'Despesas',
    'add-income': 'Receitas',
    'categories': 'Categorias',
    'reports': 'Extrato'
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 lg:p-12 w-full max-w-7xl mx-auto">
          <header className="mb-6 md:mb-10 flex justify-between items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{viewTitles[currentView]}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sincronizado na Nuvem</p>
            </div>
            {currentView === 'dashboard' && (
              <button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 text-white p-3 md:p-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            )}
            <div className="md:hidden">
               <div className={`w-10 h-10 ${currentUser?.avatarColor || 'bg-slate-300'} rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm`} onClick={handleLogout}>
                 {currentUser?.name.charAt(0).toUpperCase()}
               </div>
            </div>
          </header>

          {isFormOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <TransactionForm onAdd={addTransaction} categories={categories} cards={cards} onCancel={() => setIsFormOpen(false)} />
            </div>
          )}

          <div className="min-h-[60vh]">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
