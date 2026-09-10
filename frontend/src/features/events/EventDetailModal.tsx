import { Calendar, Clock, MapPin, Tag, X } from 'lucide-react';
import { formatDate } from '../../api/client';
import type { Event, Show } from '../../api/types';

export function EventDetailModal({
  event,
  onClose,
  onSelectShow,
}: {
  event: Event | null;
  onClose: () => void;
  onSelectShow: (event: Event, show: Show) => void;
}) {
  if (!event) return null;

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="modal-content" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.75rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', color: '#f8fafc', position: 'relative' }}>
        <button
          type="button"
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#0284c720', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          <Tag size={13} /> {event.category || 'Sự kiện'}
        </div>

        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem', color: '#f8fafc', lineHeight: 1.3 }}>{event.title}</h2>
        <p style={{ margin: '0 0 1.5rem', color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.6 }}>{event.description}</p>

        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} /> Các suất diễn khả dụng
        </h3>

        {event.shows && event.shows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {event.shows.map((show) => {
              const starts = new Date(show.startsAt);
              const isPast = starts.getTime() < Date.now();

              return (
                <div
                  key={show.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontWeight: 600 }}>
                      <Clock size={15} style={{ color: '#38bdf8' }} />
                      <span>{formatDate(show.startsAt)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      <MapPin size={14} />
                      <span>{show.venueName}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      onClose();
                      onSelectShow(event, show);
                    }}
                    style={{
                      padding: '0.55rem 1.1rem',
                      background: isPast ? '#334155' : '#0284c7',
                      color: isPast ? '#94a3b8' : '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: isPast ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isPast ? 'Đã qua' : 'Chọn ghế'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '1.5rem', textAlign: 'center', background: '#0f172a', borderRadius: '8px', color: '#94a3b8' }}>
            Chưa có suất diễn nào được lên lịch cho sự kiện này.
          </div>
        )}
      </div>
    </div>
  );
}
