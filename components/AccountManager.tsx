
import React, { useState, useMemo } from 'react';
import { Account, Transaction, UserCategories, CreditCard } from '../types';
import { getCategoryIcon, getCategoryStyles } from '../utils/icons';

interface AccountManagerProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: UserCategories;
  cards: CreditCard[];
  onAdd: (account: Omit<Account, 'id'>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, currentStatus: boolean, paymentDate?: string | null) => void;
  onDeleteTransaction: (id: string) => void;
}

const AccountManager: React.FC<AccountManagerProps> = ({ accounts, transactions, categories, cards, onAdd, onDelete, onTogglePaid, onDeleteTransaction }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
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

  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [initialInvested, setInitialInvested] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [color, setColor] = useState('#4f46e5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onAdd({ 
      name, 
      initial_balance: parseFloat(initialBalance) || 0, 
      initial_invested_balance: parseFloat(initialInvested) || 0,
      type, 
      color 
    });
    
    setIsSubmitting(false);
    if (success) {
      setName(''); setInitialBalance(''); setInitialInvested(''); setShowAdd(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const calculatedAccounts = useMemo(() => {
    return accounts.map(acc => {
      const accountTransactions = transactions.filter(t => t.account_id === acc.id && t.is_paid);
      
      let balanceChange = 0;
      let investmentMovements = 0;

      accountTransactions.forEach(t => {
        const val = Number(t.amount);
        const isInvestmentCategory = t.category.toLowerCase().includes('invest');
        const isReserveWithdrawal = !!t.is_reserve_withdrawal;

        if (t.type === 'income') {
          if (isInvestmentCategory) {
            investmentMovements -= val; 
            balanceChange += val; 
          } else {
            balanceChange += val;
          }
        } else {
          // Despesa
          if (isReserveWithdrawal) {
            // Se for resgate da reserva, abate do investido
            investmentMovements -= val;
          } else if (isInvestmentCategory) {
            // Se for aporte em investimento, tira do líquido e põe no investido
            investmentMovements += val;
            balanceChange -= val;
          } else {
            // Gasto comum tira do líquido
            balanceChange -= val;
          }
        }
      });

      const currentLiquid = Number(acc.initial_balance) + balanceChange;
      const currentInvested = Number(acc.initial_invested_balance || 0) + investmentMovements;
      const totalPatrimony = currentLiquid + currentInvested;

      const linkedCardIds = cards.filter(c => c.account_id === acc.id).map(c => c.id);
      const creditCardDebt = transactions
        .filter(t => t.card_id && linkedCardIds.includes(t.card_id) && !t.is_paid && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { ...acc, currentLiquid, currentInvested, totalPatrimony, creditCardDebt, linkedCardsCount: linkedCardIds.length };
    });
  }, [accounts, transactions, cards]);

  const filteredTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    const linkedCardIds = cards.filter(c => c.account_id === selectedAccount.id).map(c => c.id);

    return transactions.filter(t => {
      const isDirect = t.account_id === selectedAccount.id;
      const isLinkedCard = t.card_id && linkedCardIds.includes(t.card_id);
      if (!isDirect && !isLinkedCard) return false;

      const tDate = t.date.split('T')[0];
      return tDate >= startDate && tDate <= endDate && (selectedCategory === 'all' || t.category === selectedCategory) && (statusFilter === 'all' || (statusFilter === 'paid' ? t.is_paid : !t.is_paid));
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccount, startDate, endDate, selectedCategory, statusFilter, cards]);

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      {selectedAccount ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <button onClick={() => setSelectedAccount(null)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: selectedAccount.color }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8H7v8"/></svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{selectedAccount.name}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extrato da Conta</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {(() => {
               const acc = calculatedAccounts.find(a => a.id === selectedAccount.id);
               if (!acc) return null;
               return (
                 <>
                   <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Disponível (Líquido)</p>
                     <h3 className={`text-xl font-black ${acc.currentLiquid >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>{formatCurrency(acc.currentLiquid)}</h3>
                   </div>
                   <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                     <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Reserva / Investido</p>
                     <h3 className="text-xl font-black text-indigo-700">{formatCurrency(acc.currentInvested)}</h3>
                   </div>
                   <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Patrimônio Total</p>
                     <h3 className="text-xl font-black text-white">{formatCurrency(acc.totalPatrimony)}</h3>
                   </div>
                 </>
               )
             })()}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Lançamentos Vinculados</h3>
            <div className="space-y-3">
              {filteredTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-lg hover:bg-slate-50 transition-all group">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                        {getCategoryIcon(t.category, 16)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="text-xs font-bold text-slate-900">{t.description}</p>
                           {t.is_reserve_withdrawal && (
                             <span className="px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-tighter border border-amber-100">Via Reserva</span>
                           )}
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{t.category}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className={`text-sm font-black ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</p>
                      <p className="text-[9px] font-bold text-slate-300">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                   </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase italic">Nenhuma transação encontrada</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Suas Contas</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestão de Patrimônio Líquido e Reservas</p>
            </div>
            <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95">Nova Conta</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {calculatedAccounts.map(acc => (
              <div key={acc.id} onClick={() => setSelectedAccount(acc)} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group cursor-pointer active:scale-[0.98]">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md" style={{ backgroundColor: acc.color }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8H7v8"/></svg>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(acc.id); }} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                  </button>
                </div>
                <h3 className="font-black text-slate-900 text-sm mb-4 truncate">{acc.name}</h3>
                
                <div className="space-y-3">
                   <div className="flex justify-between items-end">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saldo Disponível</p>
                      <p className={`text-base font-black ${acc.currentLiquid >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>{formatCurrency(acc.currentLiquid)}</p>
                   </div>
                   <div className="flex justify-between items-end">
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Investido / Reserva</p>
                      <p className="text-sm font-black text-indigo-600">{formatCurrency(acc.currentInvested)}</p>
                   </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
                   <p className="text-[9px] font-black text-slate-300 uppercase">Patrimônio Total</p>
                   <p className="text-sm font-black text-slate-900">{formatCurrency(acc.totalPatrimony)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Criar Nova Conta</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Nome</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-lg outline-none border-2 border-transparent focus:border-indigo-100 font-medium text-slate-900 text-sm" placeholder="Ex: Nubank" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Saldo Líquido Inicial</label>
                  <input type="number" step="0.01" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-lg outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900 text-sm" placeholder="0,00" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-400 uppercase block mb-1.5 ml-1">Reserva / Investido</label>
                  <input type="number" step="0.01" value={initialInvested} onChange={e => setInitialInvested(e.target.value)} className="w-full px-4 py-3 bg-indigo-50/30 rounded-lg outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-indigo-700 text-sm" placeholder="0,00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Tipo</label>
                  <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 rounded-lg outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900 text-xs">
                    <option value="checking">Conta Corrente</option>
                    <option value="investment">Investimento</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Cor</label>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-[48px] p-1 bg-slate-50 rounded-lg cursor-pointer" />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  {isSubmitting ? 'Salvando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManager;
