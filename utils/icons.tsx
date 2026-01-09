
import React from 'react';
import { UserCategories } from '../types';

// Mapa de ícones disponíveis para escolha
export const AVAILABLE_ICONS: Record<string, (size: number) => React.ReactNode> = {
  food: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
  ),
  home: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  transport: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
  ),
  health: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
  ),
  leisure: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
  ),
  salary: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M7 15h.01"/><path d="M11 15h2"/></svg>
  ),
  invest: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  ),
  shopping: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
  ),
  education: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ),
  gift: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
  ),
  other: (size) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
  )
};

export const getCategoryStyles = (category: string, userCategories?: UserCategories) => {
  if (userCategories?.colors && userCategories.colors[category]) {
    const customColor = userCategories.colors[category];
    return { 
      bg: '', 
      text: '', 
      border: '', 
      customColor: customColor,
      isCustom: true
    };
  }

  const cat = category.toLowerCase();
  if (cat.includes('alimento') || cat.includes('comer') || cat.includes('restaurante') || cat.includes('mercado') || cat.includes('food')) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', isCustom: false };
  if (cat.includes('casa') || cat.includes('moradia') || cat.includes('aluguel') || cat.includes('luz') || cat.includes('água') || cat.includes('rent')) return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', isCustom: false };
  if (cat.includes('transporte') || cat.includes('carro') || cat.includes('uber') || cat.includes('combustível') || cat.includes('transport')) return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', isCustom: false };
  if (cat.includes('saúde') || cat.includes('médico') || cat.includes('farmácia') || cat.includes('health')) return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', isCustom: false };
  if (cat.includes('lazer') || cat.includes('diversão') || cat.includes('viagem') || cat.includes('entertainment')) return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', isCustom: false };
  if (cat.includes('salário') || cat.includes('pagamento') || cat.includes('salary') || cat.includes('freelance')) return { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', isCustom: false };
  if (cat.includes('invest') || cat.includes('bolsa') || cat.includes('investments')) return { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100', isCustom: false };
  if (cat.includes('cartão') || cat.includes('shopping') || cat.includes('compras')) return { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', isCustom: false };
  if (cat.includes('educação') || cat.includes('estudo') || cat.includes('curso')) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', isCustom: false };
  
  return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', isCustom: false };
};

export const getCategoryIcon = (category: string, size = 14, userCategories?: UserCategories) => {
  // 1. Verifica se o usuário escolheu um ícone específico para esta categoria
  if (userCategories?.icons && userCategories.icons[category]) {
    const iconKey = userCategories.icons[category];
    if (AVAILABLE_ICONS[iconKey]) {
      return AVAILABLE_ICONS[iconKey](size);
    }
  }

  // 2. Fallback para detecção automática por nome
  const cat = category.toLowerCase();
  if (cat.includes('alimento') || cat.includes('comer') || cat.includes('restaurante') || cat.includes('mercado') || cat.includes('food')) return AVAILABLE_ICONS.food(size);
  if (cat.includes('casa') || cat.includes('moradia') || cat.includes('aluguel') || cat.includes('luz') || cat.includes('água') || cat.includes('rent')) return AVAILABLE_ICONS.home(size);
  if (cat.includes('transporte') || cat.includes('carro') || cat.includes('uber') || cat.includes('combustível') || cat.includes('transport')) return AVAILABLE_ICONS.transport(size);
  if (cat.includes('saúde') || cat.includes('médico') || cat.includes('farmácia') || cat.includes('health')) return AVAILABLE_ICONS.health(size);
  if (cat.includes('lazer') || cat.includes('diversão') || cat.includes('viagem') || cat.includes('entertainment')) return AVAILABLE_ICONS.leisure(size);
  if (cat.includes('salário') || cat.includes('pagamento') || cat.includes('salary') || cat.includes('freelance')) return AVAILABLE_ICONS.salary(size);
  if (cat.includes('invest') || cat.includes('bolsa') || cat.includes('investments')) return AVAILABLE_ICONS.invest(size);
  if (cat.includes('cartão') || cat.includes('shopping') || cat.includes('compras')) return AVAILABLE_ICONS.shopping(size);
  if (cat.includes('educação') || cat.includes('estudo') || cat.includes('curso')) return AVAILABLE_ICONS.education(size);
  if (cat.includes('presente') || cat.includes('gift')) return AVAILABLE_ICONS.gift(size);
  
  return AVAILABLE_ICONS.other(size);
};
