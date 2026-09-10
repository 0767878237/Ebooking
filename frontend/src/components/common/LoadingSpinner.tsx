export function LoadingSpinner({ message = 'Đang tải dữ liệu...' }: { message?: string }) {
  return (
    <div className="state-panel loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ marginTop: '0.75rem', color: '#94a3b8', fontSize: '0.9rem' }}>{message}</p>
    </div>
  );
}
