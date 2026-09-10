import { FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-panel empty-state" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
      <FolderOpen size={48} style={{ color: '#64748b', margin: '0 auto 1rem' }} />
      <h3 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1.25rem' }}>{title}</h3>
      <p style={{ margin: '0 0 1.5rem', color: '#94a3b8', fontSize: '0.95rem' }}>{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
