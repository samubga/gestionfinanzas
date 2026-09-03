import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  duration: number;
  closing: boolean;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationStyles: Record<NotificationType, { icon: typeof Info; iconClass: string; title: string; progressClass: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-emerald-500', title: 'Todo listo', progressClass: 'bg-emerald-500' },
  error: { icon: AlertCircle, iconClass: 'text-rose-500', title: 'No se ha podido completar', progressClass: 'bg-rose-500' },
  info: { icon: Info, iconClass: 'text-brand-500', title: 'Información', progressClass: 'bg-brand-500' },
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>[]>>(new Map());

  const dismiss = useCallback((id: number) => {
    const activeTimers = timers.current.get(id);
    activeTimers?.forEach(clearTimeout);
    timers.current.delete(id);

    setNotifications((current) => current.map((item) => item.id === id ? { ...item, closing: true } : item));
    const removalTimer = setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
      timers.current.delete(id);
    }, 280);
    timers.current.set(id, [removalTimer]);
  }, []);

  const notify = useCallback((message: string, type: NotificationType = 'info', duration?: number) => {
    if (!message) return;
    const id = ++nextId.current;
    const visibleFor = duration ?? (type === 'error' ? 5000 : 4000);

    setNotifications((current) => [...current.slice(-2), { id, message, type, duration: visibleFor, closing: false }]);

    const closeTimer = setTimeout(() => {
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, closing: true } : item));
    }, Math.max(0, visibleFor - 280));
    const removalTimer = setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
      timers.current.delete(id);
    }, visibleFor);
    timers.current.set(id, [closeTimer, removalTimer]);
  }, []);

  useEffect(() => () => {
    timers.current.forEach((notificationTimers) => notificationTimers.forEach(clearTimeout));
    timers.current.clear();
  }, []);

  const value: NotificationContextType = {
    notify,
    success: (message, duration) => notify(message, 'success', duration),
    error: (message, duration) => notify(message, 'error', duration),
    info: (message, duration) => notify(message, 'info', duration),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center p-4"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            {notifications.map((notification) => {
              const style = notificationStyles[notification.type];
              const Icon = style.icon;
              return (
                <div
                  key={notification.id}
                  role={notification.type === 'error' ? 'alert' : 'status'}
                  className={`notification-popup pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 pr-12 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95 ${notification.closing ? 'notification-popup-exit' : ''}`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`mt-0.5 shrink-0 ${style.iconClass}`}>
                      <Icon size={24} strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">{style.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{notification.message}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(notification.id)}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Cerrar aviso"
                  >
                    <X size={17} />
                  </button>
                  <span
                    className={`notification-progress absolute inset-x-0 bottom-0 h-1 origin-left ${style.progressClass}`}
                    style={{ animationDuration: `${notification.duration}ms` }}
                  />
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification debe usarse dentro de NotificationProvider');
  return context;
};
