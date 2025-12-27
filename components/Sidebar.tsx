
import React from 'react';
import { User } from '../types';

export type ViewType = 'dashboard' | 'add-expense' | 'add-income' | 'reports' | 'categories' | 'cards';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, currentUser, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Início', shortLabel: 'Dashboard', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
    )},
    { id: 'add-expense', label: 'Despesas', shortLabel: 'Desp.', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 3-3 3 3"/><path d="M12 9v6"/></svg>
    ), color: 'text-rose-500' },
    { id: 'add-income', label: 'Receitas', shortLabel: 'Rec.', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 3 3 3-3"/><path d="M12 15V9"/></svg>
    ), color: 'text-teal-600' },
    { id: 'cards', label: 'Cartões', shortLabel: 'Cards', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
    ), color: 'text-indigo-600' },
    { id: 'reports', label: 'Extrato', shortLabel: 'Relat.', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
    )},
  ];

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 hidden md:flex">
        <div className="p-8">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-[10px]">FP</span>
            FinancePro
          </h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Patrimônio</p>
        </div>

        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
             <div className={`w-8 h-8 ${currentUser?.avatarColor || 'bg-slate-300'} rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
               {currentUser?.name.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
               <button onClick={onLogout} className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter hover:text-indigo-700">Sair da Conta</button>
             </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewType)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                currentView === item.id 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={currentView === item.id ? 'text-indigo-600' : item.color || 'text-slate-400'}>
                {item.icon}
              </span>
              <span className="font-semibold text-xs">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => onViewChange('categories')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              currentView === 'categories' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>
            </span>
            <span className="font-semibold text-xs">Categorias</span>
          </button>
        </nav>

        <div className="p-6 border-t border-slate-50">
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status da Nuvem</p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
              <p className="text-[10px] text-slate-500 font-semibold tracking-tight">Sincronizado</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around px-2 py-3 md:hidden z-40">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewType)}
            className={`flex flex-col items-center gap-1 transition-all ${
              currentView === item.id ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <span className={`${currentView === item.id ? 'bg-indigo-50 p-1.5 rounded-lg' : 'p-1.5'}`}>
              {item.icon}
            </span>
            <span className="text-[8px] font-black uppercase tracking-tighter">{item.shortLabel}</span>
          </button>
        ))}
        <button
          onClick={() => onViewChange('categories')}
          className={`flex flex-col items-center gap-1 transition-all ${
            currentView === 'categories' ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <span className={`${currentView === 'categories' ? 'bg-indigo-50 p-1.5 rounded-lg' : 'p-1.5'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>
          </span>
          <span className="text-[8px] font-black uppercase tracking-tighter">Categorias</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
