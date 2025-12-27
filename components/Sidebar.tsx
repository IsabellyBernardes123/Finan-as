
import React from 'react';
import { User } from '../types';

export type ViewType = 'dashboard' | 'add-expense' | 'add-income' | 'reports' | 'categories' | 'cards' | 'payers' | 'payer-reports';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, currentUser, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Início', shortLabel: 'Início', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
    )},
    { id: 'add-expense', label: 'Despesas', shortLabel: 'Desp.', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 3-3 3 3"/><path d="M12 9v6"/></svg>
    ), color: 'text-rose-500' },
    { id: 'add-income', label: 'Receitas', shortLabel: 'Rec.', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 3 3 3-3"/><path d="M12 15V9"/></svg>
    ), color: 'text-teal-600' },
    { id: 'cards', label: 'Cartões', shortLabel: 'Cards', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
    ), color: 'text-indigo-600' },
    { id: 'reports', label: 'Extrato', shortLabel: 'Extr.', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
    )},
    { id: 'payer-reports', label: 'Extrato Pagantes', shortLabel: 'Pags.', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ), color: 'text-amber-500' },
  ];

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 hidden md:flex">
        <div className="p-8">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-[10px]">FP</span>
            FinancePro
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewType)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                currentView === item.id 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className={currentView === item.id ? 'text-indigo-600' : item.color || 'text-slate-400'}>
                {item.icon}
              </span>
              <span className="font-semibold text-xs">{item.label}</span>
            </button>
          ))}
          <div className="pt-4 pb-2">
            <p className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Configurações</p>
            <button
              onClick={() => onViewChange('categories')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                currentView === 'categories' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>
              <span className="font-semibold text-xs">Categorias</span>
            </button>
            <button
              onClick={() => onViewChange('payers')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mt-1 ${
                currentView === 'payers' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="font-semibold text-xs">Gerenciar Pagantes</span>
            </button>
          </div>
        </nav>

        <div className="px-6 mb-8 mt-auto">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
             <div className={`w-8 h-8 ${currentUser?.avatarColor || 'bg-slate-300'} rounded flex items-center justify-center text-white text-[10px] font-bold`}>
               {currentUser?.name.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
               <button onClick={onLogout} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700">Sair</button>
             </div>
          </div>
        </div>
      </aside>

      {/* Bottom Nav Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-2 py-3 md:hidden z-40 shadow-lg">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewType)}
            className={`flex flex-col items-center gap-1 flex-1 ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            {item.icon}
            <span className="text-[8px] font-black uppercase tracking-tighter">{item.shortLabel}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Sidebar;
