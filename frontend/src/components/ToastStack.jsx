import { useApp } from '../state/AppContext.jsx';
import Icon from './Icon.jsx';

export default function ToastStack() {
  const { toasts, dismiss } = useApp();

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <span className="toast-mark">
            <Icon name={toast.tone === 'error' ? 'close' : 'check'} size={14} />
          </span>
          <span>{toast.message}</span>
          <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss message">
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
