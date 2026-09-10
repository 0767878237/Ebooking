import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock, MapPin, QrCode, RefreshCw, Ticket, Trash2, X } from 'lucide-react';
import { bookingsApi } from '../../api/bookingsApi';
import { ticketsApi } from '../../api/ticketsApi';
import { formatDate, formatMoney } from '../../api/client';
import type { Booking, BookingStatus, Ticket as TicketType } from '../../api/types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { EmptyState } from '../../components/common/EmptyState';

export function MyBookingsView({
  onBrowse,
}: {
  onBrowse: () => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Tickets modal state
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await bookingsApi.getMyBookings();
      setBookings(list);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải lịch sử đơn đặt vé.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenTickets = async (b: Booking) => {
    setActiveBooking(b);
    setLoadingTickets(true);
    try {
      const tList = await ticketsApi.getBookingTickets(b.id);
      setTickets(tList);
    } catch (err: any) {
      console.error('Failed to load tickets for booking:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn đặt vé này? Ghế sẽ được hoàn trả về hệ thống.')) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await bookingsApi.cancelBooking(bookingId);
      await fetchBookings();
      if (activeBooking?.id === bookingId) {
        setActiveBooking(null);
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể hủy đơn đặt vé.');
    } finally {
      setCancellingId(null);
    }
  };

  const statusBadgeMap: Record<BookingStatus, { label: string; color: string; bg: string }> = {
    PAID: { label: 'Đã thanh toán', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
    PENDING_PAYMENT: { label: 'Chờ thanh toán', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
    CANCELLED: { label: 'Đã hủy', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' },
    EXPIRED: { label: 'Hết hạn', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  };

  return (
    <section className="my-bookings-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem' }}>
            Vé và đơn hàng của tôi
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Toàn bộ lịch sử đặt chỗ được đồng bộ trực tiếp từ tài khoản của bạn
          </p>
        </div>

        <button
          type="button"
          onClick={fetchBookings}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Làm mới
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải danh sách vé từ máy chủ..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchBookings} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="Bạn chưa có đơn đặt vé nào"
          message="Hãy khám phá các sự kiện âm nhạc, nghệ thuật sắp diễn ra và chọn ghế ngồi yêu thích."
          action={
            <button
              type="button"
              onClick={onBrowse}
              style={{
                padding: '0.65rem 1.25rem',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Khám phá sự kiện ngay
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {bookings.map((b) => {
            const badge = statusBadgeMap[b.status] ?? { label: b.status, color: '#94a3b8', bg: '#334155' };
            const canCancel = b.status === 'PAID' || b.status === 'PENDING_PAYMENT';
            const isCancelling = cancellingId === b.id;

            return (
              <article
                key={b.id}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Đơn hàng:</span>
                      <code style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{b.id}</code>
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#f8fafc', fontWeight: 700 }}>
                      {b.eventTitle || 'Sự kiện'}
                    </h2>
                  </div>

                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.color}40`,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: '#0f172a', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1' }}>
                    <Calendar size={15} style={{ color: '#38bdf8' }} />
                    <span>{formatDate(b.startsAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1' }}>
                    <MapPin size={15} style={{ color: '#38bdf8' }} />
                    <span>{b.venueName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1' }}>
                    <Ticket size={15} style={{ color: '#38bdf8' }} />
                    <span>
                      {b.seats?.length || 0} ghế: {b.seats?.map((s) => s.label).join(', ') || 'Ghế đã chọn'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng số tiền: </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                      {formatMoney(b.totalAmount)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {b.status === 'PAID' && (
                      <button
                        type="button"
                        onClick={() => handleOpenTickets(b)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 1rem',
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        <QrCode size={15} /> Xem vé QR
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={() => handleCancelBooking(b.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 1rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: isCancelling ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Trash2 size={14} /> {isCancelling ? 'Đang hủy...' : 'Hủy đơn'}
                      </button>
                    )}

                    {b.status === 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={onBrowse}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#cbd5e1',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        Đặt lại suất khác
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Tickets QR Detail Modal */}
      {activeBooking && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.75rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', color: '#f8fafc', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setActiveBooking(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', color: '#f8fafc' }}>
              {activeBooking.eventTitle}
            </h2>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {formatDate(activeBooking.startsAt)} • {activeBooking.venueName}
            </div>

            {loadingTickets ? (
              <LoadingSpinner message="Đang nạp mã vé..." />
            ) : tickets.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                Chưa có vé nào được kích hoạt cho đơn này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tickets.map((t, idx) => {
                  const seatInfo = activeBooking.seats?.find((s) => s.seatId === t.seatId);
                  const isUsed = t.status === 'USED';
                  const isCancelled = t.status === 'CANCELLED';

                  return (
                    <div
                      key={t.id}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>VÉ #{idx + 1}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0' }}>
                          {seatInfo?.label || 'Ghế đặt'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                          Mã: {t.ticketCode}
                        </div>
                        <div style={{ marginTop: '0.35rem' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: isUsed ? '#d9770620' : isCancelled ? '#ef444420' : '#10b98120',
                              color: isUsed ? '#fbbf24' : isCancelled ? '#f87171' : '#34d399',
                            }}
                          >
                            {isUsed ? 'ĐÃ CHECK-IN' : isCancelled ? 'ĐÃ HỦY' : 'HỢP LỆ'}
                          </span>
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '6px' }}>
                        <QrCode size={80} style={{ color: '#0f172a' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
