import type { ReactNode } from 'react';

type StatusVariant = 'loading' | 'success' | 'error';

interface StatusPanelProps {
  variant: StatusVariant;
  title: string;
  children?: ReactNode;
}

/**
 * Panel sederhana untuk menampilkan keadaan loading, sukses, atau error.
 */
export default function StatusPanel({ variant, title, children }: StatusPanelProps) {
  return (
    <section
      className={`status-panel status-panel--${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="status-panel__header">
        {variant === 'loading' && <span className="spinner" aria-hidden="true" />}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
