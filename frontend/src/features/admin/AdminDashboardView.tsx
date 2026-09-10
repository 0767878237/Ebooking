import { useEffect, useState } from 'react';
import { Calendar, Eye, EyeOff, MapPin, Plus, RefreshCw, Shield, ShieldAlert, Tag, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { catalogApi } from '../../api/catalogApi';
import { formatDate } from '../../api/client';
import type { City, Event, Genre, Venue } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';

export function AdminDashboardView() {
  const { role } = useAuth();
  const canAccess = role === 'ADMIN' || role === 'ORGANIZER';

  const [activeTab, setActiveTab] = useState<'events' | 'catalog' | 'shows'>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Form states
  const [cityName, setCityName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueCityId, setVenueCityId] = useState('');
  const [venueAddress, setVenueAddress] = useState('');

  const [genreName, setGenreName] = useState('');
  const [genreSlug, setGenreSlug] = useState('');

  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventGenreId, setEventGenreId] = useState('');

  const [showEventId, setShowEventId] = useState('');
  const [showVenueId, setShowVenueId] = useState('');
  const [showStartsAt, setShowStartsAt] = useState('');
  const [showEndsAt, setShowEndsAt] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsRes, citiesRes, venuesRes, genresRes] = await Promise.all([
        adminApi.getAdminEvents(0, 100),
        catalogApi.getCities(0, 100),
        catalogApi.getVenues(undefined, 0, 100),
        catalogApi.getGenreDetails(),
      ]);

      setEvents(eventsRes.content);
      setCities(citiesRes.content);
      setVenues(venuesRes.content);
      setGenres(genresRes);

      if (citiesRes.content.length > 0 && !venueCityId) {
        setVenueCityId(citiesRes.content[0].id);
      }
      if (genresRes.length > 0 && !eventGenreId) {
        setEventGenreId(genresRes[0].id);
      }
      if (eventsRes.content.length > 0 && !showEventId) {
        setShowEventId(eventsRes.content[0].id);
      }
      if (venuesRes.content.length > 0 && !showVenueId) {
        setShowVenueId(venuesRes.content[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể nạp dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) {
      loadAllData();
    }
  }, [canAccess]);

  if (!canAccess) {
    return (
      <section style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
        <ShieldAlert size={48} style={{ color: '#f87171', margin: '0 auto 1rem' }} />
        <h2 style={{ color: '#f8fafc', margin: '0 0 0.5rem' }}>Truy cập bị từ chối</h2>
        <p style={{ color: '#94a3b8' }}>
          Bạn cần đăng nhập bằng tài khoản Quản trị viên (ADMIN) hoặc Ban tổ chức (ORGANIZER) để truy cập chức năng này.
        </p>
      </section>
    );
  }

  const showSuccess = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim()) return;
    setBusy(true);
    try {
      await adminApi.createCity(cityName.trim());
      setCityName('');
      showSuccess('Đã thêm thành phố mới.');
      loadAllData();
    } catch (err: any) {
      alert(err?.message || 'Lỗi thêm thành phố.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName.trim() || !venueCityId || !venueAddress.trim()) return;
    setBusy(true);
    try {
      await adminApi.createVenue({
        cityId: venueCityId,
        name: venueName.trim(),
        address: venueAddress.trim(),
      });
      setVenueName('');
      setVenueAddress('');
      showSuccess('Đã thêm địa điểm mới.');
      loadAllData();
    } catch (err: any) {
      alert(err?.message || 'Lỗi thêm địa điểm.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genreName.trim()) return;
    const slug = genreSlug.trim() || genreName.trim().toLowerCase().replace(/\s+/g, '-');
    setBusy(true);
    try {
      await adminApi.createGenre({ name: genreName.trim(), slug });
      setGenreName('');
      setGenreSlug('');
      showSuccess('Đã thêm thể loại mới.');
      loadAllData();
    } catch (err: any) {
      alert(err?.message || 'Lỗi thêm thể loại.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventGenreId) return;
    setBusy(true);
    try {
      await adminApi.createEvent({
        genreId: eventGenreId,
        title: eventTitle.trim(),
        description: eventDesc.trim(),
      });
      setEventTitle('');
      setEventDesc('');
      showSuccess('Đã tạo sự kiện mới.');
      loadAllData();
    } catch (err: any) {
      alert(err?.message || 'Lỗi tạo sự kiện.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEventId || !showVenueId || !showStartsAt || !showEndsAt) return;
    setBusy(true);
    try {
      await adminApi.createShow({
        eventId: showEventId,
        venueId: showVenueId,
        startsAt: new Date(showStartsAt).toISOString(),
        endsAt: new Date(showEndsAt).toISOString(),
      });
      showSuccess('Đã tạo suất diễn và tự động tạo sơ đồ ghế!');
      setShowStartsAt('');
      setShowEndsAt('');
      loadAllData();
    } catch (err: any) {
      alert(err?.message || 'Lỗi tạo suất diễn.');
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePublication = async (event: Event) => {
    setBusy(true);
    try {
      await adminApi.changePublication(event.id, !event.published);
      showSuccess(`Đã ${event.published ? 'hạ' : 'xuất bản'} sự kiện.`);
      loadAllData();
    } catch (err: any) {
      alert(err?.message || 'Lỗi thay đổi trạng thái sự kiện.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) return;
    setBusy(true);
    try {
      await adminApi.deleteEvent(eventId);
      showSuccess('Đã xóa sự kiện.');
      loadAllData();
    } catch (err: any) {
      alert(err?.message || 'Lỗi xóa sự kiện.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield style={{ color: '#fbbf24' }} /> Trung tâm Quản trị
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Quản lý Thành phố, Địa điểm, Sự kiện, Suất diễn và Sơ đồ ghế thực tế từ Backend
          </p>
        </div>

        <button
          type="button"
          onClick={loadAllData}
          disabled={loading || busy}
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

      {successNotice && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: '8px', color: '#34d399', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {successNotice}
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={loadAllData} />}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '2rem', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'events' ? '2px solid #fbbf24' : '2px solid transparent',
            color: activeTab === 'events' ? '#fbbf24' : '#94a3b8',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Sự kiện ({events.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shows')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'shows' ? '2px solid #fbbf24' : '2px solid transparent',
            color: activeTab === 'shows' ? '#fbbf24' : '#94a3b8',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Tạo Suất diễn & Ghế
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'catalog' ? '2px solid #fbbf24' : '2px solid transparent',
            color: activeTab === 'catalog' ? '#fbbf24' : '#94a3b8',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Thành phố, Địa điểm & Thể loại
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang nạp dữ liệu quản trị..." />
      ) : activeTab === 'events' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Create Event Form */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 1rem' }}>Tạo sự kiện mới</h2>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Thể loại</label>
                <select
                  value={eventGenreId}
                  onChange={(e) => setEventGenreId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
                >
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Tên sự kiện</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Ví dụ: Đêm nhạc Trịnh Ca"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Mô tả ngắn</label>
                <textarea
                  rows={3}
                  required
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Giới thiệu chương trình..."
                  style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                style={{ padding: '0.65rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}
              >
                + Tạo sự kiện
              </button>
            </form>
          </div>

          {/* Events List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: 0 }}>Danh sách sự kiện</h2>
            {events.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#1e293b', borderRadius: '8px', color: '#64748b' }}>
                Chưa có sự kiện nào. Hãy tạo sự kiện mới ở cột bên trái.
              </div>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>{evt.category}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          background: evt.published ? '#10b98120' : '#f59e0b20',
                          color: evt.published ? '#34d399' : '#fbbf24',
                        }}
                      >
                        {evt.published ? 'ĐÃ XUẤT BẢN' : 'BẢN NHÁP'}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 0.35rem', color: '#f8fafc', fontSize: '1.1rem' }}>{evt.title}</h3>
                    <p style={{ margin: '0 0 0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>{evt.description}</p>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Số suất diễn: <b>{evt.shows?.length || 0}</b>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleTogglePublication(evt)}
                      title={evt.published ? 'Hạ xuống bản nháp' : 'Xuất bản ra trang chủ'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.75rem',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: evt.published ? '#fbbf24' : '#34d399',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {evt.published ? <EyeOff size={14} /> : <Eye size={14} />}
                      {evt.published ? 'Hạ bài' : 'Xuất bản'}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDeleteEvent(evt.id)}
                      title="Xóa sự kiện"
                      style={{
                        padding: '0.45rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#f87171',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'shows' ? (
        <div style={{ maxWidth: '640px', margin: '0 auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#f8fafc', margin: '0 0 0.5rem' }}>Lên lịch suất diễn (Show)</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
            Khi tạo suất diễn, hệ thống sẽ tự động nhân bản toàn bộ sơ đồ ghế từ địa điểm tổ chức để khách hàng có thể chọn và giữ ghế ngay lập tức.
          </p>

          <form onSubmit={handleCreateShow} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>Chọn sự kiện</label>
              <select
                value={showEventId}
                onChange={(e) => setShowEventId(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>Chọn địa điểm tổ chức</label>
              <select
                value={showVenueId}
                onChange={(e) => setShowVenueId(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.address})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>Thời gian bắt đầu</label>
                <input
                  type="datetime-local"
                  required
                  value={showStartsAt}
                  onChange={(e) => setShowStartsAt(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>Thời gian kết thúc</label>
                <input
                  type="datetime-local"
                  required
                  value={showEndsAt}
                  onChange={(e) => setShowEndsAt(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: '0.5rem',
                padding: '0.8rem',
                background: '#fbbf24',
                color: '#0f172a',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? 'Đang tạo suất diễn...' : 'Tạo suất diễn & Tự động sinh ghế'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* City Form */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 1rem' }}>Thêm thành phố</h2>
            <form onSubmit={handleCreateCity} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                required
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Tên thành phố (Hà Nội, TP.HCM...)"
                style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
              />
              <button type="submit" disabled={busy} style={{ padding: '0.5rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                + Thêm thành phố
              </button>
            </form>
            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {cities.map((c) => (
                <span key={c.id} style={{ background: '#0f172a', color: '#cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          {/* Venue Form */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 1rem' }}>Thêm địa điểm</h2>
            <form onSubmit={handleCreateVenue} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select
                value={venueCityId}
                onChange={(e) => setVenueCityId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Tên địa điểm"
                style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
              />
              <input
                type="text"
                required
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Địa chỉ chi tiết"
                style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
              />
              <button type="submit" disabled={busy} style={{ padding: '0.5rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                + Thêm địa điểm
              </button>
            </form>
          </div>

          {/* Genre Form */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 1rem' }}>Thêm thể loại</h2>
            <form onSubmit={handleCreateGenre} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                required
                value={genreName}
                onChange={(e) => setGenreName(e.target.value)}
                placeholder="Tên thể loại (Âm nhạc, Hài kịch...)"
                style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
              />
              <input
                type="text"
                value={genreSlug}
                onChange={(e) => setGenreSlug(e.target.value)}
                placeholder="Slug (tùy chọn: am-nhac)"
                style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
              />
              <button type="submit" disabled={busy} style={{ padding: '0.5rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                + Thêm thể loại
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
