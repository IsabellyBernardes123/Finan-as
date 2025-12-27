
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
  
  // Estados para o Filtro de Datas (afeta apenas a listagem e o resumo do período)
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

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Mapeamento de dados dos cartões com lógica global de limite
  const cardDataMap = useMemo(() => {
    const map = new Map();

    cards.forEach(card => {
      // 1. Transações do Período (para a lista expandida)
      const transactionsInPeriod = transactions
        .filter(t => {
          if (t.card_id !== card.id) return false;
          const tDate = t.date.split('T')[0];
          return tDate >= startDate && tDate <= endDate;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 2. Estatísticas do Período
      const periodStats = transactionsInPeriod.reduce((acc, t) => {
        const amt = Number(t.amount);
        acc.total += amt;
        if (t.is_split && t.split_details) {
          acc.userPart += Number(t.split_details.userPart);
          const pName = t.split_details.partnerName || 'Outros';
          acc.others[pName] = (acc.others[pName] || 0) + Number(t.split_details.partnerPart);
        } else {
          acc.userPart += amt;
        }
        return acc;
      }, { total: 0, userPart: 0, others: {} as Record<string, number> });

      // 3. DÍVIDA GLOBAL (O que ocupa o limite): Todas as despesas NÃO PAGAS, de qualquer data
      const totalDebt = transactions
        .filter(t => t.card_id === card.id && t.type === 'expense' && !t.is_paid)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      map.set(card.id, { 
        transactionsInPeriod, 
        periodStats, 
        totalDebt 
      });
    });

    return map;
  }, [cards, transactions, startDate, endDate]);

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cartões de Crédito</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Limite ocupado apenas por contas pendentes</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex bg-slate-50 p-1 rounded-xl items-center border border-slate-100">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none px-3 py-1.5 text-xs font-bold text-indigo-600 outline-none w-[120px]"
            />
            <span className="text-slate-300 text-xs px-1">→</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none px-3 py-1.5 text-xs font-bold text-indigo-600 outline-none w-[120px]"
            />
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95">
            Novo Cartão
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {cards.map(card => {
          const { transactionsInPeriod, periodStats, totalDebt } = cardDataMap.get(card.id) || { transactionsInPeriod: [], periodStats: { total: 0, userPart: 0, others: {} }, totalDebt: 0 };
          
          // Porcentagem baseada na dívida total pendente (não no período)
          const percentUsed = Math.min(100, (totalDebt / card.credit_limit) * 100);
          const availableLimit = Math.max(0, card.credit_limit - totalDebt);
          const isExpanded = expandedCardId === card.id;
          
          return (
            <div key={card.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm transition-all hover:border-indigo-100">
              {/* Row Principal do Cartão */}
              <div 
                onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                className={`flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/20' : 'hover:bg-slate-50/40'}`}
              >
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm" style={{ backgroundColor: card.color }}>
                    {card.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-none mb-1">{card.name}</h3>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">F: {card.closing_day} • V: {card.due_day}</p>
                  </div>
                </div>

                {/* Barra de Limite Global */}
                <div className="flex-1 flex flex-col justify-center px-0 md:px-4">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-700" style={{ width: `${percentUsed}%`, backgroundColor: card.color }}></div>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{percentUsed.toFixed(0)}% do limite ocupado</span>
                    <span className="text-[9px] font-bold text-slate-900">Total: {formatCurrency(card.credit_limit)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 md:min-w-[320px] justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5 tracking-widest">Total no Período</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(periodStats.total)}</p>
                  </div>
                  <div className="text-right border-l border-slate-100 pl-4">
                    <p className="text-[8px] font-bold text-indigo-500 uppercase mb-0.5 tracking-widest">Disponível Real</p>
                    <p className="text-sm font-black text-teal-600">{formatCurrency(availableLimit)}</p>
                  </div>
                  <div className={`transition-transform duration-300 text-slate-300 ml-2 hidden md:block ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>

              {/* Expansão com Detalhes do Período */}
              {isExpanded && (
                <div className="border-t border-slate-50 bg-slate-50/30 p-4 md:p-6 animate-in slide-in-from-top-1 duration-200">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
                    <div className="flex flex-wrap gap-4">
                      <div className="bg-white px-4 py-2 rounded-lg border border-slate-100">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dívida Pendente Global</p>
                        <p className="text-xs font-bold text-rose-500">{formatCurrency(totalDebt)}</p>
                      </div>
                      <div className="bg-white px-4 py-2 rounded-lg border border-slate-100">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Sua Parte (No Período)</p>
                        <p className="text-xs font-bold text-slate-900">{formatCurrency(periodStats.userPart)}</p>
                      </div>
                      {Object.entries(periodStats.others).map(([name, value]) => (
                        <div key={name} className="bg-white px-4 py-2 rounded-lg border border-indigo-100">
                          <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Parte {name} (No Período)</p>
                          <p className="text-xs font-bold text-indigo-600">{formatCurrency(value as number)}</p>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                      className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 text-[10px] font-bold uppercase transition-colors px-3 py-1.5 rounded-lg border border-rose-50 hover:bg-rose-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                      Excluir Cartão
                    </button>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
                    <div className="px-4 py-2 bg-slate-50/50">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lançamentos no Período Selecionado</p>
                    </div>
                    {transactionsInPeriod.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-3 px-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className={`w-2 h-2 rounded-full ${t.is_paid ? 'bg-teal-500' : 'bg-amber-400'}`}></span>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                            {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <div>
                            <p className={`text-xs font-bold text-slate-800 leading-none mb-1 ${t.is_paid ? 'text-slate-400 line-through' : ''}`}>
                              {t.description}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{t.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-bold ${t.is_paid ? 'text-slate-400' : 'text-slate-900'}`}>{formatCurrency(t.amount)}</p>
                          {t.is_split && t.split_details && (
                            <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">
                              {t.split_details.partnerName}: {formatCurrency(t.split_details.partnerPart)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {transactionsInPeriod.length === 0 && (
                      <div className="py-10 text-center italic text-slate-300 text-[10px] font-bold uppercase">Nenhum gasto neste período</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {cards.length === 0 && (
          <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Nenhum cartão cadastrado</p>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Novo Cartão</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Identificação</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-medium text-slate-900 text-sm" placeholder="Ex: Nubank" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Limite Total</label>
                  <input type="number" value={limit} onChange={e => setLimit(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900 text-sm" placeholder="0,00" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Cor</label>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-[48px] p-1 bg-slate-50 rounded-xl outline-none cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Fechamento (dia)</label>
                  <input type="number" min="1" max="31" value={closing} onChange={e => setClosing(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 ml-1">Vencimento (dia)</label>
                  <input type="number" min="1" max="31" value={due} onChange={e => setDue(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-900 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Salvar Cartão</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardManager;
