
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
      const amountPerInstallment = inputValue / numInstallments;
      
      const pPartTotal = isSplit ? parseFloat(partnerPart) || inputValue / 2 : 0;
      const pPartPerMonth = pPartTotal / numInstallments;
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
        alert('Erro ao cadastrar lançamentos.');
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const inputClasses = "w-full h-[52px] px-5 bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-xl outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-300 transition-all flex items-center";
  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1 whitespace-nowrap overflow-hidden text-ellipsis";

  return (
    <div className="bg-white p-6 md:p-10 rounded-[28px] shadow-2xl border border-slate-50 w-full max-w-xl mx-auto animate-in fade-in zoom-in duration-300 overflow-y-auto max-h-[95vh] relative scrollbar-hide">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h2>
        {onCancel && (
          <button onClick={onCancel} className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!editingTransaction && (
          <div className="flex p-1 bg-slate-100/60 rounded-xl">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategory(categories[t][0] || 'Outros'); }}
                className={`flex-1 py-3.5 rounded-lg text-[11px] font-black tracking-[0.15em] transition-all uppercase ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
              >
                {t === 'expense' ? 'DESPESA' : 'RECEITA'}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className={labelClasses}>Descrição</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClasses} placeholder="Ex: Mercado" required />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className={labelClasses}>Valor Total</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClasses} placeholder="0,00" required />
            </div>
            <div>
              <label className={labelClasses}>Data da 1ª Parcela</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClasses} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div>
              <label className={labelClasses}>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputClasses} appearance-none pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_1rem_center] bg-no-repeat`}>
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Cartão (Opcional)</label>
              <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} className={`${inputClasses} appearance-none pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_1rem_center] bg-no-repeat`}>
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
                className={`${inputClasses} border-indigo-50 bg-indigo-50/20 focus:border-indigo-200 focus:bg-white text-indigo-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed`} 
              />
            </div>
          </div>

          {!editingTransaction && installments > 1 && amount && (
             <div className="px-5 py-3.5 bg-indigo-50/40 rounded-xl border border-dashed border-indigo-100 flex justify-between items-center animate-in fade-in slide-in-from-top-1">
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Plano Gerado:</p>
               <p className="text-sm font-bold text-indigo-600">{installments}x de {formatCurrency(parseFloat(amount) / installments)}</p>
             </div>
          )}

          {type === 'expense' && (
            <div className={`p-6 rounded-2xl border transition-all duration-300 ${isSplit ? 'bg-indigo-50/30 border-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${isSplit ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-200 text-slate-400'}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                   </div>
                   <span className="text-xs font-black text-slate-800 uppercase tracking-[0.1em]">Dividir Gasto</span>
                </div>
                <button type="button" onClick={() => setIsSplit(!isSplit)} className={`w-14 h-7 rounded-full transition-all relative ${isSplit ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${isSplit ? 'left-8' : 'left-1'}`}></div>
                </button>
              </div>

              {isSplit && (
                <div className="mt-6 pt-6 border-t border-indigo-100/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold text-indigo-400 uppercase mb-2 block ml-1">Pagante</label>
                      <select 
                        value={partnerName} 
                        onChange={e => setPartnerName(e.target.value)} 
                        className="w-full h-11 px-4 bg-white rounded-lg border-2 border-indigo-50 text-xs font-bold text-slate-800 outline-none focus:border-indigo-100"
                      >
                        {categories.payers?.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-indigo-400 uppercase mb-2 block ml-1">Parte dele(a)</label>
                      <input type="number" step="0.01" value={partnerPart} onChange={e => setPartnerPart(e.target.value)} placeholder="0,00" className="w-full h-11 px-4 bg-white rounded-lg border-2 border-indigo-50 text-xs font-black text-slate-800 outline-none focus:border-indigo-100" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={success || loading} 
          className={`w-full py-5 rounded-xl text-[12px] font-black uppercase tracking-[0.25em] transition-all text-white shadow-2xl transform active:scale-[0.97] mt-4 ${
            success ? 'bg-teal-500 shadow-teal-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 disabled:opacity-50'
          }`}
        >
          {loading ? 'Processando...' : (success ? '✓ Sucesso' : (editingTransaction ? 'Salvar Alterações' : 'Confirmar'))}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
