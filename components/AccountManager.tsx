
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
  // Novas props para lidar com ações nas transações
  onTogglePaid: (id: string, currentStatus: boolean, paymentDate?: string | null) => void;
  onDeleteTransaction: (id: string) => void;
}

const AccountManager: React.FC<AccountManagerProps> = ({ accounts, transactions, categories, cards, onAdd, onDelete, onTogglePaid, onDeleteTransaction }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  // --- States Modais Locais (para transações da conta) ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTransId, setPaymentTransId] = useState<string | null>(null);
  const [paymentCurrentStatus, setPaymentCurrentStatus] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTransId, setDeleteTransId] = useState<string | null>(null);
  // --------------------------------------------------------

  // Filtros (Copiados da Home)
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
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [color, setColor] = useState('#4f46e5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onAdd({ 
      name, 
      initial_balance: parseFloat(initialBalance) || 0, 
      type, 
      color 
    });
    
    setIsSubmitting(false);

    if (success) {
      setName(''); setInitialBalance(''); setShowAdd(false);
    } else {
      alert("Erro ao salvar conta!\n\nProvavelmente a tabela 'accounts' não existe no banco de dados.\n\nVá até 'Configurações Avançadas' > 'Atualizar Banco de Dados' e rode o script SQL fornecido.");
    }
  };

  // --- Handlers Locais ---
  const requestPaymentToggle = (id: string, status: boolean) => {
    setPaymentTransId(id);
    setPaymentCurrentStatus(status);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  const confirmPayment = () => {
    if (paymentTransId) {
      const newStatus = !paymentCurrentStatus;
      onTogglePaid(paymentTransId, paymentCurrentStatus, newStatus ? paymentDate : null);
    }
    setIsPaymentModalOpen(false);
    setPaymentTransId(null);
  };

  const requestDelete = (id: string) => {
    setDeleteTransId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTransId) {
      onDeleteTransaction(deleteTransId);
    }
    setIsDeleteModalOpen(false);
    setDeleteTransId(null);
  };
  // -----------------------

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Calcula saldos para a lista de contas
  const calculatedAccounts = useMemo(() => {
    return accounts.map(acc => {
      // 1. Saldo da Conta
      const accountTransactions = transactions.filter(t => t.account_id === acc.id && t.is_paid);
      const balanceChange = accountTransactions.reduce((sum, t) => {
        const val = Number(t.amount);
        return t.type === 'income' ? sum + val : sum - val;
      }, 0);
      const currentBalance = Number(acc.initial_balance) + balanceChange;

      // 2. Fatura Pendente de Cartões Vinculados
      const linkedCards = cards.filter(c => c.account_id === acc.id);
      const linkedCardIds = linkedCards.map(c => c.id);
      
      const creditCardDebt = transactions
        .filter(t => t.card_id && linkedCardIds.includes(t.card_id) && !t.is_paid && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { ...acc, currentBalance, creditCardDebt, linkedCardsCount: linkedCards.length };
    });
  }, [accounts, transactions, cards]);

  // Filtra transações para a conta selecionada (Incluindo cartões vinculados)
  const filteredTransactions = useMemo(() => {
    if (!selectedAccount) return [];

    // Identifica cartões vinculados a esta conta
    const linkedCardIds = cards.filter(c => c.account_id === selectedAccount.id).map(c => c.id);

    return transactions.filter(t => {
      // Regra de Vínculo:
      // 1. Transação direta na conta (Débito/Dinheiro): account_id igual ao selecionado
      // 2. Transação de Cartão de Crédito vinculado: card_id está na lista de vinculados
      const isDirect = t.account_id === selectedAccount.id;
      const isLinkedCard = t.card_id && linkedCardIds.includes(t.card_id);

      if (!isDirect && !isLinkedCard) return false;

      // Filtros de Data e Outros
      const tDate = t.date.split('T')[0];
      const matchesDate = tDate >= startDate && tDate <= endDate;
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'paid' ? t.is_paid : !t.is_paid);
      
      return matchesDate && matchesCategory && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccount, startDate, endDate, selectedCategory, statusFilter, cards]);

  // Resumo do período filtrado
  const filteredSummary = useMemo(() => {
     return filteredTransactions.reduce((acc, t) => {
       const val = Number(t.amount);
       if (t.type === 'income') {
         acc.income += val;
         acc.result += val;
       } else {
         acc.expense += val;
         acc.result -= val;
       }
       return acc;
     }, { income: 0, expense: 0, result: 0 });
  }, [filteredTransactions]);

  const totalPatrimony = calculatedAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const allCategories = Array.from(new Set([...categories.expense, ...categories.income])).sort();

  const getIcon = (type: string) => {
    switch(type) {
      case 'investment': return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><path d="m17 19-5 3-5-3"/></svg>;
      case 'cash': return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><line x1="12" x2="12" y1="15" y2="15"/></svg>;
      case 'savings': return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/><path d="M2 9v1"/><path d="M23 9v1"/></svg>;
      default: return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8H7v8"/></svg>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'checking': return 'Conta Corrente';
      case 'investment': return 'Investimentos';
      case 'cash': return 'Carteira Física';
      case 'savings': return 'Poupança';
      default: return 'Outros';
    }
  };

  // --- VIEW: DETALHES DA CONTA (TRANSAÇÕES) ---
  if (selectedAccount) {
    const acc = calculatedAccounts.find(a => a.id === selectedAccount.id) || selectedAccount;

    return (
      <div className="max-w-5xl space-y-6 animate-in slide-in-from-right-4 duration-300 pb-12 relative">
        {/* MODAIS LOCAIS */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{paymentCurrentStatus ? 'Reabrir?' : 'Confirmar Pagamento'}</h3>
              <p className="text-xs text-slate-500 mb-6 font-medium">
                {paymentCurrentStatus ? 'Deseja marcar como pendente novamente?' : 'Informe a data que o débito ocorreu:'}
              </p>
              {!paymentCurrentStatus && (
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 outline-none mb-6" />
              )}
              <div className="flex gap-3">
                <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600">Cancelar</button>
                <button onClick={confirmPayment} className={`flex-1 ${paymentCurrentStatus ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg`}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 border border-rose-100">
                <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">Excluir Lançamento?</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium text-center">Tem certeza que deseja remover este item da conta?</p>
                <div className="flex gap-3">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600">Cancelar</button>
                  <button onClick={confirmDelete} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">Sim, Excluir</button>
                </div>
             </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setSelectedAccount(null)}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: acc.color }}>
            {getIcon(acc.type)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{acc.name}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{getTypeLabel(acc.type)}</p>
          </div>
          <div className="text-right">
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo Atual</p>
             <h2 className={`text-2xl font-black ${(acc as any).currentBalance >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>
               {formatCurrency((acc as any).currentBalance)}
             </h2>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Início</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-3 py-2 text-xs font-bold text-indigo-600 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 block">Fim</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-md px-3 py-2 text-xs font-bold text-indigo-600 outline-none" />
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
                  setStartDate(firstDay); setEndDate(lastDay); 
                  setSelectedCategory('all'); setStatusFilter('all');
                }} 
                className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Resumo do Período */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100">
            <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-1">Entradas (Período)</p>
            <p className="text-lg font-black text-teal-700">{formatCurrency(filteredSummary.income)}</p>
          </div>
          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Saídas (Período)</p>
            <p className="text-lg font-black text-rose-600">{formatCurrency(filteredSummary.expense)}</p>
          </div>
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Resultado (Período)</p>
            <p className={`text-lg font-black ${filteredSummary.result >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
              {formatCurrency(filteredSummary.result)}
            </p>
          </div>
        </div>

        {/* Lista de Transações */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                <th className="py-4 px-6 text-center w-16">Status</th>
                <th className="py-4 px-6">Data</th>
                <th className="py-4 px-6">Descrição</th>
                <th className="py-4 px-6">Categoria</th>
                <th className="py-4 px-6 text-right">Valor</th>
                <th className="py-4 px-6 text-center">Excluir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => {
                const styles = getCategoryStyles(t.category, categories);
                const inlineStyles = styles.isCustom ? {
                  backgroundColor: `${styles.customColor}15`,
                  color: styles.customColor,
                  borderColor: `${styles.customColor}30`
                } : {};
                
                // Verifica se é via cartão vinculado
                const card = t.card_id ? cards.find(c => c.id === t.card_id) : null;
                const isLinkedCard = !!card;

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-center">
                       <button 
                         onClick={() => requestPaymentToggle(t.id, t.is_paid)}
                         className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 mx-auto transition-all ${t.is_paid ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-200 hover:border-teal-300'}`}
                       >
                         {t.is_paid ? (
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                         ) : null}
                       </button>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-[11px] font-bold text-slate-600">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                      {t.is_paid && t.payment_date && <p className="text-[9px] font-bold text-teal-600 uppercase tracking-tight">Pago: {new Date(t.payment_date).toLocaleDateString('pt-BR')}</p>}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-xs font-bold text-slate-900">{t.description}</p>
                      {isLinkedCard && (
                         <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter block mt-0.5">Via {card.name}</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border ${!styles.isCustom ? `${styles.bg} ${styles.text} ${styles.border}` : ''}`}
                          style={inlineStyles}
                        >
                          {getCategoryIcon(t.category, 12, categories)}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{t.category}</span>
                      </div>
                    </td>
                    <td className={`py-4 px-6 text-right text-sm font-black ${t.type === 'income' ? 'text-teal-600' : 'text-rose-500'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-4 px-6 text-center">
                       <button onClick={() => requestDelete(t.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                       </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[10px] font-bold text-slate-300 uppercase italic">
                    Nenhuma movimentação neste período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- VIEW: LISTA DE CONTAS (PADRÃO) ---
  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Minhas Contas</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Patrimônio Total Acumulado</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
             <span className="text-lg font-black text-indigo-700">{formatCurrency(totalPatrimony)}</span>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 transition-all hover:bg-black active:scale-95">
            Nova Conta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {calculatedAccounts.map(acc => (
          <div 
            key={acc.id} 
            onClick={() => setSelectedAccount(acc)}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-slate-50 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:to-indigo-50"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: acc.color }}>
                  {getIcon(acc.type)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{acc.name}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{getTypeLabel(acc.type)}</p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(acc.id); }} 
                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                title="Excluir Conta"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
              </button>
            </div>

            <div className="mt-6 relative z-10">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo Atual</p>
              <h2 className={`text-2xl font-black ${acc.currentBalance >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>
                {formatCurrency(acc.currentBalance)}
              </h2>
            </div>
            
            {(acc as any).creditCardDebt > 0 && (
              <div className="mt-3 bg-rose-50 border border-rose-100 p-2 rounded-lg flex justify-between items-center relative z-10">
                 <div>
                    <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Fatura Pendente</p>
                    <p className="text-[9px] font-medium text-rose-400 uppercase tracking-tighter">{(acc as any).linkedCardsCount} Cartão(ões)</p>
                 </div>
                 <p className="text-sm font-black text-rose-600">{formatCurrency((acc as any).creditCardDebt)}</p>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center relative z-10">
              <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter group-hover:underline">Ver Extrato Completo</p>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-300 group-hover:text-indigo-500 transition-colors"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        ))}

        {calculatedAccounts.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma conta cadastrada</p>
             <p className="text-[10px] text-slate-300 mt-1">Adicione seus bancos para controlar o saldo real.</p>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Nova Conta / Carteira</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Nome da Instituição</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-medium text-slate-900 text-sm" placeholder="Ex: Nubank, Itaú, Carteira..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Saldo Inicial</label>
                  <input type="number" step="0.01" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900 text-sm" placeholder="0,00" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Cor</label>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-[48px] p-1 bg-slate-50 rounded-xl outline-none cursor-pointer" />
                </div>
              </div>
              <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Tipo de Conta</label>
                  <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900 text-xs">
                    <option value="checking">Conta Corrente / Digital</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimentos</option>
                    <option value="cash">Dinheiro em Espécie</option>
                    <option value="other">Outro</option>
                  </select>
              </div>
              
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50">
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
