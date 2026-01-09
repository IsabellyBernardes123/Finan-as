
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
  
  const { 
    transactions, cards, categories, 
    addTransaction, updateTransaction, deleteTransaction, togglePaid,
    addCard, deleteCard, addCategory, deleteCategory, loading: dataLoading
  } = useFinanceData(currentUser?.id || null);
  
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Modal de Data de Pagamento
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

  const resetFilters = () => {
    const { firstDay, lastDay } = getInitialDates();
    setStartDate(firstDay);
    setEndDate(lastDay);
    setSelectedCategory('all');
    setSelectedPayer('all');
    setStatusFilter('all');
  };

  const handleTogglePaid = (id: string, currentStatus: boolean) => {
    if (!currentStatus) {
      // Abrir modal para informar data de pagamento
      setTransactionToPay({ id, status: currentStatus });
      setPaymentDateInput(new Date().toISOString().split('T')[0]);
      setPaymentModalOpen(true);
    } else {
      // Simplesmente desmarcar como pago
      togglePaid(id, currentStatus, null);
    }
  };

  const confirmPayment = () => {
    if (transactionToPay) {
      const d = new Date(paymentDateInput + 'T12:00:00');
      togglePaid(transactionToPay.id, transactionToPay.status, d.toISOString());
      setPaymentModalOpen(false);
      setTransactionToPay(null);
    }
  };

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
        if (selectedPayer === 'individual') return true;
        if (selectedPayer !== 'all') return t.is_split && t.split_details?.partnerName === selectedPayer;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="space-y-4 max-w-7xl mx-auto pb-24 md:pb-0 animate-in fade-in duration-500">
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Início</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-3 py-2 text-xs font-bold text-indigo-600 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Fim</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-3 py-2 text-xs font-bold text-indigo-600 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Categoria</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-4 py-2 text-xs font-bold text-slate-700 outline-none appearance-none">
                <option value="all">Todas</option>
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Pagante</label>
              <select value={selectedPayer} onChange={(e) => setSelectedPayer(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-4 py-2 text-xs font-bold text-slate-700 outline-none appearance-none">
                <option value="all">Todos</option>
                <option value="individual">Apenas Eu</option>
                {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button onClick={resetFilters} className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors">Limpar Filtros</button>
          </div>
        </div>

        <div className="hidden md:block bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                <th className="py-4 px-6 w-12 text-center">Status</th>
                <th className="py-4 px-6">Vencimento</th>
                <th className="py-4 px-6">Descrição / Categoria</th>
                <th className="py-4 px-6">Pagamento</th>
                <th className="py-4 px-6 text-center">Divisão</th>
                <th className="py-4 px-6 text-right">Valor</th>
                <th className="py-4 px-6 w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t) => {
                const card = cards.find(c => c.id === t.card_id);
                let displayAmount = t.amount;
                if (selectedPayer === 'individual' && t.is_split && t.split_details) { displayAmount = t.split_details.userPart; }
                else if (selectedPayer !== 'all' && t.is_split && t.split_details) { displayAmount = t.split_details.partnerPart; }

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => handleTogglePaid(t.id, t.is_paid)} className={`w-5 h-5 rounded-md flex items-center justify-center border-2 mx-auto transition-all ${t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                    </td>
                    <td className="py-4 px-6 text-[11px] text-slate-400 font-bold whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                      {t.is_paid && t.payment_date && (
                        <div className="text-[9px] text-teal-600 font-black mt-0.5">PAGO EM: {new Date(t.payment_date).toLocaleDateString('pt-BR')}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-500'} transition-transform`}>
                          {getCategoryIcon(t.category)}
                        </div>
                        <div>
                          <p className={`text-xs font-bold text-slate-900 leading-tight ${!t.is_paid ? 'opacity-40' : ''}`}>{t.description}</p>
                          <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter opacity-80">{t.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {card ? (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: card.color }}></div>
                            <span className="text-xs font-bold text-slate-600 uppercase">{card.name}</span>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Dinheiro/Pix</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {t.is_split && t.split_details ? (
                        <div className="text-[9px] font-bold">
                          <div className="text-slate-400">EU: {formatCurrency(t.split_details.userPart)}</div>
                          <div className="text-indigo-600">{t.split_details.partnerName}: {formatCurrency(t.split_details.partnerPart)}</div>
                        </div>
                      ) : <span className="text-[9px] text-slate-200 font-black uppercase tracking-widest italic text-[8px]">Solo</span>}
                    </td>
                    <td className={`py-4 px-6 text-right text-xs font-black ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-40' : ''}`}>
                      {formatCurrency(displayAmount)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingTransaction(t); setIsFormOpen(true); }} className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                        <button onClick={() => deleteTransaction(t.id)} className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
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
            const card = cards.find(c => c.id === t.card_id);
            let displayAmount = t.amount;
            if (selectedPayer === 'individual' && t.is_split && t.split_details) { displayAmount = t.split_details.userPart; }
            else if (selectedPayer !== 'all' && t.is_split && t.split_details) { displayAmount = t.split_details.partnerPart; }

            return (
              <div key={t.id} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleTogglePaid(t.id, t.is_paid)} className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                    <div>
                      <p className={`text-[10px] text-slate-400 font-bold uppercase tracking-widest`}>{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                      <h4 className={`text-sm font-bold text-slate-900 leading-tight ${!t.is_paid ? 'opacity-40' : ''}`}>{t.description}</h4>
                      {t.is_paid && t.payment_date && (
                        <p className="text-[8px] text-teal-600 font-black uppercase tracking-tighter mt-0.5">Pago em: {new Date(t.payment_date).toLocaleDateString('pt-BR')}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-black ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'} ${!t.is_paid ? 'opacity-40' : ''}`}>
                      {formatCurrency(displayAmount)}
                    </p>
                    <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter opacity-80">{t.category}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      {card ? <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: card.color }}></div> : <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="3"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>}
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{card ? card.name : 'Dinheiro/Pix'}</span>
                    </div>
                    {t.is_split && <div className="bg-indigo-50 px-2 py-0.5 rounded text-[8px] font-black text-indigo-600 uppercase tracking-tighter">Dividido</div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingTransaction(t); setIsFormOpen(true); }} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-md transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
                    <button onClick={() => deleteTransaction(t.id)} className="p-2 text-rose-300 hover:bg-rose-50 rounded-md transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && <div className="py-20 text-center bg-white rounded-lg border border-slate-100 italic text-slate-300 text-[10px] font-black uppercase tracking-widest">Nenhum registro encontrado.</div>}
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
            <div className="mb-6 text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Olá, <span className="text-indigo-600">{currentUser?.name.split(' ')[0]}!</span> 👋
              </h1>
              <p className="text-xs font-medium text-slate-400 mt-1">Resumo das suas finanças hoje</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border-none rounded-md px-3 py-1.5 text-[11px] font-bold text-indigo-600 outline-none" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border-none rounded-md px-3 py-1.5 text-[11px] font-bold text-indigo-600 outline-none" />
              </div>
              <select value={selectedPayer} onChange={(e) => setSelectedPayer(e.target.value)} className="bg-slate-50 border-none rounded-md px-4 py-1.5 text-[11px] font-bold text-indigo-600 outline-none appearance-none">
                <option value="all">Todos Pagantes</option>
                <option value="individual">Apenas Eu</option>
                {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <SummaryCards summary={dashboardData.summary} />
                <AIInsights transactions={dashboardData.filteredTransactions} />
                <Charts transactions={dashboardData.filteredTransactions} />
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[10px] font-black text-slate-900 tracking-tight uppercase">Lançamentos Recentes</h2>
                    <button onClick={() => setCurrentView('reports')} className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest">Ver Tudo</button>
                  </div>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-md border border-transparent hover:border-indigo-50 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-500'}`}>
                            {getCategoryIcon(t.category)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-none mb-1">{t.description}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{t.category} • {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <p className={`text-xs font-black ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'}`}>
                          {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                        </p>
                      </div>
                    ))}
                    {transactions.length === 0 && <p className="text-center py-6 text-[10px] text-slate-300 italic font-bold uppercase tracking-widest">Nenhum lançamento recente</p>}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100 h-full">
                  <h2 className="text-[10px] font-black text-slate-900 tracking-tight uppercase mb-6 border-b border-slate-50 pb-3">Extrato por Pagante</h2>
                  <div className="space-y-3">
                    {dashboardData.cardSummaries.map((card: any) => (
                      <div key={card.cardId || 'cash'} className="p-4 bg-slate-50/40 rounded-lg border border-slate-100 transition-all hover:bg-white hover:border-indigo-100">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-black text-[10px] text-slate-900 uppercase tracking-widest">{card.description}</h4>
                          {card.hasPending && <span className="text-[7px] text-amber-600 font-black uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded-sm border border-amber-100">Pendente</span>}
                        </div>
                        <div className="pt-3 border-t border-slate-100/60 space-y-2">
                          <div className="flex justify-between items-baseline"><span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">VOCÊ</span><span className="text-xs font-black text-slate-900">{formatCurrency(card.userPart)}</span></div>
                          {Object.entries(card.others).map(([name, val]: [any, any]) => (
                            <div key={name} className="flex justify-between items-baseline"><span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">{name}</span><span className="text-xs font-black text-indigo-600">{formatCurrency(val as number)}</span></div>
                          ))}
                          <div className="pt-2 flex justify-between items-center border-t border-dashed border-slate-200 mt-1"><span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">SUBTOTAL</span><span className="text-sm font-black text-slate-900">{formatCurrency(card.total)}</span></div>
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
    'dashboard': 'Visão Geral',
    'cards': 'Meus Cartões',
    'add-expense': 'Despesas',
    'add-income': 'Receitas',
    'categories': 'Categorias',
    'reports': 'Extrato',
    'payers': 'Pagantes',
    'payer-reports': 'Acerto de Contas',
    'data-management': 'Gerenciar Dados'
  };

  const showNewTransactionButton = currentView !== 'dashboard' && currentView !== 'reports' && currentView !== 'payer-reports' && currentView !== 'data-management';

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
        <header className="mb-6 md:mb-10 flex items-center justify-center relative min-h-[40px]">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 md:hidden">
            <Logo size="sm" showText={false} />
          </div>
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{viewTitles[currentView]}</h2>
            {showNewTransactionButton && (
              <button 
                onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} 
                className="mt-4 md:mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 group active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="group-hover:rotate-90 transition-transform"><path d="M12 5v14M5 12h14"/></svg>
                Novo Lançamento
              </button>
            )}
          </div>
        </header>

        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] overflow-y-auto p-4 md:p-8 flex justify-center items-start md:items-center">
            <div className="w-full max-w-4xl">
              <TransactionForm 
                onAdd={addTransaction} 
                onUpdate={updateTransaction} 
                editingTransaction={editingTransaction} 
                categories={categories} 
                cards={cards} 
                onCancel={() => setIsFormOpen(false)} 
                initialType={currentView === 'add-income' ? 'income' : 'expense'} 
              />
            </div>
          </div>
        )}

        {paymentModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-50 w-full max-w-sm animate-in zoom-in-95">
              <h3 className="text-lg font-black text-slate-900 mb-4 tracking-tight">Informar Pagamento</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 leading-relaxed">Por favor, selecione a data em que este lançamento foi efetivamente pago.</p>
              
              <div className="mb-8">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Data de Pagamento</label>
                <input 
                  type="date" 
                  value={paymentDateInput} 
                  onChange={e => setPaymentDateInput(e.target.value)}
                  className="w-full h-[45px] px-4 bg-slate-50 border-2 border-indigo-50 rounded-xl outline-none text-sm font-black text-indigo-600"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmPayment}
                  className="flex-1 py-3 bg-teal-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-100 hover:bg-teal-600 transition-all active:scale-95"
                >
                  Confirmar
                </button>
              </div>
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
