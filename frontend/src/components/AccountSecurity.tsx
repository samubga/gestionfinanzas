import React, { useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle, Eye, EyeOff, KeyRound, Loader2, Mail, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const inputClass = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm text-slate-800 dark:text-white';

const PasswordField: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  const [visible, setVisible] = useState(false);
  return <div className="relative"><input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-10`} /><button type="button" onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-brand-600 cursor-pointer" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>;
};

export const AccountSecurity: React.FC = () => {
  const { user, changeEmail, changePassword } = useAuth();
  const { updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatarData, setAvatarData] = useState<string | null | undefined>(user?.avatarData);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState(user?.email || '');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'profile' | 'email' | 'password' | null>(null);

  const resizeAvatar = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      image.onload = () => {
        const limit = 256;
        const scale = Math.min(1, limit / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

  const selectAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Elige una imagen JPG, PNG o WebP.');
      return;
    }
    try { setAvatarData(await resizeAvatar(file)); }
    catch (err: any) { setError(err.message || 'No se pudo procesar la imagen.'); }
    finally { event.target.value = ''; }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setMessage(''); setLoading('profile');
    try {
      await updateProfile(name, avatarData);
      setMessage('Perfil actualizado.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo actualizar el perfil.');
    } finally { setLoading(null); }
  };

  const updateEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setMessage(''); setLoading('email');
    try {
      await changeEmail(emailPassword, email);
      setEmailPassword('');
      setMessage('Correo de la cuenta actualizado. Ya podrás recibir el enlace de recuperación ahí.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo cambiar el correo.');
    } finally { setLoading(null); }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (password !== confirmation) return setError('Las nuevas contraseñas no coinciden.');
    setLoading('password');
    try {
      const response = await changePassword(currentPassword, password);
      setCurrentPassword(''); setPassword(''); setConfirmation(''); setMessage(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo cambiar la contraseña.');
    } finally { setLoading(null); }
  };

  return <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
    <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800"><KeyRound className="text-brand-500" size={18} /><h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Seguridad de la cuenta</h3></div>
    <p className="text-xs text-slate-500 dark:text-slate-400">Usa un correo real para poder recuperar el acceso. Los cambios requieren tu contraseña actual.</p>
    {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl flex gap-2"><AlertCircle size={16} className="shrink-0" />{error}</div>}
    {message && <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-xl flex gap-2"><CheckCircle size={16} className="shrink-0" />{message}</div>}
    <form onSubmit={saveProfile} className="space-y-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/30 p-4">
      <span className="font-bold text-xs text-slate-800 dark:text-white">Perfil</span>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden bg-gradient-to-tr from-brand-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl">
          {avatarData ? <img src={avatarData} alt="Vista previa de foto de perfil" className="w-full h-full object-cover" /> : (name.trim().slice(0, 1).toUpperCase() || '?')}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => avatarInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-brand-400 cursor-pointer"><Camera size={15} /> Elegir foto</button>
          {avatarData && <button type="button" onClick={() => setAvatarData(null)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 size={15} /> Quitar</button>}
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} className="hidden" />
        </div>
      </div>
      <input className={inputClass} type="text" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" autoComplete="name" />
      <p className="text-[10px] text-slate-400">La foto se reduce a 256 px antes de guardarla.</p>
      <button type="submit" disabled={loading !== null} className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer">{loading === 'profile' ? <Loader2 className="animate-spin" size={16} /> : 'Guardar perfil'}</button>
    </form>
    <form onSubmit={updateEmail} className="space-y-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/30 p-4">
      <div className="flex items-center gap-2"><Mail size={15} className="text-brand-500" /><span className="font-bold text-xs text-slate-800 dark:text-white">Correo de recuperación</span></div>
      <input className={inputClass} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
      <PasswordField className={inputClass} required value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} placeholder="Contraseña actual" autoComplete="current-password" />
      <button type="submit" disabled={loading !== null} className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer">{loading === 'email' ? <Loader2 className="animate-spin" size={16} /> : 'Actualizar correo'}</button>
    </form>
    <form onSubmit={updatePassword} className="space-y-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/30 p-4">
      <span className="font-bold text-xs text-slate-800 dark:text-white">Cambiar contraseña</span>
      <PasswordField className={inputClass} required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Contraseña actual" autoComplete="current-password" />
      <PasswordField className={inputClass} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nueva: 8+ caracteres, letras y números" autoComplete="new-password" />
      <PasswordField className={inputClass} required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repite la nueva contraseña" autoComplete="new-password" />
      <button type="submit" disabled={loading !== null} className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer">{loading === 'password' ? <Loader2 className="animate-spin" size={16} /> : 'Cambiar contraseña'}</button>
    </form>
  </section>;
};

export default AccountSecurity;
