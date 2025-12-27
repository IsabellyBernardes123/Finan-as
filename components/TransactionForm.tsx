
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(initialType);
  const [category, setCategory] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isFixedValue, setIsFixedValue] = useState(false); // Nova flag para provisionamento em lote
  const [isSplit, setIsSplit] = useState(false);
  const [partnerPart, setPartnerPart] = useState('');
  const [partnerName, setPartnerName] = useState('Esposa');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setCategory(initialType === 'expense' ? 'Cartão' : categories[initialType][0] || '');
  }, [initialType, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) return;

    const inputValue = parseFloat(amount);
    const numInstallments = Math.max(1, installments);
    
    // Lógica: Se for Valor Fixo, o valor por mês é o inserido. Se não, divide o total.
    const amountPerInstallment = isFixedValue ? inputValue : (inputValue / numInstallments);
    
    // Divisão (Split)
    const pPartTotal = isSplit ? parseFloat(partnerPart) || inputValue / 2 : 0;
    const pPartPerMonth = isFixedValue ? pPartTotal : (pPartTotal / numInstallments);
    const uPartPerMonth = amountPerInstallment - pPartPerMonth;

    const [year, month, day] = date.split('-').map(Number);

    for (let i = 0; i < numInstallments; i++) {
      const targetDate = new Date(year, month - 1 + i, day);
      
      // Ajustar label para diferenciar parcelamento de recorrência
      const labelPrefix = isFixedValue ? '[REC] ' : '';
      const installmentLabel = numInstallments > 1 ? ` (${i + 1}/${numInstallments})` : '';
      
      const splitInfo: SplitDetails | undefined = isSplit ? {
        userPart: uPartPerMonth,
        partnerPart: pPartPerMonth,
        partnerName: partnerName
      } : undefined;

      onAdd({
        description: labelPrefix + description + installmentLabel,
        amount: amountPerInstallment,
        type,
        category: selectedCardId ? 'Cartão' : category || 'Outros',
        date: targetDate.toISOString(),
        card_id: selectedCardId || null,
        is_split: isSplit,
        split_details: splitInfo,
        is_paid: type === 'income' 
      });
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      if (onCancel) onCancel();
    }, 1000);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-lg mx-auto animate-in fade-in zoom-in duration-300 overflow-y-auto max-h-[95vh] mb-12 md:mb-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Novo Lançamento</h2>
        {onCancel && (
          <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
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
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-medium text-slate-900 placeholder:text-slate-300" placeholder="Ex: Aluguel ou Compra de Mercado" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Valor {isFixedValue ? '(por mês)' : 'Total'}</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300" placeholder="0,00" required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Data Base / Vencimento</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-bold text-slate-900" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-medium text-slate-900">
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cartão (Opcional)</label>
              <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none text-sm font-medium text-slate-900">
                <option value="">Nenhum (Dinheiro/Pix)</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Número de Meses</label>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase transition-colors ${!isFixedValue ? 'text-indigo-600' : 'text-slate-300'}`}>Dividir</span>
                <button 
                  type="button" 
                  onClick={() => setIsFixedValue(!isFixedValue)}
                  className={`w-8 h-4 rounded-full relative transition-colors ${isFixedValue ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isFixedValue ? 'left-4.5' : 'left-0.5'}`}></div>
                </button>
                <span className={`text-[9px] font-bold uppercase transition-colors ${isFixedValue ? 'text-indigo-600' : 'text-slate-300'}`}>Provisionar</span>
              </div>
            </div>
            <input type="number" min="1" max="60" value={installments} onChange={e => setInstallments(parseInt(e.target.value) || 1)} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl outline-none text-sm font-bold text-slate-900" />
            <p className="mt-2 text-[9px] text-slate-400 font-medium italic">
              {isFixedValue 
                ? `Isso gerará ${installments} lançamentos de R$ ${amount || '0'} cada um.` 
                : `Isso dividirá R$ ${amount || '0'} em ${installments} parcelas.`}
            </p>
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
          {success ? '✓ Sincronizado com Nuvem' : 'Confirmar Lançamento'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
