import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const ResetPassword: React.FC<{ token: string }> = ({ token }) => {
  const notification = useNotification();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visibleField, setVisibleField] = useState<'password' | 'confirmation' | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) return notification.error('Las contraseñas no coinciden.');
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setCompleted(true);
      notification.success(res.data.message || 'Contraseña restablecida correctamente.');
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err: any) {
      notification.error(err.response?.data?.error || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="public-auth min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-[#0f172a] via-[#1e1b4b] to-[#3b0764]">
    <div className="w-full max-w-md bg-[#0f172a]/80 backdrop-blur-md rounded-3xl shadow-2xl border border-[#1e293b]/30 p-8">
      <div className="text-center mb-8">
        <div className="inline-flex p-1.5 bg-[#1e293b]/90 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30"><img src="/brand/finanzas-logo.png" alt="Logo de Finanzas" className="w-14 h-14 object-contain" /></div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Nueva contraseña</h2>
        <p className="text-[#94a3b8] mt-2 text-sm">Elige una contraseña segura para tu cuenta.</p>
      </div>
      {completed ? <a href="/" className="block w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-indigo-500">Ir a iniciar sesión</a> : <form onSubmit={submit} className="space-y-5">
        {['Nueva contraseña', 'Repite la contraseña'].map((label, index) => {
          const field = index === 0 ? 'password' : 'confirmation';
          const isVisible = visibleField === field;
          return <div key={label} className="relative"><label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">{label}</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94a3b8]"><Lock size={18} /></div><input type={isVisible ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={index === 0 ? password : confirmation} onChange={(event) => index === 0 ? setPassword(event.target.value) : setConfirmation(event.target.value)} placeholder="8+ caracteres, letras y números" className="w-full pl-10 pr-12 py-3 bg-[#1e293b]/50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-white placeholder-[#94a3b8] text-sm" /><button type="button" onClick={() => setVisibleField(isVisible ? null : field)} className="absolute inset-y-0 right-0 px-3 text-[#94a3b8] hover:text-indigo-400 cursor-pointer" aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{isVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>;
        })}
        <button type="submit" disabled={loading} className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/70 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all cursor-pointer">{loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <>Guardar contraseña <ArrowRight className="ml-2" size={16} /></>}</button>
      </form>}
    </div>
  </div>;
};

export default ResetPassword;
