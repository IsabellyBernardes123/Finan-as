
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
  const [selectedPayer, setSelectedPayer] = useState('all');
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
    const { data: profile } = await supabase.from('profiles').select('name, avatar_color').eq('id', uid).maybeSingle();
    setCurrentUser(profile ? { id: uid, name: profile.name, avatarColor: profile.avatar_color } : { id: uid, name: 'Usuário', avatarColor: '#4f46e5' });
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
    setSelectedPayer('all');
    setStatusFilter('all');
  };

  const dashboardData = useMemo(() => {
    const filtered = transactions.filter(t => {
      const tDate = t.date.split('T')[0];
      const matchesDate = tDate >= startDate && tDate <= endDate;
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      let matchesPayer = true;
      if (selectedPayer === 'individual') matchesPayer = !t.is_split;
      else if (selectedPayer !== 'all') matchesPayer = t.is_split && t.split_details?.partnerName === selectedPayer;
      
      return matchesDate && matchesCategory && matchesPayer;
    });

    const summary: Summary = filtered.reduce((acc, t) => {
      const amt = Number(t.amount);
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
        
        if (selectedPayer === 'individual') return !t.is_split;
        if (selectedPayer !== 'all') return t.is_split && t.split_details?.partnerName === selectedPayer;
        
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-24 md:pb-0 animate-in fade-in duration-500">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Início</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-lg px-3 py-3 text-xs font-bold text-indigo-600 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Fim</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-lg px-3 py-3 text-xs font-bold text-indigo-600 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Categoria</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border-none rounded-lg px-4 py-3 text-xs font-bold text-slate-700 outline-none">
                <option value="all">Todas</option>
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Pagante</label>
              <select value={selectedPayer} onChange={(e) => setSelectedPayer(e.target.value)} className="w-full bg-slate-50 border-none rounded-lg px-4 py-3 text-xs font-bold text-slate-700 outline-none">
                <option value="all">Todos</option>
                <option value="individual">Apenas Eu</option>
                {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button onClick={resetFilters} className="w-full py-3 text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors">Limpar Filtros</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                <th className="py-5 px-6 w-12 text-center">Status</th>
                <th className="py-5 px-6">Data</th>
                <th className="py-5 px-6">Descrição</th>
                <th className="py-5 px-6">Categoria</th>
                <th className="py-5 px-6">Pagamento</th>
                <th className="py-5 px-6 text-center">Divisão</th>
                <th className="py-5 px-6 text-right">Valor</th>
                <th className="py-5 px-6 w-28 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t) => {
                const card = cards.find(c => c.id === t.card_id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 text-center">
                      <button onClick={() => togglePaid(t.id, t.is_paid)} className={`w-6 h-6 rounded flex items-center justify-center border-2 mx-auto transition-all ${t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                    </td>
                    <td className="py-5 px-6 text-[11px] text-slate-400 font-bold whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-5 px-6">
                      <p className={`text-sm font-semibold text-slate-900 ${!t.is_paid ? 'opacity-40' : ''}`}>{t.description}</p>
                    </td>
                    <td className="py-5 px-6 whitespace-nowrap">
                      <span className="text-[10px] text-indigo-500 font-bold uppercase bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{t.category}</span>
                    </td>
                    <td className="py-5 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {card ? (
                          <>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }}></div>
                            <span className="text-xs font-bold text-slate-600 uppercase">{card.name}</span>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 uppercase">Dinheiro/Pix</span>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      {t.is_split && t.split_details ? (
                        <div className="text-[9px] font-bold">
                          <div className="text-slate-400">EU: {formatCurrency(t.split_details.userPart)}</div>
                          <div className="text-indigo-600">{t.split_details.partnerName}: {formatCurrency(t.split_details.partnerPart)}</div>
                        </div>
                      ) : <span className="text-[9px] text-slate-300 font-bold uppercase">Individual</span>}
                    </td>
                    <td className={`py-5 px-6 text-right text-sm font-bold ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-40' : ''}`}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(t)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                        <button onClick={() => deleteTransaction(t.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="py-20 text-center text-slate-300 text-[10px] font-bold uppercase italic">Nenhum registro encontrado.</td></tr>}
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
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-indigo-600 outline-none" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-indigo-600 outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase mr-2">Filtrar Pagante:</label>
                <select value={selectedPayer} onChange={(e) => setSelectedPayer(e.target.value)} className="bg-slate-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-indigo-600 outline-none">
                  <option value="all">Todos</option>
                  <option value="individual">Apenas Eu</option>
                  {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <SummaryCards summary={dashboardData.summary} />
                <AIInsights transactions={dashboardData.filteredTransactions} />
                <Charts transactions={dashboardData.filteredTransactions} />
              </div>
              <div className="lg:col-span-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase mb-8">Faturas por Pagante</h2>
                  <div className="space-y-6">
                    {dashboardData.cardSummaries.map((card: any) => (
                      <div key={card.cardId || 'cash'} className="p-5 bg-slate-50/40 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:border-indigo-100 hover:shadow-xl">
                        <div className="flex justify-between items-start mb-5">
                          <div><h4 className="font-black text-xs text-slate-900 uppercase tracking-widest">{card.description}</h4>{card.hasPending && <span className="text-[7px] text-amber-600 font-black uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Pendente</span>}</div>
                        </div>
                        <div className="pt-4 border-t border-slate-100/60 space-y-3">
                          <div className="flex justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">EU:</span><span className="text-[13px] font-black text-slate-900">{formatCurrency(card.userPart)}</span></div>
                          {Object.entries(card.others).map(([name, val]: [any, any]) => (
                            <div key={name} className="flex justify-between"><span className="text-[10px] font-black text-indigo-400 uppercase">{name}:</span><span className="text-[13px] font-black text-indigo-600">{formatCurrency(val as number)}</span></div>
                          ))}
                          <div className="pt-2 flex justify-between items-center border-t border-dashed border-slate-200"><span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total</span><span className="text-base font-black text-slate-900">{formatCurrency(card.total)}</span></div>
                        </div>
                      </div>
                    ))}
                    {dashboardData.cardSummaries.length === 0 && (
                      <div className="py-10 text-center italic text-slate-300 text-xs">Nenhum gasto no período.</div>
                    )}
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
    }
  };

  if (sessionLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!currentUser) return <AuthScreen onSelectUser={setCurrentUser} />;

  const viewTitles: Record<string, string> = {
    'dashboard': 'Visão Geral',
    'cards': 'Meus Cartões',
    'add-expense': 'Gerenciar Despesas',
    'add-income': 'Gerenciar Receitas',
    'categories': 'Minhas Categorias',
    'reports': 'Extrato Detalhado',
    'payers': 'Gerenciar Pagantes',
    'payer-reports': 'Extrato por Pagante'
  };

  // Condição para mostrar o botão de Novo Lançamento
  const showNewTransactionButton = currentView !== 'reports' && currentView !== 'payer-reports';

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full max-w-7xl mx-auto">
        <header className="mb-14 flex flex-col items-center text-center">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{viewTitles[currentView]}</h2>
          
          {showNewTransactionButton && (
            <button 
              onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} 
              className="mt-8 bg-indigo-600 text-white px-8 py-4 rounded-xl shadow-xl hover:bg-indigo-700 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
              Novo Lançamento
            </button>
          )}
        </header>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <TransactionForm onAdd={addTransaction} onUpdate={updateTransaction} editingTransaction={editingTransaction} categories={categories} cards={cards} onCancel={closeForm} initialType={currentView === 'add-income' ? 'income' : 'expense'} />
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
