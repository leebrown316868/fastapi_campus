  import React, { useEffect, useState } from 'react';

  export type ToastType = 'success' | 'error' | 'warning';

  interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose?: () => void;
  }

  export const Toast: React.FC<ToastProps> = ({
    message,
    type = 'success',
    duration = 3000,
    onClose,
  }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColor = {
      success: 'bg-emerald-500',
      error: 'bg-red-500',
      warning: 'bg-amber-500',
    }[type];

    const icon = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
    }[type];

    return (
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className={`${bgColor} text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-semibold`}>
          <span className="material-symbols-outlined text-xl">{icon}</span> 
          <span>{message}</span>
        </div>
      </div>
    );
  };

  // 简易 Hook，方便使用
  let toastCallback: ((message: string, type: ToastType) => void) | null = null;

  export const showToast = (message: string, type: ToastType = 'success') => {
    toastCallback?.(message, type);
  };

  export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    toastCallback = (message, type) => {
      setToast({ message, type });
    };

    return (
      <>
        {children}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </>
    );
  };