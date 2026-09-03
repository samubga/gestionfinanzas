import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User as UserIcon, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export const Auth: React.FC = () => {
  const { login, register, requestPasswordReset } = useAuth();
  const notification = useNotification();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        const message = await requestPasswordReset(email);
        notification.success(message);
      } else if (isLogin) {
        await login(email, password);
        notification.success('Sesión iniciada correctamente.');
      } else {
        await register(email, password, name, inviteCode);
        notification.success('Cuenta creada correctamente.');
      }
    } catch (err: any) {
      notification.error(err.response?.data?.error || 'Ocurrió un error. Revisa tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-auth min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-[#0f172a] via-[#1e1b4b] to-[#3b0764]">
      <div className="w-full max-w-md bg-[#0f172a]/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-[#1e293b]/30 p-8 transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-1.5 bg-[#1e293b]/90 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
            <img src="/brand/finanzas-logo.png" alt="Logo de Finanzas" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            {isForgotPassword ? 'Restablece tu contraseña' : isLogin ? '¡Bienvenido de nuevo!' : 'Crea tu cuenta'}
          </h2>
          <p className="text-[#94a3b8] mt-2 text-sm">
            {isForgotPassword ? 'Te enviaremos un enlace para crear una nueva contraseña' : isLogin ? 'Ingresa para gestionar tus finanzas personales' : 'Comienza a ahorrar y registrar tus gastos hoy'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && !isForgotPassword && (
            <>
              <div className="relative">
                <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Nombre completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94a3b8]">
                    <UserIcon size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full pl-10 pr-4 py-3 bg-[#1e293b]/50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-white placeholder-[#94a3b8] text-sm transition-all"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Código de invitación</label>
                <div className="relative">
                  <input
                    type={showInviteCode ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Código que te ha dado el administrador"
                    className="w-full px-4 py-3 pr-12 bg-[#1e293b]/50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-white placeholder-[#94a3b8] text-sm transition-all"
                  />
                  <button type="button" onClick={() => setShowInviteCode(!showInviteCode)} className="absolute inset-y-0 right-0 px-3 text-[#94a3b8] hover:text-indigo-400 cursor-pointer" aria-label={showInviteCode ? 'Ocultar código de invitación' : 'Mostrar código de invitación'}>{showInviteCode ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
            </>
          )}

          <div className="relative">
            <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Correo electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94a3b8]">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full pl-10 pr-4 py-3 bg-[#1e293b]/50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-white placeholder-[#94a3b8] text-sm transition-all"
              />
            </div>
          </div>

          {!isForgotPassword && <div className="relative">
            <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94a3b8]">
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
                className="w-full pl-10 pr-12 py-3 bg-[#1e293b]/50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 text-white placeholder-[#94a3b8] text-sm transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 text-[#94a3b8] hover:text-indigo-400 cursor-pointer" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/70 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all cursor-pointer group"
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
        <div className="mt-8 pt-6 border-t border-[#1e293b] text-center">
          <p className="text-sm text-[#94a3b8]">
            {isForgotPassword ? '¿Ya recuerdas tu contraseña?' : isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
            <button
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                  setIsLogin(true);
                } else {
                  setIsLogin(!isLogin);
                }
              }}
              className="ml-1.5 font-bold text-indigo-400 hover:text-indigo-300 focus:outline-none transition-colors"
            >
              {isForgotPassword ? 'Inicia sesión' : isLogin ? 'Regístrate aquí' : 'Inicia sesión aquí'}
            </button>
          </p>
          {isLogin && !isForgotPassword && (
            <button
              onClick={() => setIsForgotPassword(true)}
              className="mt-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 focus:outline-none transition-colors"
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
