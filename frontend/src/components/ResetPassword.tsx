import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import api from '../services/api';

export const ResetPassword: React.FC<{ token: string }> = ({ token }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visibleField, setVisibleField] = useState<'password' | 'confirmation' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) return setError('Las contraseñas no coinciden.');
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setSuccess(res.data.message);
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-blue-500 via-brand-600 to-purple-700 dark:from-slate-900 dark:via-brand-950 dark:to-purple-950">
    <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800/30 p-8">
      <div className="text-center mb-8">
        <div className="inline-flex p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-2xl mb-4 shadow-lg shadow-brand-500/30"><img src="/brand/finanzas-logo.png" alt="Logo de Finanzas" className="w-14 h-14 object-contain" /></div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">Nueva contraseña</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Elige una contraseña segura para tu cuenta.</p>
      </div>
      {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm rounded-xl">{error}</div>}
      {success ? <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl">{success}<a href="/" className="block mt-3 font-bold underline">Ir a iniciar sesión</a></div> : <form onSubmit={submit} className="space-y-5">
        {['Nueva contraseña', 'Repite la contraseña'].map((label, index) => {
          const field = index === 0 ? 'password' : 'confirmation';
          const isVisible = visibleField === field;
          return <div key={label} className="relative"><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">{label}</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={18} /></div><input type={isVisible ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={index === 0 ? password : confirmation} onChange={(event) => index === 0 ? setPassword(event.target.value) : setConfirmation(event.target.value)} placeholder="8+ caracteres, letras y números" className="w-full pl-10 pr-12 py-3 bg-slate-100 dark:bg-slate-800/50 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-white placeholder-slate-400 text-sm" /><button type="button" onClick={() => setVisibleField(isVisible ? null : field)} className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-brand-600 cursor-pointer" aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{isVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>;
        })}
        <button type="submit" disabled={loading} className="w-full flex items-center justify-center py-3.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-600/70 text-white rounded-xl font-semibold text-sm shadow-lg shadow-brand-500/20 transition-all cursor-pointer">{loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <>Guardar contraseña <ArrowRight className="ml-2" size={16} /></>}</button>
      </form>}
    </div>
  </div>;
};

export default ResetPassword;
