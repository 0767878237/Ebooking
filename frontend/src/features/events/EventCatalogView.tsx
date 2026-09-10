import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Filter, MapPin, Search, Tag } from 'lucide-react';
import { catalogApi } from '../../api/catalogApi';
import { eventsApi } from '../../api/eventsApi';
import { formatDateShort } from '../../api/client';
import type { City, Event, Genre, Show, Venue } from '../../api/types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { EmptyState } from '../../components/common/EmptyState';
import { EventDetailModal } from './EventDetailModal';

export function EventCatalogView({
  onSelectShow,
}: {
  onSelectShow: (event: Event, show: Show) => void;
}) {
  const [events, setEvents] = useState<Event[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [genres, setGenres] = useState<string[]>([]);

  const [keyword, setKeyword] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  // Load filter options (cities, venues, genres)
  useEffect(() => {
    let active = true;
    async function loadFilters() {
      try {
        const [citiesRes, genresRes] = await Promise.all([
          catalogApi.getCities(0, 100),
          catalogApi.getGenres(),
        ]);
        if (active) {
          setCities(citiesRes.content);
          setGenres(genresRes);
        }
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    }
    loadFilters();
    return () => { active = false; };
  }, []);

  // Reload venues when selected city changes
  useEffect(() => {
    let active = true;
    async function loadVenues() {
      try {
        const venuesRes = await catalogApi.getVenues(selectedCityId || undefined, 0, 100);
        if (active) {
          setVenues(venuesRes.content);
        }
      } catch (err) {
        console.error('Failed to load venues:', err);
      }
    }
    loadVenues();
    return () => { active = false; };
  }, [selectedCityId]);

  // Load events when search filters or page changes
  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventsApi.searchEvents({
        keyword,
        genre: selectedGenre,
        cityId: selectedCityId || undefined,
        venueId: selectedVenueId || undefined,
        page,
        size: 12,
      });

      // Map backend events
      setEvents(res.content);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách sự kiện từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, selectedCityId, selectedVenueId, selectedGenre]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchEvents();
  };

  const handleResetFilters = () => {
    setKeyword('');
    setSelectedCityId('');
    setSelectedVenueId('');
    setSelectedGenre('');
    setPage(0);
  };

  return (
    <section className="catalog-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem' }}>
          Khám phá sự kiện nổi bật
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '1rem' }}>
          Tìm kiếm và đặt vé trực tuyến nhanh chóng, bảo đảm chỗ ngồi thời gian thực
        </p>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleSearchSubmit} style={{ background: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {/* Keyword search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', color: '#64748b' }} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tên sự kiện, ca sĩ..."
              style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}
            />
          </div>

          {/* City select */}
          <select
            value={selectedCityId}
            onChange={(e) => {
              setSelectedCityId(e.target.value);
              setSelectedVenueId('');
              setPage(0);
            }}
            style={{ padding: '0.65rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}
          >
            <option value="">Tất cả thành phố</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>

          {/* Venue select */}
          <select
            value={selectedVenueId}
            onChange={(e) => {
              setSelectedVenueId(e.target.value);
              setPage(0);
            }}
            style={{ padding: '0.65rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}
          >
            <option value="">Tất cả địa điểm</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>{venue.name}</option>
            ))}
          </select>

          {/* Genre select */}
          <select
            value={selectedGenre}
            onChange={(e) => {
              setSelectedGenre(e.target.value);
              setPage(0);
            }}
            style={{ padding: '0.65rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}
          >
            <option value="">Tất cả thể loại</option>
            {genres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Đặt lại bộ lọc
          </button>
          <button
            type="submit"
            style={{ padding: '0.5rem 1.25rem', background: '#0284c7', border: 'none', color: '#ffffff', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Tìm kiếm
          </button>
        </div>
      </form>

      {/* Content Area */}
      {loading ? (
        <LoadingSpinner message="Đang tìm kiếm sự kiện..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchEvents} />
      ) : events.length === 0 ? (
        <EmptyState
          title="Không tìm thấy sự kiện nào"
          message="Không có sự kiện nào phù hợp với điều kiện tìm kiếm của bạn. Hãy thử thay đổi bộ lọc."
          action={
            <button
              type="button"
              onClick={handleResetFilters}
              style={{ padding: '0.6rem 1.2rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              Xem tất cả sự kiện
            </button>
          }
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {events.map((evt) => {
              const earliestShow = evt.shows && evt.shows.length > 0 ? evt.shows[0] : null;

              return (
                <article
                  key={evt.id}
                  onClick={() => setDetailEvent(evt)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = '#38bdf8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#334155';
                  }}
                >
                  <div
                    style={{
                      height: '140px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #1e1b4b 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      padding: '1rem',
                    }}
                  >
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '2px' }}>
                      {evt.title.slice(0, 3).toUpperCase()}
                    </span>
                    <span
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(4px)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#38bdf8',
                        fontWeight: 600,
                      }}
                    >
                      {evt.category || 'Event'}
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1.15rem', lineHeight: 1.4, fontWeight: 700 }}>
                      {evt.title}
                    </h3>
                    <p style={{ margin: '0 0 1rem', color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {evt.description}
                    </p>

                    <div style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {earliestShow ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                            <Calendar size={14} style={{ color: '#38bdf8' }} />
                            <span>{formatDateShort(earliestShow.startsAt)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                            <MapPin size={14} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {earliestShow.venueName}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Chưa có suất diễn</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0.85rem',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: page === 0 ? '#475569' : '#f8fafc',
                  borderRadius: '6px',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                <ChevronLeft size={16} /> Trang trước
              </button>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                Trang {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0.85rem',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: page >= totalPages - 1 ? '#475569' : '#f8fafc',
                  borderRadius: '6px',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Trang sau <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Show detail modal */}
      <EventDetailModal
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onSelectShow={onSelectShow}
      />
    </section>
  );
}
