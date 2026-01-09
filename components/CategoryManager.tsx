
import React, { useState } from 'react';
import { UserCategories } from '../types';
import { getCategoryIcon, getCategoryStyles, AVAILABLE_ICONS } from '../utils/icons';

interface CategoryManagerProps {
  categories: UserCategories;
  onAdd: (type: 'income' | 'expense', name: string, color?: string, icon?: string) => void;
  onUpdate: (type: 'income' | 'expense', oldName: string, newName: string, newColor: string, newIcon: string) => void;
  onDelete: (type: 'income' | 'expense', name: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onAdd, onUpdate, onDelete }) => {
  const [newCat, setNewCat] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [newIcon, setNewIcon] = useState('other');
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  
  // Estado para edição
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCat.trim()) {
      onAdd(activeType, newCat.trim(), newColor, newIcon);
      setNewCat('');
      setNewIcon('other');
    }
  };

  const startEditing = (name: string) => {
    setEditingCatName(name);
    setEditValue(name);
    const styles = getCategoryStyles(name, categories);
    setEditColor(styles.isCustom ? styles.customColor! : '#64748b');
    setEditIcon(categories.icons?.[name] || 'other');
  };

  const handleUpdate = () => {
    if (editingCatName && editValue.trim()) {
      onUpdate(activeType, editingCatName, editValue.trim(), editColor, editIcon);
      setEditingCatName(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Suas Categorias</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Personalize seus lançamentos</p>
          </div>
          <div className="bg-indigo-50 px-3 py-1.5 rounded-full hidden sm:block">
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Sincronizado no Perfil</span>
          </div>
        </div>
        
        <div className="flex gap-2 p-1.5 bg-slate-50 rounded-lg mb-8 border border-slate-100">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                activeType === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
              }`}
            >
              {t === 'expense' ? 'DESPESAS' : 'RECEITAS'}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd} className="space-y-4 mb-10 pb-10 border-b border-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Nome</label>
              <input
                type="text"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="Ex: Assinaturas, Aluguel..."
                className="w-full px-4 py-3 bg-slate-50 border-transparent border-2 rounded-lg text-sm outline-none focus:bg-white focus:border-indigo-100 transition-all font-medium text-slate-900 placeholder:text-slate-300"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Cor</label>
              <input 
                type="color" 
                value={newColor} 
                onChange={e => setNewColor(e.target.value)} 
                className="w-full h-[48px] p-1 bg-slate-50 border-transparent border-2 rounded-lg cursor-pointer outline-none focus:border-indigo-100" 
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Ícone</label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              {Object.keys(AVAILABLE_ICONS).map(iconKey => (
                <button
                  key={iconKey}
                  type="button"
                  onClick={() => setNewIcon(iconKey)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${newIcon === iconKey ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-110 z-10' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}
                >
                  {AVAILABLE_ICONS[iconKey](18)}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
          >
            Adicionar Categoria
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories[activeType].map((cat) => {
            const styles = getCategoryStyles(cat, categories);
            const isEditing = editingCatName === cat;
            
            const currentItemStyles = styles.isCustom ? {
               backgroundColor: `${styles.customColor}15`,
               color: styles.customColor,
               borderColor: `${styles.customColor}30`
            } : {};

            if (isEditing) {
              return (
                <div key={cat} className="flex flex-col gap-4 p-4 bg-indigo-50/20 rounded-xl border border-indigo-100 animate-in fade-in duration-200 col-span-1 sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      value={editValue} 
                      onChange={e => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs font-bold text-slate-700 outline-none"
                    />
                    <input 
                      type="color" 
                      value={editColor} 
                      onChange={e => setEditColor(e.target.value)}
                      className="w-full h-[36px] p-0.5 bg-white border border-indigo-100 rounded-lg cursor-pointer"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white/50 rounded-lg border border-indigo-50">
                    {Object.keys(AVAILABLE_ICONS).map(iconKey => (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setEditIcon(iconKey)}
                        className={`w-8 h-8 rounded-md flex items-center justify-center border transition-all ${editIcon === iconKey ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-200'}`}
                      >
                        {AVAILABLE_ICONS[iconKey](14)}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setEditingCatName(null)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Cancelar</button>
                    <button onClick={handleUpdate} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Salvar Alterações</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={cat} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-transparent hover:border-indigo-50 group transition-all">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${!styles.isCustom ? `${styles.bg} ${styles.text} ${styles.border}` : ''}`}
                    style={currentItemStyles}
                  >
                    {getCategoryIcon(cat, 18, categories)}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{cat}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => startEditing(cat)}
                    className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <button 
                    onClick={() => onDelete(activeType, cat)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
          {categories[activeType].length === 0 && (
            <p className="col-span-1 sm:col-span-2 text-center py-10 text-[10px] text-slate-300 font-black uppercase tracking-widest italic">Nenhuma categoria cadastrada.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
