
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, UserCategories, CreditCard, Account, SplitDetails } from '../types';
import { supabase } from '../services/supabaseClient';

interface TransactionFormProps {
  onAdd: (data: any) => Promise<boolean>;
  onUpdate?: (id: string, data: any) => Promise<boolean>;
  editingTransaction?: Transaction | null;
  categories: UserCategories;
  cards: CreditCard[];
  onCancel?: () => void;
  initialType?: TransactionType;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onAdd, 
  onUpdate,
  editingTransaction,
  categories, 
  cards, 
  onCancel, 
  initialType = 'expense' 
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(initialType);
  const [category, setCategory] = useState('');
  
  // Seleção de meio de pagamento
  const [selectedCardId, setSelectedCardId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  
  const [installments, setInstallments] = useState(1);
  const [installmentMode, setInstallmentMode] = useState<'divide' | 'repeat'>('divide');
  const [isSplit, setIsSplit] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [partnerPart, setPartnerPart] = useState('');
  const [partnerName, setPartnerName] = useState(categories.payers?.[0] || 'Isa');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Buscar contas ao montar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('accounts').select('*').eq('user_id', session.user.id)
          .then(({ data }) => { if (data) setAvailableAccounts(data); });
      }
    });
  }, []);

  useEffect(() => {
    if (editingTransaction) {
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date.split('T')[0]);
      setPaymentDate(editingTransaction.payment_date ? editingTransaction.payment_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setSelectedCardId(editingTransaction.card_id || '');
      setSelectedAccountId(editingTransaction.account_id || '');
      setIsSplit(!!editingTransaction.is_split);
      setIsPaid(editingTransaction.is_paid);
      if (editingTransaction.split_details) {
        setPartnerPart(editingTransaction.split_details.partnerPart.toString());
        setPartnerName(editingTransaction.split_details.partnerName);
      }
    } else {
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setType(initialType);
      setCategory(categories[initialType][0] || 'Outros');
      setSelectedCardId('');
      setSelectedAccountId('');
      setInstallments(1);
      setInstallmentMode('divide');
      setIsSplit(false);
      setIsPaid(false);
      setPartnerPart('');
      setPartnerName(categories.payers?.[0] || 'Isa');
    }
  }, [editingTransaction, initialType, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date || loading) return;
    setLoading(true);
    
    try {
      const inputValue = parseFloat(amount);
      const getSafeISO = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toISOString();
      };

      // Define se usa cartão ou conta
      const finalCardId = selectedCardId || null;
      const finalAccountId = !selectedCardId && selectedAccountId ? selectedAccountId : null;

      if (editingTransaction && onUpdate) {
        const splitInfo: SplitDetails | undefined = isSplit ? {
          userPart: inputValue - (parseFloat(partnerPart) || 0),
          partnerPart: parseFloat(partnerPart) || 0,
          partnerName: partnerName
        } : undefined;

        const res = await onUpdate(editingTransaction.id, {
          description,
          amount: inputValue,
          type,
          category,
          date: getSafeISO(date),
          payment_date: isPaid ? getSafeISO(paymentDate) : null,
          card_id: finalCardId,
          account_id: finalAccountId,
          is_split: isSplit,
          split_details: splitInfo,
          is_paid: isPaid
        });
        
        if (res) {
          setSuccess(true);
          setTimeout(() => { if (onCancel) onCancel(); }, 800);
        } else {
          setLoading(false);
        }
        return;
      }

      const numInstallments = Math.max(1, installments);
      const amountPerInstallment = installmentMode === 'divide' ? inputValue / numInstallments : inputValue;
      const pPartInput = parseFloat(partnerPart) || 0;
      const pPartPerMonth = installmentMode === 'divide' ? pPartInput / numInstallments : pPartInput;
      const uPartPerMonth = amountPerInstallment - pPartPerMonth;

      const [year, month, day] = date.split('-').map(Number);
      let allSuccess = true;

      for (let i = 0; i < numInstallments; i++) {
        const targetDate = new Date(year, month - 1 + i, day, 12, 0, 0);
        const installmentLabel = numInstallments > 1 ? ` (${i + 1}/${numInstallments})` : '';
        const splitInfo: SplitDetails | undefined = isSplit ? {
          userPart: uPartPerMonth,
          partnerPart: pPartPerMonth,
          partnerName: partnerName
        } : undefined;

        const res = await onAdd({
          description: description + installmentLabel,
          amount: amountPerInstallment,
          type,
          category: category || 'Outros',
          date: targetDate.toISOString(),
          payment_date: isPaid ? targetDate.toISOString() : null,
          card_id: finalCardId,
          account_id: finalAccountId,
          is_split: isSplit,
          split_details: splitInfo,
          is_paid: isPaid
        });
        if (!res) allSuccess = false;
      }

      if (allSuccess) {
        setSuccess(true);
        setTimeout(() => { if (onCancel) onCancel(); }, 1000);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const inputClasses = "w-full h-[38px] px-3 bg-slate-50 border border-transparent focus:border-indigo-100 focus:bg-white rounded-md outline-none text-xs font-bold text-slate-800 placeholder:text-slate-300 transition-all flex items-center";
  const labelClasses = "text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-0.5";

  return (
    <div className="bg-white p-4 md:p-7 rounded-xl shadow-2xl border border-slate-100 w-full animate-in fade-in zoom-in duration-300 relative pb-6 md:pb-7">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
          {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h2>
        {onCancel && (
          <button onClick={onCancel} className="p-1.5 text-slate-300 hover:text-slate-500 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
        {!editingTransaction && (
          <div className="flex p-1 bg-slate-100/50 rounded-lg max-w-xs">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategory(categories[t][0] || 'Outros'); }}
                className={`flex-1 py-1 rounded text-[9px] font-black tracking-widest transition-all uppercase flex items-center justify-center gap-2 ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                {t === 'expense' ? 'DESPESA' : 'RECEITA'}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4">
            <div className="lg:col-span-6">
              <label className={labelClasses}>Descrição</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClasses} placeholder="O que você comprou?" required />
            </div>
            <div className="lg:col-span-3">
              <label className={labelClasses}>Data de Vencimento</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClasses} required />
            </div>
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className={labelClasses}>Pago?</label>
                <button type="button" onClick={() => setIsPaid(!isPaid)} className={`w-9 h-5 rounded-full transition-all relative ${isPaid ? 'bg-teal-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isPaid ? 'left-4.5' : 'left-0.5'}`}></div>
                </button>
              </div>
              {isPaid && (
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={`${inputClasses} bg-teal-50/20 border-teal-50`} required />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className={labelClasses}>Valor Total</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputClasses} font-black text-sm`} placeholder="0,00" required />
            </div>
            <div>
              <label className={labelClasses}>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputClasses} appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.6rem_center] bg-no-repeat`}>
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            
            {/* Lógica de Seleção de Pagamento */}
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
               <div>
                  <label className={labelClasses}>Cartão de Crédito</label>
                  <select 
                    value={selectedCardId} 
                    onChange={e => { setSelectedCardId(e.target.value); if(e.target.value) setSelectedAccountId(''); }} 
                    className={`${inputClasses} appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.6rem_center] bg-no-repeat`}
                  >
                    <option value="">Não usar cartão</option>
                    {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className={labelClasses}>Conta / Carteira</label>
                  <select 
                    value={selectedAccountId} 
                    onChange={e => setSelectedAccountId(e.target.value)} 
                    disabled={!!selectedCardId}
                    className={`${inputClasses} ${!!selectedCardId ? 'opacity-50' : ''} appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.6rem_center] bg-no-repeat`}
                  >
                    <option value="">Sem conta vinculada</option>
                    {availableAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="md:col-start-4">
               <label className={`${labelClasses} text-indigo-500`}>Nº Meses</label>
               <input type="number" min="1" max="99" value={installments} disabled={!!editingTransaction} onChange={e => setInstallments(parseInt(e.target.value) || 1)} className={`${inputClasses} border-indigo-50 bg-indigo-50/20 disabled:opacity-40`} />
             </div>
          </div>

          {!editingTransaction && installments > 1 && (
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              <div className="flex p-0.5 bg-white rounded-md border border-slate-100">
                <button type="button" onClick={() => setInstallmentMode('divide')} className={`px-3 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest ${installmentMode === 'divide' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Ratear</button>
                <button type="button" onClick={() => setInstallmentMode('repeat')} className={`px-3 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest ${installmentMode === 'repeat' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Repetir</button>
              </div>
              {amount && (
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Plano: <span className="text-indigo-600">{installments}x</span> de <span className="text-indigo-600">{formatCurrency(installmentMode === 'divide' ? parseFloat(amount) / installments : parseFloat(amount))}</span>
                </p>
              )}
            </div>
          )}

          {type === 'expense' && (
            <div className={`p-3 md:p-4 rounded-lg border transition-all ${isSplit ? 'bg-indigo-50/10 border-indigo-100' : 'bg-slate-50/30 border-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded flex items-center justify-center transition-all ${isSplit ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                   </div>
                   <div className="leading-none">
                     <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest block mb-0.5">Dividir com Pagante</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Rateio de despesa comum</span>
                   </div>
                </div>
                <button type="button" onClick={() => setIsSplit(!isSplit)} className={`w-9 h-5 rounded-full transition-all relative ${isSplit ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isSplit ? 'left-4.5' : 'left-0.5'}`}></div>
                </button>
              </div>
              {isSplit && (
                <div className="mt-3 pt-3 border-t border-indigo-100/30 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-[8px] font-black text-indigo-400 uppercase mb-1 block">Quem é o pagante?</label>
                    <select value={partnerName} onChange={e => setPartnerName(e.target.value)} className="w-full h-9 px-3 bg-white rounded-md border border-indigo-50 text-[11px] font-black text-slate-800 outline-none">
                      {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-indigo-400 uppercase mb-1 block">Parte dele(a)</label>
                    <input type="number" step="0.01" value={partnerPart} onChange={e => setPartnerPart(e.target.value)} placeholder="0,00" className="w-full h-9 px-3 bg-white rounded-md border border-indigo-50 text-[11px] font-black text-indigo-600 outline-none" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-3 md:pt-4 pb-2 md:pb-0">
          <button type="submit" disabled={success || loading} className={`w-full py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-white shadow-lg active:scale-[0.98] ${success ? 'bg-teal-500' : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'}`}>
            {loading ? 'Processando...' : (success ? '✓ Atualizado' : (editingTransaction ? 'Salvar Alterações' : 'Confirmar Lançamento'))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
