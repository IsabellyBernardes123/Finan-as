
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
import PayerManager from './components/PayerManager';
import PayerReports from './components/PayerReports';
import DataManagement from './components/DataManagement';
import AuthScreen from './components/AuthScreen';
import Logo from './components/Logo';
import { TransactionType, User, Summary, Transaction } from './types';
import { getCategoryIcon } from './utils/icons';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const { 
    transactions, cards, categories, 
    addTransaction, updateTransaction, deleteTransaction, togglePaid,
    addCard, deleteCard, addCategory, deleteCategory, loading: dataLoading
  } = useFinanceData(currentUser?.id || null);
  
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [transactionToPay, setTransactionToPay] = useState<{id: string, status: boolean} | null>(null);
  const [paymentDateInput, setPaymentDateInput] = useState(new Date().toISOString().split('T')[0]);

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
  const [selectedPayer, setSelectedPayer] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

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
          payers: [userName.split(' ')[0] || 'Eu']
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

  const dashboardData = useMemo(() => {
    const filtered = transactions.filter(t => {
      const tDate = t.date.split('T')[0];
      const matchesDate = tDate >= startDate && tDate <= endDate;
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      let matchesPayer = true;
      if (selectedPayer === 'individual') matchesPayer = true;
      else if (selectedPayer !== 'all') matchesPayer = t.is_split && t.split_details?.partnerName === selectedPayer;
      return matchesDate && matchesCategory && matchesPayer;
    });

    const summary: Summary = filtered.reduce((acc, t) => {
      let amt = Number(t.amount);
      if (selectedPayer === 'individual' && t.is_split && t.split_details) {
        amt = Number(t.split_details.userPart);
      } else if (selectedPayer !== 'all' && t.is_split && t.split_details) {
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
  }, [transactions, startDate, endDate, selectedCategory, selectedPayer, cards]);

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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="space-y-4 max-w-7xl mx-auto pb-24 md:pb-0">
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
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
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <button onClick={() => { setStartDate(initStart); setEndDate(initEnd); setSelectedCategory('all'); }} className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors">Limpar Filtros</button>
          </div>
        </div>

        <div className="hidden md:block bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Vencimento</th>
                <th className="py-4 px-6">Descrição / Categoria</th>
                <th className="py-4 px-6 text-right">Valor</th>
                <th className="py-4 px-6 w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <button onClick={() => togglePaid(t.id, t.is_paid, null)} className={`w-5 h-5 rounded-md flex items-center justify-center border-2 mx-auto transition-all ${t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                  </td>
                  <td className="py-4 px-6 text-[11px] text-slate-400 font-bold">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center">{getCategoryIcon(t.category)}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{t.description}</p>
                        <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter">{t.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className={`py-4 px-6 text-right text-xs font-black ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</td>
                  <td className="py-4 px-6">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditingTransaction(t); setIsFormOpen(true); }} className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                      <button onClick={() => deleteTransaction(t.id)} className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
                    </div>
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
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
            {dbError && (
              <div className="p-5 bg-rose-600 rounded-[32px] shadow-2xl shadow-rose-100 flex flex-col md:flex-row items-center gap-6 border border-rose-500 animate-in zoom-in-95">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-xs font-black text-white uppercase tracking-widest leading-relaxed">{dbError}</p>
                </div>
                <button 
                  onClick={() => setCurrentView('data-management')}
                  className="px-6 py-3 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-lg active:scale-95"
                >
                  Como Corrigir?
                </button>
              </div>
            )}

            <div className="mb-6 text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Olá, <span className="text-indigo-600">{currentUser?.name.split(' ')[0]}!</span> 👋
              </h1>
              <p className="text-xs font-medium text-slate-400 mt-1">Sua situação financeira hoje</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <SummaryCards summary={dashboardData.summary} />
                <AIInsights transactions={dashboardData.filteredTransactions} />
                <Charts transactions={dashboardData.filteredTransactions} />
              </div>
              <div className="lg:col-span-4">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100 h-full">
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
      case 'cards': return <CardManager cards={cards} transactions={transactions} onAdd={addCard} onDelete={deleteCard} />;
      case 'reports': return <Reports transactions={transactions} categories={categories} />;
      case 'payer-reports': return <PayerReports transactions={transactions} categories={categories} />;
      case 'categories': return <CategoryManager categories={categories} onAdd={addCategory} onDelete={deleteCategory} />;
      case 'data-management': return <DataManagement userId={currentUser!.id} transactions={transactions} cards={cards} categories={categories} onRefresh={() => window.location.reload()} />;
    }
  };

  if (sessionLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!currentUser) return <AuthScreen onSelectUser={setCurrentUser} />;

  const viewTitles: Record<string, string> = {
    'dashboard': 'Visão Geral', 'cards': 'Meus Cartões', 'add-expense': 'Despesas', 'add-income': 'Receitas', 'categories': 'Categorias', 'reports': 'Extrato', 'payers': 'Pagantes', 'payer-reports': 'Acerto de Contas', 'data-management': 'Configurações Avançadas'
  };

  const showNewTransactionButton = !['dashboard', 'reports', 'payer-reports', 'data-management'].includes(currentView);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
        <header className="mb-6 md:mb-10 flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">{viewTitles[currentView]}</h2>
          {showNewTransactionButton && (
            <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
              Novo Lançamento
            </button>
          )}
        </header>

        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] p-4 flex justify-center items-center">
            <div className="w-full max-w-4xl">
              <TransactionForm onAdd={addTransaction} onUpdate={updateTransaction} editingTransaction={editingTransaction} categories={categories} cards={cards} onCancel={() => setIsFormOpen(false)} initialType={currentView === 'add-income' ? 'income' : 'expense'} />
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
