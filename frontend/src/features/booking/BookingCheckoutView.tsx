import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, CreditCard, ShieldCheck, Ticket, XCircle } from 'lucide-react';
import { bookingsApi } from '../../api/bookingsApi';
import { formatDate, formatMoney } from '../../api/client';
import type { Booking, Event, Seat, SeatHoldResponse, Show } from '../../api/types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';

export function BookingCheckoutView({
  event,
  show,
  hold,
  selectedSeats,
  onBackToSeats,
  onPaymentSuccess,
}: {
  event: Event;
  show: Show;
  hold: SeatHoldResponse;
  selectedSeats: Seat[];
  onBackToSeats: () => void;
  onPaymentSuccess: (bookingId: string) => void;
}) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'SUCCESS' | 'FAIL'>('SUCCESS');
  const [error, setError] = useState('');
  const [paymentFailedNotice, setPaymentFailedNotice] = useState(false);

  // Countdown timer in seconds
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (hold.expiresAt) {
      const diff = Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000);
      return diff > 0 ? diff : 0;
    }
    return 600; // 10 minutes fallback
  });

  // Create booking immediately from holdId upon opening checkout
  useEffect(() => {
    let active = true;
    async function initBooking() {
      setCreatingBooking(true);
      setError('');
      try {
        const b = await bookingsApi.createBooking(hold.holdId);
        if (active) {
          setBooking(b);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Không thể tạo đơn đặt chỗ từ ghế đã giữ.');
        }
      } finally {
        if (active) {
          setCreatingBooking(false);
        }
      }
    }

    initBooking();
    return () => { active = false; };
  }, [hold.holdId]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft <= 0;

  const totalAmount = booking?.totalAmount ?? selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);

  const handlePay = async () => {
    if (!booking) return;
    setPaying(true);
    setError('');
    setPaymentFailedNotice(false);

    try {
      const res = await bookingsApi.payBooking(booking.id, paymentMethod);
      if (res.paymentStatus === 'SUCCEEDED') {
        onPaymentSuccess(booking.id);
      } else {
        setPaymentFailedNotice(true);
        setError('Thanh toán bị từ chối bởi Sandbox Payment Gateway. Vui lòng thử lại với phương thức "Thành công".');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi xử lý thanh toán.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <section className="checkout-container" style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <button
        type="button"
        disabled={paying}
        onClick={onBackToSeats}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.5rem 0.85rem',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '6px',
          color: '#cbd5e1',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
        }}
      >
        <ArrowLeft size={16} /> Chọn lại ghế
      </button>

      {/* Countdown Warning Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(2, 132, 199, 0.15)',
          border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.4)' : 'rgba(2, 132, 199, 0.4)'}`,
          borderRadius: '8px',
          marginBottom: '1.5rem',
          color: isExpired ? '#f87171' : '#38bdf8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          {isExpired ? <AlertTriangle size={20} /> : <Clock size={20} />}
          <span>
            {isExpired
              ? 'Thời gian giữ ghế đã kết thúc! Ghế đã được trả lại hệ thống.'
              : 'Ghế của bạn đang được giữ trong:'}
          </span>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace' }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {isExpired && (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#1e293b', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p style={{ color: '#94a3b8', margin: '0 0 1rem' }}>
            Để tránh tình trạng giữ chỗ ảo, thời gian thanh toán có hạn. Vui lòng quay lại sơ đồ ghế để chọn và giữ lại.
          </p>
          <button
            type="button"
            onClick={onBackToSeats}
            style={{ padding: '0.6rem 1.2rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
          >
            Quay lại chọn ghế
          </button>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {creatingBooking ? (
        <LoadingSpinner message="Đang khởi tạo đơn hàng từ vị trí giữ chỗ..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Order Details Card */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
              Thông tin đơn đặt vé
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sự kiện</span>
                <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.05rem', marginTop: '0.2rem' }}>{event.title}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Địa điểm</span>
                <div style={{ color: '#cbd5e1', fontSize: '0.95rem', marginTop: '0.2rem' }}>{show.venueName}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Thời gian suất diễn</span>
                <div style={{ color: '#cbd5e1', fontSize: '0.95rem', marginTop: '0.2rem' }}>{formatDate(show.startsAt)}</div>
              </div>
            </div>

            {/* Identifiers check */}
            <div style={{ display: 'flex', gap: '1rem', background: '#0f172a', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div>Mã giữ chỗ (Hold ID): <code style={{ color: '#94a3b8' }}>{hold.holdId}</code></div>
              {booking?.id && (
                <div>Mã đơn hàng (Booking ID): <code style={{ color: '#38bdf8' }}>{booking.id}</code></div>
              )}
            </div>

            {/* Seats Breakdown */}
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#cbd5e1' }}>Chi tiết các ghế đã chọn:</h3>
            <div style={{ border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.25rem' }}>
              {selectedSeats.map((seat, index) => (
                <div
                  key={seat.seatId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.65rem 1rem',
                    background: index % 2 === 0 ? '#1e293b' : '#0f172a',
                    borderBottom: index < selectedSeats.length - 1 ? '1px solid #334155' : 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                    Khu vực {seat.section} - Hàng {seat.row} Ghế {seat.number}
                  </span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{formatMoney(seat.price)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #334155', paddingTop: '1rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>Tổng thanh toán:</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>{formatMoney(totalAmount)}</span>
            </div>
          </div>

          {/* Sandbox Payment Gateway Card */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#f8fafc' }}>
              Cổng thanh toán thử nghiệm (Sandbox)
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
              Môi trường mô phỏng không trừ tiền thật. Bạn có thể chọn kịch bản kết quả để kiểm thử luồng nghiệp vụ.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: paymentMethod === 'SUCCESS' ? 'rgba(2, 132, 199, 0.15)' : '#0f172a',
                  border: `2px solid ${paymentMethod === 'SUCCESS' ? '#38bdf8' : '#334155'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="sandboxOutcome"
                  checked={paymentMethod === 'SUCCESS'}
                  onChange={() => setPaymentMethod('SUCCESS')}
                  style={{ accentColor: '#38bdf8' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f8fafc', fontWeight: 600 }}>
                    <CheckCircle2 size={16} style={{ color: '#34d399' }} /> Thành công (SUCCESS)
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Mô phỏng thanh toán hợp lệ và xuất vé</span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: paymentMethod === 'FAIL' ? 'rgba(239, 68, 68, 0.15)' : '#0f172a',
                  border: `2px solid ${paymentMethod === 'FAIL' ? '#f87171' : '#334155'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="sandboxOutcome"
                  checked={paymentMethod === 'FAIL'}
                  onChange={() => setPaymentMethod('FAIL')}
                  style={{ accentColor: '#f87171' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f8fafc', fontWeight: 600 }}>
                    <XCircle size={16} style={{ color: '#f87171' }} /> Thất bại (FAIL)
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Kiểm thử hoàn trả ghế khi thẻ lỗi</span>
                </div>
              </label>
            </div>

            <button
              type="button"
              disabled={isExpired || paying || !booking}
              onClick={handlePay}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: isExpired || paying ? '#334155' : '#0284c7',
                color: isExpired || paying ? '#64748b' : '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: isExpired || paying ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <CreditCard size={18} />
              {paying ? 'Đang gửi lệnh thanh toán...' : `Xác nhận thanh toán ${formatMoney(totalAmount)}`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
