import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User as UserIcon, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login, register, requestPasswordReset } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        const message = await requestPasswordReset(email);
        setSuccess(message);
      } else if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name, inviteCode);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ocurrió un error. Revisa tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-blue-500 via-brand-600 to-purple-700 dark:from-slate-900 dark:via-brand-950 dark:to-purple-950">
      <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800/30 p-8 transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-2xl mb-4 shadow-lg shadow-brand-500/30">
            <img src="/brand/finanzas-logo.png" alt="Logo de Finanzas" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            {isForgotPassword ? 'Restablece tu contraseña' : isLogin ? '¡Bienvenido de nuevo!' : 'Crea tu cuenta'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            {isForgotPassword ? 'Te enviaremos un enlace para crear una nueva contraseña' : isLogin ? 'Ingresa para gestionar tus finanzas personales' : 'Comienza a ahorrar y registrar tus gastos hoy'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && !isForgotPassword && (
            <>
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Nombre completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white placeholder-slate-400 text-sm transition-all"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Código de invitación</label>
                <div className="relative">
                  <input
                    type={showInviteCode ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Código que te ha dado el administrador"
                    className="w-full px-4 py-3 pr-12 bg-slate-100 dark:bg-slate-800/50 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white placeholder-slate-400 text-sm transition-all"
                  />
                  <button type="button" onClick={() => setShowInviteCode(!showInviteCode)} className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-brand-600 cursor-pointer" aria-label={showInviteCode ? 'Ocultar código de invitación' : 'Mostrar código de invitación'}>{showInviteCode ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
            </>
          )}

          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Correo electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white placeholder-slate-400 text-sm transition-all"
              />
            </div>
          </div>

          {!isForgotPassword && <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isLogin ? 1 : 8}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? '••••••••' : '8+ caracteres, letras y números'}
                className="w-full pl-10 pr-12 py-3 bg-slate-100 dark:bg-slate-800/50 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white placeholder-slate-400 text-sm transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-brand-600 cursor-pointer" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-600/70 text-white rounded-xl font-semibold text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 transition-all cursor-pointer group"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" size={18} />
            ) : (
              <>
                {isForgotPassword ? 'Enviar enlace' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isForgotPassword ? '¿Ya recuerdas tu contraseña?' : isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
            <button
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                  setIsLogin(true);
                } else {
                  setIsLogin(!isLogin);
                }
                setError('');
                setSuccess('');
              }}
              className="ml-1.5 font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 focus:outline-none transition-colors"
            >
              {isForgotPassword ? 'Inicia sesión' : isLogin ? 'Regístrate aquí' : 'Inicia sesión aquí'}
            </button>
          </p>
          {isLogin && !isForgotPassword && (
            <button
              onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
              className="mt-3 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 focus:outline-none transition-colors"
            >
              ¿Has olvidado tu contraseña?
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
export default Auth;
