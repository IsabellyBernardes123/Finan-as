
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
  const [type, setType] = useState<TransactionType>(initialType);
  const [category, setCategory] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [installmentMode, setInstallmentMode] = useState<'divide' | 'repeat'>('divide');
  const [isSplit, setIsSplit] = useState(false);
  const [partnerPart, setPartnerPart] = useState('');
  const [partnerName, setPartnerName] = useState(categories.payers?.[0] || 'Isa');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTransaction) {
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date.split('T')[0]);
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setSelectedCardId(editingTransaction.card_id || '');
      setIsSplit(!!editingTransaction.is_split);
      if (editingTransaction.split_details) {
        setPartnerPart(editingTransaction.split_details.partnerPart.toString());
        setPartnerName(editingTransaction.split_details.partnerName);
      }
    } else {
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setType(initialType);
      setCategory(categories[initialType][0] || 'Outros');
      setSelectedCardId('');
      setInstallments(1);
      setInstallmentMode('divide');
      setIsSplit(false);
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
          card_id: selectedCardId || null,
          is_split: isSplit,
          split_details: splitInfo,
          is_paid: editingTransaction.is_paid
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
          card_id: selectedCardId || null,
          is_split: isSplit,
          split_details: splitInfo,
          is_paid: false
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

  const inputClasses = "w-full h-[40px] px-4 bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-lg outline-none text-xs font-semibold text-slate-800 placeholder:text-slate-300 transition-all flex items-center";
  const labelClasses = "text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1";

  return (
    <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-2xl border border-slate-50 w-full max-w-4xl mx-auto animate-in fade-in zoom-in duration-300 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h2>
        {onCancel && (
          <button onClick={onCancel} className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!editingTransaction && (
          <div className="flex p-1 bg-slate-100/60 rounded-xl max-w-sm">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategory(categories[t][0] || 'Outros'); }}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                {t === 'expense' ? 'DESPESA' : 'RECEITA'}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
              <label className={labelClasses}>Descrição</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClasses} placeholder="Ex: Mercado mensal" required />
            </div>
            <div className="lg:col-span-4">
              <label className={labelClasses}>Data da 1ª Parcela</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClasses} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClasses}>Valor {installmentMode === 'divide' ? 'Total' : 'Mensal'}</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClasses} placeholder="0,00" required />
            </div>
            <div>
              <label className={labelClasses}>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputClasses} appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_0.75rem_center] bg-no-repeat`}>
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Cartão</label>
              <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} className={`${inputClasses} appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_0.75rem_center] bg-no-repeat`}>
                <option value="">Dinheiro/Pix</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`${labelClasses} text-indigo-500`}>Parcelas</label>
              <input 
                type="number" 
                min="1" 
                max="99" 
                value={installments} 
                disabled={!!editingTransaction}
                onChange={e => setInstallments(parseInt(e.target.value) || 1)} 
                className={`${inputClasses} border-indigo-50 bg-indigo-50/20 font-bold text-indigo-700 disabled:opacity-50`} 
              />
            </div>
          </div>

          {!editingTransaction && installments > 1 && (
            <div className="flex flex-col lg:flex-row items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex p-1 bg-white rounded-lg border border-slate-100 w-full lg:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setInstallmentMode('divide')}
                  className={`px-4 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${installmentMode === 'divide' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                >
                  Dividir Total
                </button>
                <button
                  type="button"
                  onClick={() => setInstallmentMode('repeat')}
                  className={`px-4 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${installmentMode === 'repeat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                >
                  Provisionar (Repetir)
                </button>
              </div>
              
              {amount && (
                <div className="flex-1 flex justify-between items-center px-4 border-l border-slate-200 ml-0 lg:ml-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">
                    {installments}x de <span className="text-indigo-600 font-black">{formatCurrency(installmentMode === 'divide' ? parseFloat(amount) / installments : parseFloat(amount))}</span>
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Total: <span className="text-slate-600">{formatCurrency(installmentMode === 'divide' ? parseFloat(amount) : parseFloat(amount) * installments)}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {type === 'expense' && (
            <div className={`p-4 rounded-xl border transition-all duration-300 ${isSplit ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSplit ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                   </div>
                   <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Dividir Gasto</span>
                </div>
                <button type="button" onClick={() => setIsSplit(!isSplit)} className={`w-12 h-6 rounded-full transition-all relative ${isSplit ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isSplit ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              {isSplit && (
                <div className="mt-4 pt-4 border-t border-indigo-100/50 flex flex-col md:flex-row gap-4 animate-in fade-in">
                  <div className="flex-1">
                    <label className="text-[8px] font-bold text-indigo-400 uppercase mb-1 block ml-1">Pagante</label>
                    <select 
                      value={partnerName} 
                      onChange={e => setPartnerName(e.target.value)} 
                      className="w-full h-9 px-3 bg-white rounded-lg border-2 border-indigo-50 text-[10px] font-bold text-slate-800 outline-none"
                    >
                      {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[8px] font-bold text-indigo-400 uppercase mb-1 block ml-1">Parte dele(a)</label>
                    <input type="number" step="0.01" value={partnerPart} onChange={e => setPartnerPart(e.target.value)} placeholder="0,00" className="w-full h-9 px-3 bg-white rounded-lg border-2 border-indigo-50 text-[10px] font-black text-slate-800 outline-none" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={success || loading} 
            className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all text-white shadow-xl transform active:scale-[0.98] ${
              success ? 'bg-teal-500' : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
            }`}
          >
            {loading ? 'Processando...' : (success ? '✓ Lançamento Realizado' : (editingTransaction ? 'Salvar Alterações' : 'Confirmar Lançamento'))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
