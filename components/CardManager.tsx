
import React, { useState } from 'react';
import { CreditCard, Transaction } from '../types';

interface CardManagerProps {
  cards: CreditCard[];
  transactions: Transaction[];
  onAdd: (card: Omit<CreditCard, 'id'>) => void;
  onDelete: (id: string) => void;
}

const CardManager: React.FC<CardManagerProps> = ({ cards, transactions, onAdd, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closing, setClosing] = useState(5);
  const [due, setDue] = useState(15);
  const [color, setColor] = useState('#4f46e5');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name, credit_limit: parseFloat(limit), closing_day: closing, due_day: due, color });
    setName(''); setLimit(''); setShowAdd(false);
  };

  const getCardBalance = (cardId: string) => {
    return transactions
      .filter(t => t.card_id === cardId)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Meus Cartões</h2>
          <p className="text-xs text-slate-400 font-medium">Gestão de limites e parcelamentos</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl transition-all active:scale-95">
          Adicionar Cartão
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map(card => {
          const balance = getCardBalance(card.id);
          const percent = Math.min(100, (balance / card.credit_limit) * 100);
          
          return (
            <div key={card.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: card.color }}>
                    {card.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{card.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Fecha dia {card.closing_day}</p>
                  </div>
                </div>
                <button onClick={() => onDelete(card.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5">
                    <span className="text-slate-400 uppercase tracking-tighter">Uso do Limite</span>
                    <span className="text-slate-900">R$ {balance.toLocaleString('pt-BR')} / R$ {card.credit_limit.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%`, backgroundColor: card.color }}></div>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <div className="flex-1 bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Vencimento</p>
                    <p className="text-xs font-bold text-slate-700">Dia {card.due_day}</p>
                  </div>
                  <div className="flex-1 bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Disponível</p>
                    <p className="text-xs font-bold text-teal-600">R$ {(card.credit_limit - balance).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Novo Cartão</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome do Cartão</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-100 font-medium text-slate-900" placeholder="Ex: Nubank" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Limite</label>
                  <input type="number" value={limit} onChange={e => setLimit(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900" placeholder="0,00" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cor</label>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-[52px] p-1 bg-slate-50 rounded-2xl outline-none cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dia Fechamento</label>
                  <input type="number" min="1" max="31" value={closing} onChange={e => setClosing(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dia Vencimento</label>
                  <input type="number" min="1" max="31" value={due} onChange={e => setDue(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardManager;
