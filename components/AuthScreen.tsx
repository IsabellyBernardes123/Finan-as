
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';

interface AuthScreenProps {
  onSelectUser: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSelectUser }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          onSelectUser({
            id: data.user.id,
            name: name,
            avatarColor: '#4f46e5'
          });
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        
        // Buscar nome do perfil após login usando maybeSingle()
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_color')
          .eq('id', data.user.id)
          .maybeSingle();

        if (data.user) {
          onSelectUser({
            id: data.user.id,
            name: profile?.name || data.user.email?.split('@')[0] || 'Usuário',
            avatarColor: profile?.avatar_color || '#4f46e5'
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-xl text-center mb-10">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-xl shadow-indigo-100">FP</div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">FinancePro Cloud</h1>
        <p className="text-slate-400 font-medium">Sincronize suas finanças em todos os seus dispositivos</p>
      </div>

      <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
        <h2 className="text-xl font-bold text-slate-900 mb-8 text-center">
          {isSignUp ? 'Criar Conta' : 'Acessar Conta'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Seu Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-900 outline-none border-2 border-transparent focus:bg-white focus:border-indigo-100 transition-all"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-900 outline-none border-2 border-transparent focus:bg-white focus:border-indigo-100 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-900 outline-none border-2 border-transparent focus:bg-white focus:border-indigo-100 transition-all"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
              <p className="text-[10px] text-rose-500 font-bold uppercase text-center leading-tight">{error}</p>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? 'Processando...' : isSignUp ? 'Criar Conta Grátis' : 'Entrar'}
            </button>
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="w-full py-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors"
            >
              {isSignUp ? 'Já tenho uma conta' : 'Não tenho conta ainda'}
            </button>
          </div>
        </form>
      </div>

      <p className="mt-16 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
        Segurança Bancária • Supabase Cloud
      </p>
    </div>
  );
};

export default AuthScreen;
