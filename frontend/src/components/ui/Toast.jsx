import toast, { Toaster as HotToaster } from 'react-hot-toast';

export { toast };

export const appToast = {
  success: (msg, opts) => toast.success(msg, opts),
  error: (msg, opts) => toast.error(msg, opts),
  info: (msg, opts) => toast(msg, { icon: 'ℹ️', ...opts }),
  warning: (msg, opts) => toast(msg, { icon: '⚠️', ...opts }),
  loading: (msg, opts) => toast.loading(msg, opts),
  dismiss: (id) => toast.dismiss(id),
  promise: toast.promise,
};

export function Toaster(props) {
  return (
    <HotToaster
      position="top-right"
      reverseOrder={false}
      gutter={10}
      containerStyle={{
        top: 20,
        right: 20,
        zIndex: 99999,
      }}
      toastOptions={{
        duration: 3500,
        style: {
          background: '#13141f',
          color: '#f8fafc',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '12px 18px',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
        },
        success: {
          duration: 3500,
          iconTheme: {
            primary: '#10b981',
            secondary: '#13141f',
          },
          style: {
            borderColor: 'rgba(16, 185, 129, 0.35)',
          },
        },
        error: {
          duration: 4500,
          iconTheme: {
            primary: '#f43f5e',
            secondary: '#13141f',
          },
          style: {
            borderColor: 'rgba(244, 63, 94, 0.35)',
          },
        },
      }}
      {...props}
    />
  );
}
