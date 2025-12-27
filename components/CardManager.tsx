
import React, { useState, useMemo } from 'react';
import { CreditCard, Transaction } from '../types';

interface CardManagerProps {
  cards: CreditCard[];
  transactions: Transaction[];
  onAdd: (card: Omit<CreditCard, 'id'>) => void;
  onDelete: (id: string) => void;
}

const CardManager: React.FC<CardManagerProps> = ({ cards, transactions, onAdd, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
  // Estados para o Filtro de Datas
  const getInitialDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { firstDay, lastDay };
  };

  const { firstDay: initStart, lastDay: initEnd } = getInitialDates();
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate] = useState(initEnd);

  // Estados para o formulário de novo cartão
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

  const resetFilters = () => {
    const { firstDay, lastDay } = getInitialDates();
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Funções de auxílio para cálculo de estatísticas por cartão no período
  const cardDataMap = useMemo(() => {
    const map = new Map();

    cards.forEach(card => {
      const cardTrans = transactions
        .filter(t => {
          if (t.card_id !== card.id) return false;
          const tDate = t.date.split('T')[0];
          return tDate >= startDate && tDate <= endDate;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const stats = cardTrans.reduce((acc, t) => {
        acc.total += Number(t.amount);
        if (t.is_split && t.split_details) {
          acc.userPart += Number(t.split_details.userPart);
          acc.partnerPart += Number(t.split_details.partnerPart);
          acc.partnerName = t.split_details.partnerName;
        } else {
          acc.userPart += Number(t.amount);
        }
        return acc;
      }, { total: 0, userPart: 0, partnerPart: 0, partnerName: 'Parceiro' });

      map.set(card.id, { transactions: cardTrans, stats });
    });

    return map;
  }, [cards, transactions, startDate, endDate]);

  return (
    <div className="max-w-4xl space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Meus Cartões</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestão de limites e faturas por período</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl transition-all active:scale-95">
          Novo Cartão
        </button>
      </div>

      {/* Filtro de Datas para os Cartões */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex flex-col flex-1 sm:flex-none">
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1 tracking-tighter">Período Início</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ colorScheme: 'light' }}
              className="bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100 min-w-[130px]"
            />
          </div>
          <div className="flex flex-col flex-1 sm:flex-none">
            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 ml-1 tracking-tighter">Período Fim</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ colorScheme: 'light' }}
              className="bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100 min-w-[130px]"
            />
          </div>
        </div>
        <div className="flex-1 text-center md:text-left">
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Exibindo faturas do período</p>
        </div>
        <button 
          onClick={resetFilters}
          className="text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors px-3 py-2 border border-slate-100 rounded-lg"
        >
          Mês Atual
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {cards.map(card => {
          const { transactions: cardTrans, stats } = cardDataMap.get(card.id) || { transactions: [], stats: { total: 0, userPart: 0, partnerPart: 0, partnerName: 'Parceiro' } };
          const percent = Math.min(100, (stats.total / card.credit_limit) * 100);
          const isExpanded = expandedCardId === card.id;
          
          return (
            <div key={card.id} className="space-y-4">
              {/* Card Header */}
              <div 
                onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                className={`bg-white p-6 rounded-xl border transition-all cursor-pointer hover:shadow-md ${isExpanded ? 'border-indigo-200 ring-2 ring-indigo-50 shadow-sm' : 'border-slate-100 shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-lg" style={{ backgroundColor: card.color }}>
                      {card.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{card.name}</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Fecha dia {card.closing_day} • Vencimento dia {card.due_day}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} 
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                    </button>
                    <div className={`transition-transform duration-300 text-slate-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-1.5">
                      <span className="text-slate-400 uppercase tracking-tighter">Uso no Período</span>
                      <span className="text-slate-900">R$ {stats.total.toLocaleString('pt-BR')} / R$ {card.credit_limit.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%`, backgroundColor: card.color }}></div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <div className="flex-1 bg-slate-50/50 p-3 rounded-lg border border-slate-50">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Subtotal Fatura</p>
                      <p className="text-xs font-bold text-slate-700">{formatCurrency(stats.total)}</p>
                    </div>
                    <div className="flex-1 bg-slate-50/50 p-3 rounded-lg border border-slate-50">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Limite Restante</p>
                      <p className="text-xs font-bold text-teal-600">{formatCurrency(Math.max(0, card.credit_limit - stats.total))}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Transactions Details */}
              {isExpanded && (
                <div className="bg-white border border-slate-100 rounded-xl shadow-inner p-4 md:p-6 animate-in slide-in-from-top-4 duration-300 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos do Período</h4>
                    <div className="flex gap-6">
                      <div className="text-right">
                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Sua Parte</p>
                        <p className="text-xs font-bold text-slate-900">{formatCurrency(stats.userPart)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-bold text-indigo-400 uppercase mb-0.5">Parte {stats.partnerName}</p>
                        <p className="text-xs font-bold text-indigo-600">{formatCurrency(stats.partnerPart)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {cardTrans.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-50 p-2 rounded text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate">{t.description}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{t.category}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-slate-900">{formatCurrency(t.amount)}</p>
                          {t.is_split && t.split_details && (
                            <p className="text-[8px] font-bold text-indigo-500 uppercase">Dividido: {formatCurrency(t.split_details.partnerPart)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {cardTrans.length === 0 && (
                      <div className="py-8 text-center">
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">Nenhum lançamento no período selecionado</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {cards.length === 0 && (
          <div className="py-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-100">
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">Nenhum cartão cadastrado</p>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-6">Novo Cartão</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome do Cartão</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-medium text-slate-900" placeholder="Ex: Nubank" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Limite</label>
                  <input type="number" value={limit} onChange={e => setLimit(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900" placeholder="0,00" required />
                </div>
                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cor</label>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-[52px] p-1 bg-slate-50 rounded-xl outline-none cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dia Fechamento</label>
                  <input type="number" min="1" max="31" value={closing} onChange={e => setClosing(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dia Vencimento</label>
                  <input type="number" min="1" max="31" value={due} onChange={e => setDue(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900" />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardManager;
