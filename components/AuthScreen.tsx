
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';
import Logo from './Logo';

interface AuthScreenProps {
  onSelectUser: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSelectUser }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const triggerResend = async (targetEmail: string) => {
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: { emailRedirectTo: window.location.origin }
      });
      if (resendError) throw resendError;
      setSuccessMsg('E-mail de confirmação enviado! Verifique sua caixa de entrada.');
      setCooldown(60);
    } catch (err: any) {
      setError('Erro ao tentar reenviar o e-mail de confirmação.');
    }
  };

  const createInitialProfile = async (uid: string, userName: string) => {
    // Categorias padrão para novos usuários
    const defaultCategories = {
      expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Cartão', 'Outros'],
      income: ['Salário', 'Freelance', 'Investimentos', 'Presentes', 'Outros'],
      payers: [userName.split(' ')[0]]
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: uid,
        name: userName,
        avatar_color: '#4f46e5',
        categories: defaultCategories,
        updated_at: new Date().toISOString()
      });
    
    return !profileError;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          }
        });
        
        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('already registered')) {
            await triggerResend(email);
            return;
          }
          throw signUpError;
        }
        
        if (data.user) {
          // Tenta criar o perfil mesmo antes da confirmação do e-mail (se o RLS permitir)
          // Em muitos casos de teste, isso ajuda a popular a tabela profiles
          await createInitialProfile(data.user.id, name);

          if (data.session) {
            onSelectUser({
              id: data.user.id,
              name: name,
              avatarColor: '#4f46e5'
            });
          } else {
            setSuccessMsg(`Cadastro realizado! O link de confirmação foi enviado para ${email}.`);
            setCooldown(30);
          }
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            setError('Seu e-mail ainda não foi confirmado.');
            await triggerResend(email);
            return;
          }
          throw signInError;
        }
        
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_color')
            .eq('id', data.user.id)
            .maybeSingle();

          // Se o login funcionou mas o perfil não existe, cria um agora
          if (!profile) {
            await createInitialProfile(data.user.id, data.user.email?.split('@')[0] || 'Usuário');
          }

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
        <Logo size="lg" className="justify-center mb-8" />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">FinancePro</h1>
        <p className="text-slate-400 font-medium text-sm">Controle financeiro inteligente.</p>
      </div>

      <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
        <h2 className="text-xl font-bold text-slate-900 mb-8 text-center">
          {isSignUp ? 'Criar sua Conta' : 'Acessar o Sistema'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Patrick Hernandes"
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
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl animate-in slide-in-from-top-2">
              <p className="text-[10px] text-rose-500 font-bold uppercase text-center leading-tight">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-5 bg-teal-50 border border-teal-100 rounded-2xl animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <p className="text-[10px] text-teal-700 font-bold uppercase leading-tight">{successMsg}</p>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processando...
                </span>
              ) : isSignUp ? 'Criar Conta' : 'Entrar'}
            </button>
            <button 
              type="button" 
              onClick={() => { setIsSignUp(!isSignUp); setSuccessMsg(''); setError(''); }} 
              className="w-full py-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors"
            >
              {isSignUp ? 'Já tenho conta, entrar' : 'Criar nova conta'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-12 text-center opacity-50">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          O e-mail de confirmação é enviado pelo Supabase.<br/>
          Se não chegar em 1 minuto, verifique seu Spam.
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
