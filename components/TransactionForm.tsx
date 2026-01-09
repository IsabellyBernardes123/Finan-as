
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, UserCategories, CreditCard, SplitDetails } from '../types';

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
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [installmentMode, setInstallmentMode] = useState<'divide' | 'repeat'>('divide');
  const [isSplit, setIsSplit] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [partnerPart, setPartnerPart] = useState('');
  const [partnerName, setPartnerName] = useState(categories.payers?.[0] || 'Isa');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTransaction) {
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date.split('T')[0]);
      setPaymentDate(editingTransaction.payment_date ? editingTransaction.payment_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setSelectedCardId(editingTransaction.card_id || '');
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
      setInstallments(1);
      setInstallmentMode('divide');
      setIsSplit(false);
      setIsPaid(true);
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
          card_id: selectedCardId || null,
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
          card_id: selectedCardId || null,
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

  const inputClasses = "w-full h-[40px] px-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-lg outline-none text-xs font-black text-slate-800 placeholder:text-slate-300 transition-all flex items-center";
  const labelClasses = "text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1";

  return (
    <div className="bg-white p-5 md:p-8 rounded-2xl shadow-2xl border border-slate-50 w-full animate-in fade-in zoom-in duration-300 relative">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
          {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h2>
        {onCancel && (
          <button onClick={onCancel} className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-md transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!editingTransaction && (
          <div className="flex p-1 bg-slate-100/60 rounded-lg max-w-xs md:max-w-md">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategory(categories[t][0] || 'Outros'); }}
                className={`flex-1 py-1.5 md:py-2 rounded-md text-[9px] md:text-[10px] font-black tracking-[0.1em] transition-all uppercase flex items-center justify-center gap-2 ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                {t === 'expense' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m17 14-5-5-5 5"/><path d="M12 9v12"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
                )}
                {t === 'expense' ? 'DESPESA' : 'RECEITA'}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4">
            <div className="lg:col-span-6">
              <label className={labelClasses}>Descrição</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClasses} placeholder="Ex: Mercado mensal" required />
            </div>
            <div className="lg:col-span-3">
              <label className={labelClasses}>Data de Vencimento</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClasses} required />
            </div>
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-1 ml-1">
                <label className={labelClasses}>Já está Pago?</label>
                <button type="button" onClick={() => setIsPaid(!isPaid)} className={`w-8 h-4 rounded-full transition-all relative ${isPaid ? 'bg-teal-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${isPaid ? 'left-4.5' : 'left-0.5'}`}></div>
                </button>
              </div>
              {isPaid && (
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inputClasses} required />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className={labelClasses}>Valor {installmentMode === 'divide' ? 'Total' : 'Mensal'}</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClasses} placeholder="0,00" required />
            </div>
            <div>
              <label className={labelClasses}>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputClasses} appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.75rem_center] bg-no-repeat`}>
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Meio de Pagamento</label>
              <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} className={`${inputClasses} appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.75rem_center] bg-no-repeat`}>
                <option value="">Dinheiro / Pix</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`${labelClasses} text-indigo-500`}>Nº de Meses</label>
              <input type="number" min="1" max="99" value={installments} disabled={!!editingTransaction} onChange={e => setInstallments(parseInt(e.target.value) || 1)} className={`${inputClasses} border-indigo-50 bg-indigo-50/10 font-black text-indigo-700 disabled:opacity-50`} />
            </div>
          </div>

          {!editingTransaction && installments > 1 && (
            <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex p-1 bg-white rounded-lg border border-slate-100 w-full md:w-auto">
                <button type="button" onClick={() => setInstallmentMode('divide')} className={`flex-1 md:flex-none px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${installmentMode === 'divide' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Ratear Total</button>
                <button type="button" onClick={() => setInstallmentMode('repeat')} className={`flex-1 md:flex-none px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${installmentMode === 'repeat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Provisionar</button>
              </div>
              {amount && (
                <div className="flex-1 flex flex-col sm:flex-row justify-between items-center w-full px-1 gap-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center sm:text-left">Plano: <span className="text-indigo-600">{installments}x</span> de <span className="text-indigo-600">{formatCurrency(installmentMode === 'divide' ? parseFloat(amount) / installments : parseFloat(amount))}</span></p>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Total: <span className="text-slate-900">{formatCurrency(installmentMode === 'divide' ? parseFloat(amount) : parseFloat(amount) * installments)}</span></p>
                </div>
              )}
            </div>
          )}

          {type === 'expense' && (
            <div className={`p-4 rounded-xl border transition-all duration-300 ${isSplit ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isSplit ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                   </div>
                   <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Dividir com Parceiro(a)</span>
                </div>
                <button type="button" onClick={() => setIsSplit(!isSplit)} className={`w-9 h-4.5 rounded-full transition-all relative ${isSplit ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all ${isSplit ? 'left-5' : 'left-0.5'}`}></div>
                </button>
              </div>
              {isSplit && (
                <div className="mt-3 pt-3 border-t border-indigo-100/50 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                  <div>
                    <label className="text-[8px] font-black text-indigo-400 uppercase mb-1 block ml-1">Quem vai pagar?</label>
                    <select value={partnerName} onChange={e => setPartnerName(e.target.value)} className="w-full h-8 px-3 bg-white rounded-lg border-2 border-indigo-50 text-[10px] font-black text-slate-800 outline-none appearance-none">
                      {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-indigo-400 uppercase mb-1 block ml-1">Parte Dele(a)</label>
                    <input type="number" step="0.01" value={partnerPart} onChange={e => setPartnerPart(e.target.value)} placeholder="0,00" className="w-full h-8 px-3 bg-white rounded-lg border-2 border-indigo-50 text-[10px] font-black text-slate-800 outline-none" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-2">
          <button type="submit" disabled={success || loading} className={`w-full py-3 md:py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-white shadow-xl transform active:scale-[0.98] ${success ? 'bg-teal-500 shadow-teal-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 disabled:opacity-50'}`}>
            {loading ? 'Sincronizando...' : (success ? '✓ Concluído' : (editingTransaction ? 'Atualizar Registro' : 'Confirmar Lançamento'))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
