import { useEffect, useMemo, useState } from 'react';
import { Armchair, ArrowLeft, Check, Clock, RefreshCw, ShieldAlert, Tag } from 'lucide-react';
import { inventoryApi } from '../../api/inventoryApi';
import { formatDate, formatMoney } from '../../api/client';
import type { Event, Seat, SeatHoldResponse, Show } from '../../api/types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';

export function SeatSelectionView({
  event,
  show,
  onBack,
  onHoldSuccess,
}: {
  event: Event;
  show: Show;
  onBack: () => void;
  onHoldSuccess: (hold: SeatHoldResponse, selectedSeats: Seat[]) => void;
}) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState('');

  const loadSeats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await inventoryApi.getSeatMap(show.id);
      setSeats(data);
      // Remove any previously selected seat that is no longer available
      setSelectedSeatIds((prev) =>
        prev.filter((id) => data.some((s) => s.seatId === id && s.status === 'AVAILABLE'))
      );
    } catch (err: any) {
      setError(err?.message || 'Không thể tải sơ đồ ghế từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeats();
  }, [show.id]);

  // Group seats by section and row
  const groupedSeats = useMemo(() => {
    const sections: Record<string, Record<string, Seat[]>> = {};
    for (const seat of seats) {
      const sec = seat.section || 'A';
      const row = seat.row || '1';
      if (!sections[sec]) sections[sec] = {};
      if (!sections[sec][row]) sections[sec][row] = [];
      sections[sec][row].push(seat);
    }

    // Sort rows and numbers within each row
    for (const sec in sections) {
      for (const row in sections[sec]) {
        sections[sec][row].sort((a, b) => a.number - b.number);
      }
    }
    return sections;
  }, [seats]);

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== 'AVAILABLE') return;
    setSelectedSeatIds((prev) =>
      prev.includes(seat.seatId)
        ? prev.filter((id) => id !== seat.seatId)
        : prev.length >= 10
        ? prev // Max 10 seats
        : [...prev, seat.seatId]
    );
  };

  const selectedSeats = useMemo(() => {
    return seats.filter((s) => selectedSeatIds.includes(s.seatId));
  }, [seats, selectedSeatIds]);

  const totalAmount = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);
  }, [selectedSeats]);

  const handleHoldSeats = async () => {
    if (selectedSeatIds.length === 0) return;
    setHolding(true);
    setError('');

    try {
      const holdRes = await inventoryApi.createSeatHold(show.id, selectedSeatIds);
      onHoldSuccess(holdRes, selectedSeats);
    } catch (err: any) {
      setError(err?.message || 'Không thể giữ ghế. Có thể ghế vừa bị người khác chọn trước.');
      // Refresh seat map to get updated statuses
      loadSeats();
    } finally {
      setHolding(false);
    }
  };

  return (
    <section className="seat-selection-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <button
        type="button"
        onClick={onBack}
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
        <ArrowLeft size={16} /> Quay lại danh sách sự kiện
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>{event.category}</span>
          <h1 style={{ margin: '0.25rem 0 0.5rem', color: '#f8fafc', fontSize: '1.75rem' }}>{event.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            <span>Địa điểm: <b style={{ color: '#f8fafc' }}>{show.venueName}</b></span>
            <span>Suất: <b style={{ color: '#f8fafc' }}>{formatDate(show.startsAt)}</b></span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSeats}
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
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Làm mới ghế
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={loadSeats} />}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '1rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#334155', border: '1px solid #475569' }} />
          <span>Ghế trống</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#0284c7', border: '1px solid #38bdf8' }} />
          <span>Đang chọn</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#d97706', opacity: 0.6 }} />
          <span>Đang giữ chỗ</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#475569', opacity: 0.35, textDecoration: 'line-through' }} />
          <span>Đã bán</span>
        </div>
      </div>

      {/* Seat Map */}
      {loading ? (
        <LoadingSpinner message="Đang nạp sơ đồ ghế thực tế..." />
      ) : (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '2rem 1.5rem', marginBottom: '2rem' }}>
          {/* Stage representation */}
          <div style={{ width: '80%', height: '36px', margin: '0 auto 3rem', background: 'linear-gradient(to bottom, #38bdf820, transparent)', borderTop: '3px solid #38bdf8', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '3px' }}>
            SÂN KHẤU / MÀN HÌNH
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
            {Object.keys(groupedSeats).map((secName) => (
              <div key={secName} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>
                  KHU VỰC {secName}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.keys(groupedSeats[secName]).map((rowName) => (
                    <div key={rowName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                        {rowName}
                      </span>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {groupedSeats[secName][rowName].map((seat) => {
                          const isSelected = selectedSeatIds.includes(seat.seatId);
                          const isAvailable = seat.status === 'AVAILABLE';
                          const isHeld = seat.status === 'HELD';
                          const isSold = seat.status === 'SOLD';

                          let bg = '#1e293b';
                          let border = '1px solid #334155';
                          let color = '#94a3b8';
                          let cursor = 'pointer';

                          if (isSelected) {
                            bg = '#0284c7';
                            border = '1px solid #38bdf8';
                            color = '#ffffff';
                          } else if (isHeld) {
                            bg = '#d97706';
                            border = '1px solid #f59e0b';
                            color = '#ffffff';
                            cursor = 'not-allowed';
                          } else if (isSold) {
                            bg = '#334155';
                            border = '1px solid #1e293b';
                            color = '#64748b';
                            cursor = 'not-allowed';
                          }

                          return (
                            <button
                              key={seat.seatId}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => toggleSeat(seat)}
                              title={`${secName}-${rowName}${seat.number} - ${seat.status} (${formatMoney(seat.price)})`}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: bg,
                                border,
                                color,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                opacity: isSold ? 0.35 : isHeld ? 0.75 : 1,
                              }}
                            >
                              {seat.number}
                            </button>
                          );
                        })}
                      </div>

                      <span style={{ width: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                        {rowName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action panel */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Ghế đang chọn ({selectedSeats.length}/10):</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
            {selectedSeats.length > 0 ? (
              selectedSeats.map((s) => (
                <span key={s.seatId} style={{ background: '#0284c720', color: '#38bdf8', border: '1px solid #0284c750', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {s.section}-{s.row}{s.number}
                </span>
              ))
            ) : (
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Chưa chọn ghế nào</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Tổng tiền tạm tính</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>{formatMoney(totalAmount)}</span>
          </div>

          <button
            type="button"
            disabled={selectedSeats.length === 0 || holding}
            onClick={handleHoldSeats}
            style={{
              padding: '0.75rem 1.5rem',
              background: selectedSeats.length === 0 || holding ? '#334155' : '#0284c7',
              color: selectedSeats.length === 0 || holding ? '#64748b' : '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: selectedSeats.length === 0 || holding ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {holding ? <RefreshCw size={16} className="spin" /> : <Armchair size={16} />}
            {holding ? 'Đang giữ ghế...' : 'Tiến hành giữ ghế'}
          </button>
        </div>
      </div>
    </section>
  );
}
