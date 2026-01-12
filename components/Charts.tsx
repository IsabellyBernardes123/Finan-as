
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction, UserCategories } from '../types';
import { getCategoryIcon, getCategoryStyles } from '../utils/icons';

interface ChartsProps {
  transactions: Transaction[];
  categories: UserCategories;
}

const Charts: React.FC<ChartsProps> = ({ transactions, categories }) => {
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  const expenseData = expenseTransactions.reduce((acc: any[], t) => {
    const existing = acc.find(item => item.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: t.category, value: t.amount });
    }
    return acc;
  }, []);

  // Top 3 Maiores Gastos - Removida a rolagem e focado nos principais
  const topExpenses = [...expenseTransactions]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const COLORS_LIST = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#94a3b8'];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (transactions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Gráfico de Pizza - Gastos por Categoria */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 flex flex-col">
        <h3 className="text-[10px] font-black mb-4 text-slate-400 uppercase tracking-widest">Gastos por Categoria</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_LIST[index % COLORS_LIST.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
              />
              <Legend 
                verticalAlign="bottom" 
                align="center"
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter ml-1">
                    {value}
                  </span>
                )}
                wrapperStyle={{ paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Maiores Despesas do Período - Agora fixo em 3 itens sem scroll */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 flex flex-col">
        <h3 className="text-[10px] font-black mb-5 text-slate-400 uppercase tracking-widest">Top 3 Despesas do Período</h3>
        <div className="flex-1 flex flex-col justify-center space-y-4">
          {topExpenses.map((t) => {
            const styles = getCategoryStyles(t.category, categories);
            const inlineStyles = styles.isCustom ? {
              backgroundColor: `${styles.customColor}15`,
              color: styles.customColor,
              borderColor: `${styles.customColor}20`
            } : {};

            return (
              <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 transition-all group">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${!styles.isCustom ? `${styles.bg} ${styles.text} ${styles.border}` : ''}`}
                    style={inlineStyles}
                  >
                    {getCategoryIcon(t.category, 20, categories)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate leading-none mb-1.5">{t.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t.category}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-rose-500">{formatCurrency(t.amount)}</p>
                  <p className="text-[9px] font-bold text-slate-300 uppercase">{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                </div>
              </div>
            );
          })}
          {topExpenses.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Nenhuma despesa para exibir</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Charts;
