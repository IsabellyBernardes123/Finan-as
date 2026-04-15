
import React, { useState } from 'react';
import { User } from '../types';
import Logo from './Logo';

export type ViewType = 'dashboard' | 'add-expense' | 'add-income' | 'reports' | 'categories' | 'cards' | 'accounts' | 'payers' | 'payer-reports';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onAddClick: () => void; 
  currentUser: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onAddClick, currentUser, onLogout }) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Itens para o Desktop (Restaurado Despesas e Receitas)
  const desktopItems = [
    { id: 'dashboard', label: 'Início', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    )},
    { id: 'reports', label: 'Extrato', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
    )},
    { id: 'add-expense', label: 'Despesas', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
    )},
    { id: 'add-income', label: 'Receitas', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m23 18-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg>
    )},
    { id: 'accounts', label: 'Minhas Contas', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8H7v8"/></svg>
    )},
    { id: 'payer-reports', label: 'Acerto de Contas', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )},
  ];

  // Itens da Doca Mobile Lado Esquerdo
  const mobileLeft = [
    { id: 'dashboard', label: 'Início', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    )},
    { id: 'add-expense', label: 'Despesas', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
    )},
  ];

  // Itens da Doca Mobile Lado Direito
  const mobileRight = [
    { id: 'add-income', label: 'Receitas', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m23 18-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg>
    )},
    { id: 'reports', label: 'Extrato', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
    )},
  ];

  const sidebarBtnClasses = (id: string) => `w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
    currentView === id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
  }`;

  const handleMobileNav = (view: ViewType) => {
    onViewChange(view);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 hidden md:flex">
        <div className="p-8">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {desktopItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewType)}
              className={sidebarBtnClasses(item.id)}
            >
              <span className={currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}>
                {item.icon}
              </span>
              <span className="font-semibold text-[11px] uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Configurações</p>
            <button onClick={() => onViewChange('categories')} className={sidebarBtnClasses('categories')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>
              <span className="font-semibold text-[11px] uppercase tracking-wide">Categorias</span>
            </button>
            <button onClick={() => onViewChange('payers')} className={sidebarBtnClasses('payers')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="font-semibold text-[11px] uppercase tracking-wide">Pagantes</span>
            </button>
            <button onClick={() => onViewChange('cards')} className={sidebarBtnClasses('cards')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              <span className="font-semibold text-[11px] uppercase tracking-wide">Cartões</span>
            </button>
          </div>
        </nav>

        <div className="px-6 mb-8 mt-auto">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
             <div className={`w-8 h-8 ${currentUser?.avatarColor || 'bg-slate-300'} rounded-md flex items-center justify-center text-white text-[10px] font-bold`}>
               {currentUser?.name.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-[10px] font-bold text-slate-900 truncate uppercase tracking-tighter">{currentUser?.name}</p>
               <button onClick={onLogout} className="text-[8px] font-black text-indigo-500 hover:text-indigo-700 uppercase">Sair</button>
             </div>
          </div>
        </div>
      </aside>

      {/* Mobile Floating Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[98%] max-w-md z-[100] md:hidden">
        {isMoreMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-4 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
             <div className="grid grid-cols-4 gap-4">
                {[
                  { id: 'accounts', label: 'Contas', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8H7v8"/></svg> },
                  { id: 'payer-reports', label: 'Acertos', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
                  { id: 'categories', label: 'Categorias', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m16 6 4 14"/><path d="M12 6v14"/></svg> },
                  { id: 'cards', label: 'Cartões', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/></svg> },
                ].map(item => (
                  <button key={item.id} onClick={() => handleMobileNav(item.id as ViewType)} className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                      {item.icon}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">{item.label}</span>
                  </button>
                ))}
                <button onClick={onLogout} className="flex flex-col items-center gap-2 p-2">
                   <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                   </div>
                   <span className="text-[8px] font-black uppercase tracking-tighter text-rose-400">Sair</span>
                </button>
             </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-2xl flex items-center justify-between px-1 py-2">
          {mobileLeft.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMobileNav(item.id as ViewType)}
              className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              <div className="h-5 flex items-center justify-center">{item.icon}</div>
              <span className="text-[7px] font-black uppercase tracking-tighter mt-1">{item.label}</span>
            </button>
          ))}

          <div className="relative -top-4 px-1">
             <button 
              onClick={onAddClick}
              className="w-14 h-14 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center text-white active:scale-90 transition-transform border-4 border-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>

          {mobileRight.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMobileNav(item.id as ViewType)}
              className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              <div className="h-5 flex items-center justify-center">{item.icon}</div>
              <span className="text-[7px] font-black uppercase tracking-tighter mt-1">{item.label}</span>
            </button>
          ))}

          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex flex-col items-center justify-center flex-1 transition-all ${isMoreMenuOpen ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <div className="h-5 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </div>
            <span className="text-[7px] font-black uppercase tracking-tighter mt-1">Mais</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
