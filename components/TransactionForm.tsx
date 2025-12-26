
import React, { useState, useEffect } from 'react';
import { TransactionType, UserCategories, CreditCard, SplitDetails } from '../types';

interface TransactionFormProps {
  onAdd: (data: any) => void;
  categories: UserCategories;
  cards: CreditCard[];
  onCancel?: () => void;
  initialType?: TransactionType;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, categories, cards, onCancel, initialType = 'expense' }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(initialType);
  const [category, setCategory] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isSplit, setIsSplit] = useState(false);
  const [partnerPart, setPartnerPart] = useState('');
  const [partnerName, setPartnerName] = useState('Esposa');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setCategory(initialType === 'expense' ? 'Cartão' : categories[initialType][0] || '');
  }, [initialType, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const totalAmount = parseFloat(amount);
    const pPart = isSplit ? parseFloat(partnerPart) || totalAmount / 2 : 0;
    const uPart = totalAmount - pPart;
    const numInstallments = installments;
    const amountPerInstallment = totalAmount / numInstallments;

    for (let i = 0; i < numInstallments; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      
      const installmentLabel = numInstallments > 1 ? ` (${i + 1}/${numInstallments})` : '';
      
      const splitInfo: SplitDetails | undefined = isSplit ? {
        userPart: uPart / numInstallments,
        partnerPart: pPart / numInstallments,
        partnerName: partnerName
      } : undefined;

      onAdd({
        description: description + installmentLabel,
        amount: amountPerInstallment,
        type,
        category: selectedCardId ? 'Cartão' : category || 'Outros',
        date: date.toISOString(),
        card_id: selectedCardId || null,
        is_split: isSplit,
        split_details: splitInfo
      });
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      if (onCancel) onCancel();
    }, 1000);
  };

  return (
    <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-lg mx-auto animate-in fade-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Novo Lançamento</h2>
        {onCancel && (
          <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategory(t === 'expense' ? 'Cartão' : categories[t][0]); }}
              className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              {t === 'expense' ? 'DESPESA' : 'RECEITA'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Descrição</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-medium text-slate-900 placeholder:text-slate-300" placeholder="Ex: Compra na Amazon" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Valor Total</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300" placeholder="0,00" required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cartão (Opcional)</label>
              <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-medium text-slate-900">
                <option value="">Nenhum (Dinheiro/Pix)</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-medium text-slate-900">
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Parcelas</label>
              <input type="number" min="1" value={installments} onChange={e => setInstallments(parseInt(e.target.value) || 1)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-bold text-slate-900" />
            </div>
          </div>

          {type === 'expense' && (
            <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">Dividir Gasto</span>
                </div>
                <button type="button" onClick={() => setIsSplit(!isSplit)} className={`w-10 h-5 rounded-full transition-colors relative ${isSplit ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isSplit ? 'left-6' : 'left-1'}`}></div>
                </button>
              </div>

              {isSplit && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">Nome do Pagante</label>
                      <input type="text" value={partnerName} onChange={e => setPartnerName(e.target.value)} className="w-full px-3 py-2 bg-white rounded-xl border border-indigo-100 text-xs font-semibold text-slate-900" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">Parte do Pagante</label>
                      <input type="number" value={partnerPart} onChange={e => setPartnerPart(e.target.value)} placeholder="0,00" className="w-full px-3 py-2 bg-white rounded-xl border border-indigo-100 text-xs font-bold text-slate-900" />
                    </div>
                  </div>
                  <div className="text-[10px] text-indigo-600 font-medium italic text-center">
                    Sua parte: R$ {(parseFloat(amount || '0') - parseFloat(partnerPart || '0')).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button type="submit" disabled={success} className={`w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all text-white shadow-lg ${success ? 'bg-teal-500 shadow-teal-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}>
          {success ? '✓ Salvo' : 'Confirmar Lançamento'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
