
import React, { useState, useEffect } from 'react';
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
import { TransactionType, User } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  const { 
    transactions, 
    cards,
    categories, 
    addTransaction, 
    deleteTransaction, 
    addCard,
    deleteCard,
    addCategory, 
    deleteCategory, 
    summary,
    loading: dataLoading
  } = useFinanceData(currentUser?.id || null);
  
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);

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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{type === 'expense' ? 'Despesas' : 'Receitas'}</h2>
          <button onClick={() => setIsFormOpen(true)} className={`flex items-center gap-2 ${accentColor} text-white px-5 py-2.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-lg transform active:scale-95 transition-all`}>
            Novo Lançamento
          </button>
        </div>

        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <TransactionForm onAdd={addTransaction} categories={categories} cards={cards} initialType={type} onCancel={() => setIsFormOpen(false)} />
          </div>
        )}

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                <th className="py-4 px-6">Data</th>
                <th className="py-4 px-6">Descrição</th>
                <th className="py-4 px-6">Divisão</th>
                <th className="py-4 px-6 text-right">Valor</th>
                <th className="py-4 px-6 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t) => (
                <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-xs text-slate-400 font-medium">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-semibold text-slate-900">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-tight">{t.category}</span>
                      {t.card_id && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-bold uppercase">
                          {cards.find(c => c.id === t.card_id)?.name || 'Cartão'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {t.is_split && t.split_details ? (
                      <div className="space-y-0.5">
                        <div className="flex justify-between w-24 text-[9px] font-bold">
                          <span className="text-slate-400 uppercase">Você:</span>
                          <span className="text-slate-700">{formatCurrency(t.split_details.userPart)}</span>
                        </div>
                        <div className="flex justify-between w-24 text-[9px] font-bold">
                          <span className="text-slate-400 uppercase">{t.split_details.partnerName}:</span>
                          <span className="text-indigo-600">{formatCurrency(t.split_details.partnerPart)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-300 font-bold uppercase">Particular</span>
                    )}
                  </td>
                  <td className={`py-4 px-6 text-right text-sm font-bold ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'}`}>
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
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-8 space-y-8">
              <SummaryCards summary={summary} />
              <div className="grid grid-cols-1 gap-8">
                 <AIInsights transactions={transactions} />
                 <Charts transactions={transactions} />
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 mb-6">Transações Recentes</h2>
                <div className="space-y-4">
                  {transactions.slice(0, 8).map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="overflow-hidden">
                        <h4 className="font-semibold text-xs text-slate-900 truncate">{t.description}</h4>
                        <div className="flex gap-1.5 items-center mt-0.5">
                          <span className="text-[8px] text-slate-400 font-bold uppercase">{t.category}</span>
                          {t.is_split && <div className="w-1 h-1 rounded-full bg-indigo-400"></div>}
                          {t.is_split && <span className="text-[8px] text-indigo-400 font-bold uppercase">Split</span>}
                        </div>
                      </div>
                      <span className={`text-xs font-bold ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'cards': return <CardManager cards={cards} transactions={transactions} onAdd={addCard} onDelete={deleteCard} />;
      case 'add-expense': return renderTransactionManagement('expense');
      case 'add-income': return renderTransactionManagement('income');
      case 'categories': return <CategoryManager categories={categories} onAdd={addCategory} onDelete={deleteCategory} />;
      case 'reports': return <Reports transactions={transactions} onDelete={deleteTransaction} />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 md:p-12 w-full max-w-7xl">
          <header className="mb-10 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight capitalize">{currentView === 'cards' ? 'Cartões de Crédito' : currentView}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sincronizado na Nuvem</p>
            </div>
            {currentView === 'dashboard' && (
              <button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            )}
          </header>
          {isFormOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
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
