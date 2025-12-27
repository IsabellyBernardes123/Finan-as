
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction } from '../types';
import { COLORS } from '../constants';

interface ChartsProps {
  transactions: Transaction[];
}

const Charts: React.FC<ChartsProps> = ({ transactions }) => {
  const expenseData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any[], t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
      return acc;
    }, []);

  const COLORS_LIST = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#94a3b8'];

  if (transactions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
        <h3 className="text-sm font-bold mb-4 text-slate-800 tracking-tight">Gastos por Categoria</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={expenseData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={85}
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
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
        <h3 className="text-sm font-bold mb-4 text-slate-800 tracking-tight">Fluxo de Caixa Recente</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={transactions.slice(0, 6).reverse()}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="description" hide />
            <YAxis hide />
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            />
            <Bar dataKey="amount" radius={[4, 4, 4, 4]} barSize={32}>
              {transactions.slice(0, 6).reverse().map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.type === 'income' ? COLORS.income : COLORS.expense} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Charts;
