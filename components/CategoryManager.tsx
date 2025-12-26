
import React, { useState } from 'react';
import { UserCategories } from '../types';

interface CategoryManagerProps {
  categories: UserCategories;
  onAdd: (type: 'income' | 'expense', name: string) => void;
  onDelete: (type: 'income' | 'expense', name: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onAdd, onDelete }) => {
  const [newCat, setNewCat] = useState('');
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCat.trim()) {
      onAdd(activeType, newCat.trim());
      setNewCat('');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Suas Categorias</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Personalize seus lançamentos</p>
          </div>
          <div className="bg-indigo-50 px-3 py-1.5 rounded-full">
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Sincronizado no Perfil</span>
          </div>
        </div>
        
        <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeType === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
              }`}
            >
              {t === 'expense' ? 'DESPESAS' : 'RECEITAS'}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex gap-3 mb-8">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Ex: Assinaturas, Aluguel..."
            className="flex-1 px-4 py-3 bg-slate-50 border-transparent border-2 rounded-2xl text-sm outline-none focus:bg-white focus:border-indigo-100 transition-all font-medium text-slate-900 placeholder:text-slate-300"
          />
          <button 
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Adicionar
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories[activeType].map((cat) => (
            <div key={cat} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-transparent hover:border-indigo-50 group transition-all">
              <span className="text-xs font-semibold text-slate-700">{cat}</span>
              <button 
                onClick={() => onDelete(activeType, cat)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ))}
          {categories[activeType].length === 0 && (
            <p className="col-span-2 text-center py-10 text-xs text-slate-300 font-medium italic">Nenhuma categoria personalizada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
