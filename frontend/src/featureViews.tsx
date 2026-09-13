import { Check, ChevronRight, QrCode, Ticket } from 'lucide-react';
import type { ReactNode } from 'react';

type IdentityRole = 'USER' | 'ORGANIZER' | 'CHECK_IN_STAFF' | 'ADMIN';

type IdentitySession = {
  key: IdentityRole;
  userId: string;
  role: IdentityRole;
  displayName: string;
  email: string;
};

type Show = {
  id: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
};

type BookingSeat = {
  seatId: string;
  label: string;
  price: number;
};

type Booking = {
  id: string;
  holdId: string;
  bookingId?: string;
  status: string;
  totalAmount: number;
  seats: BookingSeat[];
  eventTitle: string;
  show: Show;
  expiresAt?: string;
};

type TicketData = {
  ticketCode: string;
  qrPayload: string;
  status: string;
  seatId: string;
};

type BookingRecord = {
  bookingId: string;
  holdId: string;
  status: string;
  totalAmount: number;
  seats: BookingSeat[];
  eventTitle: string;
  show: Show;
  expiresAt?: string;
  tickets: TicketData[];
  paymentStatus?: string;
};

type CheckinRecord = {
  qrPayload: string;
  ticketCode: string | null;
  result: string;
  usedAt?: string | null;
  deviceId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

export function BookingHistoryView({
  records,
  onBrowse,
  onCancel,
  isGuest,
  onLogin,
}: {
  records: BookingRecord[];
  onBrowse: () => void;
  onCancel: (record: BookingRecord) => void;
  isGuest?: boolean;
  onLogin?: () => void;
}) {
  return (
    <section className="content standalone">
      <p className="eyebrow">Account</p>
      <h1>Vé của tôi</h1>
      {isGuest ? (
        <div className="empty-history">
          <Ticket size={34} />
          <h3>Bạn chưa đăng nhập</h3>
          <p>Vui lòng đăng nhập tài khoản để xem danh sách vé và lịch sử đặt chỗ của bạn.</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            {onLogin && (
              <button className="primary" onClick={onLogin}>
                Đăng nhập ngay
              </button>
            )}
            <button className="secondary" onClick={onBrowse}>
              Khám phá sự kiện
            </button>
          </div>
        </div>
      ) : records.length ? (
        <div className="booking-history">
          {records.map((record) => (
            <article className="booking-row" key={record.bookingId}>
              <span className="summary-art small">{record.eventTitle.slice(0, 2).toUpperCase()}</span>
              <span>
                <b>{record.eventTitle}</b>
                <small>
                  {formatDate(record.show.startsAt)} - {record.seats.length} ghế - {record.status}
                </small>
              </span>
              <strong>{formatMoney(record.totalAmount)}</strong>
              {(record.status === 'PENDING_PAYMENT' || record.status === 'PAID') && (
                <button className="secondary" onClick={() => onCancel(record)}>
                  Hủy
                </button>
              )}
              <ChevronRight size={18} />
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-history">
          <Ticket size={34} />
          <h3>Chưa có booking nào</h3>
          <p>Những vé bạn đặt sẽ xuất hiện ở đây.</p>
          <button className="primary" onClick={onBrowse}>
            Khám phá sự kiện
          </button>
        </div>
      )}
    </section>
  );
}

export function EnhancedTicketView({ booking, tickets, onDone }: { booking: Booking; tickets: TicketData[]; onDone: () => void }) {
  return (
    <section className="content narrow">
      <div className="success-heading">
        <span><Check size={26} /></span>
        <p className="eyebrow">03 / Hoan tat</p>
        <h1>Ve cua ban da san sang</h1>
        <p>Booking <strong>{booking.id}</strong> da duoc xac nhan.</p>
      </div>
      <div className="ticket-stack">
        {tickets.map((ticket) => (
          <article className="ticket" key={ticket.ticketCode}>
            <div className="ticket-main">
              <p className="eyebrow">{booking.eventTitle}</p>
              <h2>{ticket.ticketCode}</h2>
              <p>{formatDate(booking.show.startsAt)} - {booking.show.venueName}</p>
              <strong className="ticket-seat">
                Ghe {booking.seats.find((seat) => seat.seatId === ticket.seatId)?.label}
              </strong>
              <small className="ticket-payload">QR: {ticket.qrPayload}</small>
            </div>
            <div className="qr">
              <QrCode size={92} />
              <small>{ticket.status}</small>
            </div>
          </article>
        ))}
      </div>
      <button className="primary" onClick={onDone}>
        Kham pha them event
        <ChevronRight size={17} />
      </button>
    </section>
  );
}

export function CheckinWorkspace({
  identity,
  value,
  onChange,
  onSubmit,
  lastCheckin,
  history,
  loading,
}: {
  identity: IdentitySession;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  lastCheckin: CheckinRecord | null;
  history: CheckinRecord[];
  loading: boolean;
}) {
  const canScan = identity.role === 'CHECK_IN_STAFF' || identity.role === 'ADMIN';
  return (
    <section className="content standalone">
      <p className="eyebrow">Staff workspace</p>
      <h1>Check-in tai cong</h1>
      <div className="checkin-panel">
        <div className="scanner">
          <QrCode size={100} strokeWidth={1} />
          <span>Camera sandbox</span>
          <small>{canScan ? 'San sang quet ve' : 'Chi role staff moi duoc quet'}</small>
        </div>
        <div>
          <h2>Quet ma QR cua khach</h2>
          <p>Nhap qrPayload de mo phong viec quet ve tai cong.</p>
          {lastCheckin && (
            <div className={`scan-result ${lastCheckin.result.toLowerCase()}`}>
              <strong>{lastCheckin.result}</strong>
              <small>{lastCheckin.ticketCode ?? 'Khong tim thay ticket'}</small>
            </div>
          )}
          <input className="text-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder="ebooking://ticket/..." />
          <button className="primary" disabled={!canScan || loading} onClick={onSubmit}>
            {loading ? 'Dang quet...' : 'Xac nhan ve'}
          </button>
          <small className="fine-print">Device: gate web-gate-01</small>
        </div>
      </div>
      <div className="scan-history">
        {history.length ? history.map((item, index) => (
          <div key={`${item.ticketCode ?? 'invalid'}-${index}`} className="scan-history-row">
            <span>{item.result}</span>
            <small>{item.ticketCode ?? 'INVALID'}</small>
          </div>
        )) : <p className="empty-scan">Chua co lan quet nao.</p>}
      </div>
    </section>
  );
}
