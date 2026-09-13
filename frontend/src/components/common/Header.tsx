import { Calendar, CheckSquare, LogIn, LogOut, Shield, Ticket, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { ViewTab } from '../../api/types';

export function Header({
  activeTab,
  onSelectTab,
}: {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
}) {
  const { user, role, demoUsers, switchDemoUser, logout, setIsAuthModalOpen, setAuthModalMode } = useAuth();

  const canAccessCheckin = role === 'CHECK_IN_STAFF' || role === 'ADMIN';
  const canAccessAdmin = role === 'ADMIN';

  const roleLabelMap: Record<string, { label: string; color: string }> = {
    USER: { label: 'Khách hàng', color: '#38bdf8' },
    CHECK_IN_STAFF: { label: 'Soát vé', color: '#34d399' },
    ADMIN: { label: 'Quản trị viên', color: '#f472b6' },
  };

  const currentRoleBadge = roleLabelMap[role] ?? { label: role, color: '#94a3b8' };

  return (
    <header className="header" style={{ borderBottom: '1px solid #334155', background: '#0f172a', padding: '0.75rem 1.5rem', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div
            onClick={() => onSelectTab('browse')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <Ticket size={24} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.025em' }}>
              E-Booking
            </span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => onSelectTab('browse')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'browse' ? '#1e293b' : 'transparent',
                color: activeTab === 'browse' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'browse' ? 600 : 500,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              <Calendar size={16} /> Khám phá
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('bookings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'bookings' ? '#1e293b' : 'transparent',
                color: activeTab === 'bookings' ? '#38bdf8' : '#94a3b8',
                fontWeight: activeTab === 'bookings' ? 600 : 500,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              <Ticket size={16} /> Vé của tôi
            </button>

            {canAccessCheckin && (
              <button
                type="button"
                onClick={() => onSelectTab('checkin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'checkin' ? '#1e293b' : 'transparent',
                  color: activeTab === 'checkin' ? '#34d399' : '#94a3b8',
                  fontWeight: activeTab === 'checkin' ? 600 : 500,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                <CheckSquare size={16} /> Soát vé cổng
              </button>
            )}

            {canAccessAdmin && (
              <button
                type="button"
                onClick={() => onSelectTab('admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'admin' ? '#1e293b' : 'transparent',
                  color: activeTab === 'admin' ? '#fbbf24' : '#94a3b8',
                  fontWeight: activeTab === 'admin' ? 600 : 500,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                <Shield size={16} /> Quản trị
              </button>
            )}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {demoUsers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1e293b', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Demo vai trò:</span>
              <select
                value={user?.id ?? ''}
                onChange={(e) => switchDemoUser(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
              >
                {demoUsers.map((d) => (
                  <option key={d.id} value={d.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                    {d.role} ({d.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
                    {user.displayName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      background: `${currentRoleBadge.color}20`,
                      color: currentRoleBadge.color,
                      border: `1px solid ${currentRoleBadge.color}50`,
                    }}
                  >
                    {currentRoleBadge.label}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</span>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Đăng xuất"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.45rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <LogIn size={15} /> Đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
