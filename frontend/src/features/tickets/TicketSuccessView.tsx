import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, MapPin, QrCode, Ticket as TicketIcon } from 'lucide-react';
import { bookingsApi } from '../../api/bookingsApi';
import { ticketsApi } from '../../api/ticketsApi';
import { formatDate, formatMoney } from '../../api/client';
import type { Booking, Ticket } from '../../api/types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';

export function TicketSuccessView({
  bookingId,
  onViewMyBookings,
  onBrowseMore,
}: {
  bookingId: string;
  onViewMyBookings: () => void;
  onBrowseMore: () => void;
}) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadTickets() {
      setLoading(true);
      setError('');
      try {
        const [b, tList] = await Promise.all([
          bookingsApi.getBooking(bookingId),
          ticketsApi.getBookingTickets(bookingId),
        ]);
        if (active) {
          setBooking(b);
          setTickets(tList);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Không thể tải thông tin vé đã thanh toán.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTickets();
    return () => { active = false; };
  }, [bookingId]);

  if (loading) {
    return <LoadingSpinner message="Đang tạo mã vé điện tử QR..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <section className="ticket-success-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <CheckCircle2 size={56} style={{ color: '#34d399', margin: '0 auto 1rem' }} />
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem' }}>
          Đặt vé thành công!
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
          Vé điện tử đã được kích hoạt. Bạn có thể sử dụng mã QR dưới đây để check-in tại cổng sự kiện.
        </p>
      </div>

      {/* Tickets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {tickets.map((ticket, idx) => {
          // Find corresponding seat label from booking
          const seatInfo = booking?.seats?.find((s) => s.seatId === ticket.seatId);

          return (
            <div
              key={ticket.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexWrap: 'wrap',
              }}
            >
              {/* Ticket Left Section */}
              <div style={{ flex: '1 1 300px', padding: '1.5rem', borderRight: '1px dashed #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'inline-block', background: '#0284c720', color: '#38bdf8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    VÉ #{idx + 1}
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1.25rem', fontWeight: 700 }}>
                    {booking?.eventTitle || 'Sự kiện E-Booking'}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#cbd5e1', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} style={{ color: '#38bdf8' }} />
                      <span>{formatDate(booking?.startsAt)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} style={{ color: '#38bdf8' }} />
                      <span>{booking?.venueName}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Vị trí ghế</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                      {seatInfo?.label || 'Ghế tiêu chuẩn'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Mã vé</span>
                    <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc' }}>
                      {ticket.ticketCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ticket Right QR Section */}
              <div style={{ flex: '0 0 200px', background: '#0f172a', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
                <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                  <QrCode size={110} style={{ color: '#0f172a' }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {ticket.qrPayload}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600, marginTop: '0.5rem' }}>
                  • SẴN SÀNG QUÉT VÉ
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onViewMyBookings}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <TicketIcon size={16} /> Xem trong "Vé của tôi"
        </button>

        <button
          type="button"
          onClick={onBrowseMore}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#1e293b',
            color: '#cbd5e1',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          Đặt thêm vé khác
        </button>
      </div>
    </section>
  );
}
