
import React, { useState } from 'react';
import { UserCategories } from '../types';

interface PayerManagerProps {
  categories: UserCategories;
  onAdd: (type: 'payers', name: string) => void;
  onDelete: (type: 'payers', name: string) => void;
}

const PayerManager: React.FC<PayerManagerProps> = ({ categories, onAdd, onDelete }) => {
  const [newName, setNewName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAdd('payers', newName.trim());
      setNewName('');
    }
  };

  return (
    <div className="max-w-2xl space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Gerenciar Pagantes</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pessoas com quem você divide contas</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="flex gap-3 mb-8">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do pagante (Ex: Isa, Mãe, João...)"
            className="flex-1 px-4 py-3 bg-slate-50 border-transparent border-2 rounded-lg text-sm outline-none focus:bg-white focus:border-indigo-100 transition-all font-medium text-slate-900"
          />
          <button 
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg"
          >
            Cadastrar
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.payers?.map((payer) => (
            <div key={payer} className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50/50 hover:bg-slate-50 border border-transparent hover:border-indigo-50 group transition-all">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600">
                  {payer.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-700">{payer}</span>
              </div>
              <button 
                onClick={() => onDelete('payers', payer)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ))}
          {(!categories.payers || categories.payers.length === 0) && (
            <p className="col-span-2 text-center py-10 text-xs text-slate-300 font-medium italic">Nenhum pagante cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayerManager;
