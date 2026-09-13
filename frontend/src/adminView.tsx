import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Eye,
  EyeOff,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';

type IdentityRole = 'USER' | 'CHECK_IN_STAFF' | 'ADMIN';

type IdentitySession = {
  key: IdentityRole;
  userId: string;
  role: IdentityRole;
  displayName: string;
  email: string;
};

type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

type City = { id: string; name: string };
type Venue = { id: string; cityId: string; name: string; address: string };
type Genre = { id: string; name: string; slug: string };
type Show = { id: string; venueId: string; venueName: string; startsAt: string; endsAt: string };
type Event = {
  id: string;
  title: string;
  description: string;
  category: string;
  published: boolean;
  shows: Show[];
};

type RequestClient = <T>(path: string, options?: RequestInit) => Promise<T>;

function formatDate(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function formToIso(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return '';
  }
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

function getTomorrowDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function AdminWorkspace({
  identity,
  request,
}: {
  identity: IdentitySession;
  request: RequestClient;
}) {
  const canEdit = identity.role === 'ADMIN';
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modal open states
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Advanced individual create states
  const [advCityName, setAdvCityName] = useState('');
  const [advGenreName, setAdvGenreName] = useState('');
  const [advGenreSlug, setAdvGenreSlug] = useState('');
  const [advVenueCityId, setAdvVenueCityId] = useState('');
  const [advVenueName, setAdvVenueName] = useState('');
  const [advVenueAddress, setAdvVenueAddress] = useState('');

  // Advanced catalog tabs & editing states
  const [advTab, setAdvTab] = useState<'cities' | 'genres' | 'venues'>('cities');
  const [editingCity, setEditingCity] = useState<{ id: string; name: string } | null>(null);
  const [editingGenre, setEditingGenre] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [editingVenue, setEditingVenue] = useState<{ id: string; cityId: string; name: string; address: string } | null>(null);

  // Refresh all visible catalog data after each write.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cityPage, venuePage, genreDetails, eventPage] = await Promise.all([
          request<PageResponse<City>>('/api/catalog/cities?page=0&size=100'),
          request<PageResponse<Venue>>('/api/catalog/venues?page=0&size=100'),
          request<Genre[]>('/api/catalog/genres/details'),
          request<PageResponse<Event>>('/api/admin/events?size=100'),
        ]);

        if (!cancelled) {
          setCities(cityPage.content);
          setVenues(venuePage.content);
          setGenres(genreDetails);
          setEvents(eventPage.content);
          setAdvVenueCityId((current) => current || cityPage.content[0]?.id || '');
        }
      } catch {
        if (!cancelled) {
          setNotice('Không thể tải dữ liệu quản trị catalog.');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [request, refresh]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch =
        !searchQuery.trim() ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.category && ev.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && ev.published) ||
        (statusFilter === 'draft' && !ev.published);

      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  const totalShows = useMemo(() => {
    return events.reduce((sum, ev) => sum + (ev.shows?.length || 0), 0);
  }, [events]);

  async function mutate<T>(label: string, fn: () => Promise<T>) {
    if (!canEdit) {
      setNotice('Bạn không có quyền thực hiện thao tác này. Cần tài khoản ADMIN.');
      return;
    }
    setBusy(true);
    try {
      await fn();
      setNotice(`${label} thành công.`);
      setRefresh((value) => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${label} thất bại.`);
    } finally {
      setBusy(false);
    }
  }

  // City update & delete handlers
  const handleUpdateCity = async () => {
    if (!editingCity || !editingCity.name.trim()) return;
    await mutate(`Cập nhật thành phố`, async () => {
      await request(`/api/admin/cities/${editingCity.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editingCity.name.trim() }),
      });
      setEditingCity(null);
    });
  };

  const handleDeleteCity = async (city: City) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thành phố "${city.name}"?`)) {
      await mutate(`Xóa thành phố`, async () => {
        await request(`/api/admin/cities/${city.id}`, { method: 'DELETE' });
      });
    }
  };

  // Genre update & delete handlers
  const handleUpdateGenre = async () => {
    if (!editingGenre || !editingGenre.name.trim() || !editingGenre.slug.trim()) return;
    await mutate(`Cập nhật thể loại`, async () => {
      await request(`/api/admin/genres/${editingGenre.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editingGenre.name.trim(), slug: editingGenre.slug.trim().toLowerCase() }),
      });
      setEditingGenre(null);
    });
  };

  const handleDeleteGenre = async (genre: Genre) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thể loại "${genre.name}"?`)) {
      await mutate(`Xóa thể loại`, async () => {
        await request(`/api/admin/genres/${genre.id}`, { method: 'DELETE' });
      });
    }
  };

  // Venue update & delete handlers
  const handleUpdateVenue = async () => {
    if (!editingVenue || !editingVenue.name.trim() || !editingVenue.cityId || !editingVenue.address.trim()) return;
    await mutate(`Cập nhật địa điểm`, async () => {
      await request(`/api/admin/venues/${editingVenue.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          cityId: editingVenue.cityId,
          name: editingVenue.name.trim(),
          address: editingVenue.address.trim(),
        }),
      });
      setEditingVenue(null);
    });
  };

  const handleDeleteVenue = async (venue: Venue) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa địa điểm "${venue.name}"?`)) {
      await mutate(`Xóa địa điểm`, async () => {
        await request(`/api/admin/venues/${venue.id}`, { method: 'DELETE' });
      });
    }
  };

  if (!canEdit) {
    return (
      <section className="content standalone" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', background: '#fffdf8', border: '1px solid #dcd6cb', padding: '2rem' }}>
          <h2 style={{ color: '#db5a39', marginBottom: '1rem' }}>Giới hạn quyền truy cập</h2>
          <p style={{ color: '#77796e', fontSize: '0.875rem' }}>
            Trang này chỉ dành cho tài khoản <strong>Quản trị viên (ADMIN)</strong>. Vui lòng đăng nhập với tài khoản ADMIN để thao tác.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="content standalone" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p className="eyebrow" style={{ color: '#db5a39', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            Hệ thống quản trị
          </p>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#1e293b', margin: '0.25rem 0' }}>
            Quản lý Sự kiện & Suất diễn
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Thêm sự kiện nhanh chóng, cấu hình 3 hạng vé (Super VIP, VIP, Thường) và kiểm soát trạng thái xuất bản.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => setIsQuickCreateOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: '#db5a39',
            color: '#fff',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: '0 4px 12px rgba(219, 90, 57, 0.25)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          <span>Thêm sự kiện mới</span>
        </button>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className="admin-notice"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            backgroundColor: notice.includes('thất bại') || notice.includes('Không thể') ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${notice.includes('thất bại') || notice.includes('Không thể') ? '#fecaca' : '#bbf7d0'}`,
            color: notice.includes('thất bại') || notice.includes('Không thể') ? '#991b1b' : '#166534',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <AdminStat icon={<Ticket size={24} />} label="Tổng số sự kiện" value={String(events.length)} />
        <AdminStat
          icon={<Sparkles size={24} />}
          label="Đang xuất bản"
          value={String(events.filter((e) => e.published).length)}
        />
        <AdminStat icon={<Calendar size={24} />} label="Tổng suất diễn" value={String(totalShows)} />
        <AdminStat
          icon={<MapPin size={24} />}
          label="Địa điểm / Thành phố"
          value={`${venues.length} điểm / ${cities.length} TP`}
        />
      </div>

      {/* Main Events Management Section */}
      <div style={{ background: '#fffdf8', border: '1px solid #dcd6cb', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
              Danh sách sự kiện ({filteredEvents.length})
            </h2>
            <small style={{ color: '#64748b' }}>Quản lý đóng/mở bán vé, kiểm tra số suất diễn và cập nhật trạng thái</small>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm tên sự kiện, danh mục..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                  fontSize: '0.8125rem',
                  border: '1px solid #cfc9bc',
                  borderRadius: '6px',
                  outline: 'none',
                  background: '#fff',
                  width: '230px',
                }}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'inline-flex', border: '1px solid #cfc9bc', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: statusFilter === 'all' ? '#1e293b' : '#fff',
                  color: statusFilter === 'all' ? '#fff' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('published')}
                style={{
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  borderLeft: '1px solid #cfc9bc',
                  background: statusFilter === 'published' ? '#166534' : '#fff',
                  color: statusFilter === 'published' ? '#fff' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Đã xuất bản
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('draft')}
                style={{
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  borderLeft: '1px solid #cfc9bc',
                  background: statusFilter === 'draft' ? '#9a3412' : '#fff',
                  color: statusFilter === 'draft' ? '#fff' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                Bản nháp
              </button>
            </div>
          </div>
        </div>

        {/* Events Table / List */}
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            <Ticket size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ margin: 0, fontWeight: 500 }}>Không tìm thấy sự kiện nào phù hợp.</p>
            <button
              className="primary"
              onClick={() => setIsQuickCreateOpen(true)}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#db5a39',
                color: '#fff',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
              }}
            >
              + Tạo sự kiện mới ngay
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filteredEvents.map((event) => {
              const primaryShow = event.shows?.[0];
              return (
                <article
                  key={event.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    border: '1px solid #e0dacf',
                    background: '#faf7ef',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Left: Info */}
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{event.title}</strong>
                      {event.category && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            background: '#e2e8f0',
                            color: '#475569',
                          }}
                        >
                          {event.category}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8125rem', lineHeight: 1.4, maxHeight: '2.8em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.description || 'Chưa có mô tả'}
                    </p>
                    {primaryShow && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.75rem', color: '#77796e' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={13} style={{ color: '#db5a39' }} /> {primaryShow.venueName}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={13} /> {formatDate(primaryShow.startsAt)}
                        </span>
                        <span>· {event.shows.length} suất diễn</span>
                      </div>
                    )}
                  </div>

                  {/* Center: Status Badge */}
                  <div>
                    {event.published ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#15803d' }} />
                        Đã xuất bản
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#b45309' }} />
                        Bản nháp
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        mutate(event.published ? 'Gỡ xuất bản' : 'Xuất bản', async () => {
                          await request(`/api/admin/events/${event.id}/publication`, {
                            method: 'PATCH',
                            body: JSON.stringify({ published: !event.published }),
                          });
                        })
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #cfc9bc',
                        backgroundColor: '#fff',
                        color: event.published ? '#b45309' : '#15803d',
                        cursor: 'pointer',
                      }}
                      title={event.published ? 'Chuyển về trạng thái bản nháp' : 'Xuất bản để người dùng có thể mua vé'}
                    >
                      {event.published ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{event.published ? 'Gỡ' : 'Xuất bản'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc chắn muốn xóa sự kiện "${event.title}" không?`)) {
                          mutate('Xóa sự kiện', async () => {
                            await request(`/api/admin/events/${event.id}`, { method: 'DELETE' });
                          });
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fff',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                      title="Xóa sự kiện"
                    >
                      <Trash2 size={14} />
                      <span>Xóa</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Accordion for Individual Catalog Items */}
      <div style={{ background: '#fffdf8', border: '1px solid #dcd6cb', borderRadius: '8px', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setIsAdvancedOpen((prev) => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            background: '#f8fafc',
            border: 'none',
            borderBottom: isAdvancedOpen ? '1px solid #dcd6cb' : 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={16} />
            Cấu hình nâng cao: Quản lý riêng Thành phố, Thể loại & Địa điểm
          </span>
          {isAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isAdvancedOpen && (
          <div style={{ padding: '1.5rem' }}>
            {/* Sub-tabs for Cities / Genres / Venues */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAdvTab('cities')}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: advTab === 'cities' ? '#db5a39' : '#f1f5f9',
                  color: advTab === 'cities' ? '#fff' : '#475569',
                  cursor: 'pointer',
                }}
              >
                🏙️ Thành phố ({cities.length})
              </button>
              <button
                type="button"
                onClick={() => setAdvTab('genres')}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: advTab === 'genres' ? '#db5a39' : '#f1f5f9',
                  color: advTab === 'genres' ? '#fff' : '#475569',
                  cursor: 'pointer',
                }}
              >
                🎭 Thể loại ({genres.length})
              </button>
              <button
                type="button"
                onClick={() => setAdvTab('venues')}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: advTab === 'venues' ? '#db5a39' : '#f1f5f9',
                  color: advTab === 'venues' ? '#fff' : '#475569',
                  cursor: 'pointer',
                }}
              >
                📍 Địa điểm ({venues.length})
              </button>
            </div>

            {/* TAB 1: CITIES */}
            {advTab === 'cities' && (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Add new City form */}
                <div style={{ background: '#fff', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#1e293b' }}>
                    + Thêm Thành phố mới
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Tên thành phố (VD: Cần Thơ, Hải Phòng...)"
                      value={advCityName}
                      onChange={(e) => setAdvCityName(e.target.value)}
                      style={{ flex: '1 1 200px', margin: 0 }}
                    />
                    <button
                      type="button"
                      className="primary"
                      disabled={busy || !advCityName.trim()}
                      onClick={() =>
                        mutate('Tạo thành phố', async () => {
                          await request('/api/admin/cities', {
                            method: 'POST',
                            body: JSON.stringify({ name: advCityName.trim() }),
                          });
                          setAdvCityName('');
                        })
                      }
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Plus size={15} /> Thêm
                    </button>
                  </div>
                </div>

                {/* Cities list with Edit & Delete */}
                <div style={{ background: '#fff', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#1e293b' }}>
                    Danh sách Thành phố ({cities.length})
                  </h3>
                  {cities.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: 0 }}>Chưa có thành phố nào.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {cities.map((city) => {
                        const isEditing = editingCity?.id === city.id;
                        return (
                          <div
                            key={city.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                              padding: '0.625rem 0.85rem',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 300px' }}>
                                <input
                                  type="text"
                                  value={editingCity.name}
                                  onChange={(e) => setEditingCity({ ...editingCity, name: e.target.value })}
                                  style={{
                                    flex: 1,
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.8125rem',
                                    border: '1px solid #cfc9bc',
                                    borderRadius: '4px',
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={busy || !editingCity.name.trim()}
                                  onClick={handleUpdateCity}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#166534',
                                    color: '#fff',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Check size={13} /> Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCity(null)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: '1px solid #cfc9bc',
                                    backgroundColor: '#fff',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <X size={13} /> Hủy
                                </button>
                              </div>
                            ) : (
                              <>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                                  {city.name}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setEditingCity({ id: city.id, name: city.name })}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid #cfc9bc',
                                      backgroundColor: '#fff',
                                      color: '#0284c7',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Pencil size={13} /> Sửa
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleDeleteCity(city)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fff',
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Trash2 size={13} /> Xóa
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: GENRES */}
            {advTab === 'genres' && (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Add new Genre form */}
                <div style={{ background: '#fff', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#1e293b' }}>
                    + Thêm Thể loại mới
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Tên thể loại (VD: Hòa nhạc thính phòng)"
                      value={advGenreName}
                      onChange={(e) => {
                        setAdvGenreName(e.target.value);
                        if (!advGenreSlug) {
                          setAdvGenreSlug(
                            e.target.value
                              .toLowerCase()
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .replace(/[đĐ]/g, 'd')
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-+|-+$/g, '')
                          );
                        }
                      }}
                      style={{ margin: 0 }}
                    />
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Slug (VD: hoa-nhac-thinh-phong)"
                      value={advGenreSlug}
                      onChange={(e) => setAdvGenreSlug(e.target.value)}
                      style={{ margin: 0 }}
                    />
                  </div>
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || !advGenreName.trim() || !advGenreSlug.trim()}
                    onClick={() =>
                      mutate('Tạo thể loại', async () => {
                        await request('/api/admin/genres', {
                          method: 'POST',
                          body: JSON.stringify({ name: advGenreName.trim(), slug: advGenreSlug.trim() }),
                        });
                        setAdvGenreName('');
                        setAdvGenreSlug('');
                      })
                    }
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Plus size={15} /> Thêm Thể loại
                  </button>
                </div>

                {/* Genres list with Edit & Delete */}
                <div style={{ background: '#fff', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#1e293b' }}>
                    Danh sách Thể loại ({genres.length})
                  </h3>
                  {genres.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: 0 }}>Chưa có thể loại nào.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {genres.map((genre) => {
                        const isEditing = editingGenre?.id === genre.id;
                        return (
                          <div
                            key={genre.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                              padding: '0.625rem 0.85rem',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 300px', flexWrap: 'wrap' }}>
                                <input
                                  type="text"
                                  placeholder="Tên thể loại"
                                  value={editingGenre.name}
                                  onChange={(e) => setEditingGenre({ ...editingGenre, name: e.target.value })}
                                  style={{
                                    flex: '1 1 140px',
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.8125rem',
                                    border: '1px solid #cfc9bc',
                                    borderRadius: '4px',
                                  }}
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  placeholder="Slug"
                                  value={editingGenre.slug}
                                  onChange={(e) => setEditingGenre({ ...editingGenre, slug: e.target.value })}
                                  style={{
                                    flex: '1 1 140px',
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.8125rem',
                                    border: '1px solid #cfc9bc',
                                    borderRadius: '4px',
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={busy || !editingGenre.name.trim() || !editingGenre.slug.trim()}
                                  onClick={handleUpdateGenre}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#166534',
                                    color: '#fff',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Check size={13} /> Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingGenre(null)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: '1px solid #cfc9bc',
                                    backgroundColor: '#fff',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <X size={13} /> Hủy
                                </button>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                                    {genre.name}
                                  </span>
                                  <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569' }}>
                                    {genre.slug}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setEditingGenre({ id: genre.id, name: genre.name, slug: genre.slug })}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid #cfc9bc',
                                      backgroundColor: '#fff',
                                      color: '#0284c7',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Pencil size={13} /> Sửa
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleDeleteGenre(genre)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fff',
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Trash2 size={13} /> Xóa
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: VENUES */}
            {advTab === 'venues' && (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Add new Venue form */}
                <div style={{ background: '#fff', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#1e293b' }}>
                    + Thêm Địa điểm mới
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select
                      className="text-input"
                      value={advVenueCityId}
                      onChange={(e) => setAdvVenueCityId(e.target.value)}
                      style={{ margin: 0 }}
                    >
                      <option value="">Chọn thành phố</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Tên địa điểm (VD: SVĐ Mỹ Đình)"
                      value={advVenueName}
                      onChange={(e) => setAdvVenueName(e.target.value)}
                      style={{ margin: 0 }}
                    />
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Địa chỉ cụ thể"
                      value={advVenueAddress}
                      onChange={(e) => setAdvVenueAddress(e.target.value)}
                      style={{ margin: 0 }}
                    />
                  </div>
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || !advVenueCityId || !advVenueName.trim() || !advVenueAddress.trim()}
                    onClick={() =>
                      mutate('Tạo địa điểm', async () => {
                        await request('/api/admin/venues', {
                          method: 'POST',
                          body: JSON.stringify({
                            cityId: advVenueCityId,
                            name: advVenueName.trim(),
                            address: advVenueAddress.trim(),
                          }),
                        });
                        setAdvVenueName('');
                        setAdvVenueAddress('');
                      })
                    }
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Plus size={15} /> Thêm Địa điểm
                  </button>
                </div>

                {/* Venues list with Edit & Delete */}
                <div style={{ background: '#fff', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#1e293b' }}>
                    Danh sách Địa điểm ({venues.length})
                  </h3>
                  {venues.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: 0 }}>Chưa có địa điểm nào.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {venues.map((venue) => {
                        const isEditing = editingVenue?.id === venue.id;
                        const cityName = cities.find((c) => c.id === venue.cityId)?.name || 'Chưa rõ';
                        return (
                          <div
                            key={venue.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                              padding: '0.625rem 0.85rem',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 320px', flexWrap: 'wrap' }}>
                                <select
                                  value={editingVenue.cityId}
                                  onChange={(e) => setEditingVenue({ ...editingVenue, cityId: e.target.value })}
                                  style={{
                                    flex: '1 1 130px',
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.8125rem',
                                    border: '1px solid #cfc9bc',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {cities.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="Tên địa điểm"
                                  value={editingVenue.name}
                                  onChange={(e) => setEditingVenue({ ...editingVenue, name: e.target.value })}
                                  style={{
                                    flex: '1 1 150px',
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.8125rem',
                                    border: '1px solid #cfc9bc',
                                    borderRadius: '4px',
                                  }}
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  placeholder="Địa chỉ"
                                  value={editingVenue.address}
                                  onChange={(e) => setEditingVenue({ ...editingVenue, address: e.target.value })}
                                  style={{
                                    flex: '1 1 180px',
                                    padding: '0.35rem 0.5rem',
                                    fontSize: '0.8125rem',
                                    border: '1px solid #cfc9bc',
                                    borderRadius: '4px',
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={busy || !editingVenue.name.trim() || !editingVenue.address.trim() || !editingVenue.cityId}
                                  onClick={handleUpdateVenue}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#166534',
                                    color: '#fff',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Check size={13} /> Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingVenue(null)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: '1px solid #cfc9bc',
                                    backgroundColor: '#fff',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <X size={13} /> Hủy
                                </button>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>{venue.name}</strong>
                                    <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                                      {cityName}
                                    </span>
                                  </div>
                                  <small style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                                    {venue.address}
                                  </small>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      setEditingVenue({
                                        id: venue.id,
                                        cityId: venue.cityId,
                                        name: venue.name,
                                        address: venue.address,
                                      })
                                    }
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid #cfc9bc',
                                      backgroundColor: '#fff',
                                      color: '#0284c7',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Pencil size={13} /> Sửa
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleDeleteVenue(venue)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.3rem 0.6rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fff',
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Trash2 size={13} /> Xóa
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Create Event Modal */}
      {isQuickCreateOpen && (
        <QuickCreateModal
          genres={genres}
          cities={cities}
          venues={venues}
          busy={busy}
          onClose={() => setIsQuickCreateOpen(false)}
          onSubmit={async (payload) => {
            await mutate('Tạo sự kiện & Sơ đồ giá vé', async () => {
              await request('/api/admin/events/quick-create', {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              setIsQuickCreateOpen(false);
            });
          }}
        />
      )}
    </section>
  );
}

function AdminStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div
      className="admin-stat"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1.25rem',
        background: '#fffdf8',
        border: '1px solid #dcd6cb',
        borderRadius: '8px',
      }}
    >
      <div style={{ color: '#db5a39', background: '#fff2ee', padding: '0.75rem', borderRadius: '8px' }}>
        {icon}
      </div>
      <div>
        <small style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>{label}</small>
        <strong style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{value}</strong>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Quick Create Event Modal with 3-tier pricing (SUPER VIP, VIP, NORMAL)
// -------------------------------------------------------------------------

type QuickCreateModalProps = {
  genres: Genre[];
  cities: City[];
  venues: Venue[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    genreName?: string;
    genreId?: string;
    cityName?: string;
    cityId?: string;
    venueName?: string;
    venueId?: string;
    venueAddress?: string;
    startsAt: string;
    endsAt: string;
    published: boolean;
    superVipPrice: number;
    vipPrice: number;
    normalPrice: number;
  }) => Promise<void>;
};

function QuickCreateModal({ genres, cities, venues, busy, onClose, onSubmit }: QuickCreateModalProps) {
  const isBackdropMouseDown = useRef(false);

  // Step 1: Basic Event info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genreName, setGenreName] = useState(genres[0]?.name || 'Ca nhạc');

  // Step 2: Venue & Location info
  const [cityName, setCityName] = useState(cities[0]?.name || 'Hà Nội');
  const [venueName, setVenueName] = useState(venues[0]?.name || 'Nhà hát Lớn');
  const [venueAddress, setVenueAddress] = useState(venues[0]?.address || '1 Tràng Tiền, Hoàn Kiếm, Hà Nội');

  // Step 3: Date & Showtime
  const [date, setDate] = useState(getTomorrowDateStr());
  const [timeStart, setTimeStart] = useState('19:30');
  const [timeEnd, setTimeEnd] = useState('22:00');

  // Step 4: 3-tier Pricing
  const [superVipPrice, setSuperVipPrice] = useState(500000);
  const [vipPrice, setVipPrice] = useState(300000);
  const [normalPrice, setNormalPrice] = useState(150000);

  // Step 5: Options
  const [published, setPublished] = useState(true);

  // Quick genre selector tags
  const popularGenres = ['Ca nhạc', 'EDM Concert', 'Hài kịch', 'Hội thảo', 'Kịch nghệ', 'Thể thao'];

  // Update venue address if user chooses an existing venue name
  const handleVenueChange = (name: string) => {
    setVenueName(name);
    const matched = venues.find((v) => v.name.toLowerCase() === name.toLowerCase());
    if (matched) {
      setVenueAddress(matched.address);
      const matchedCity = cities.find((c) => c.id === matched.cityId);
      if (matchedCity) {
        setCityName(matchedCity.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tên sự kiện');
      return;
    }
    if (!date || !timeStart || !timeEnd) {
      alert('Vui lòng chọn ngày và giờ biểu diễn');
      return;
    }

    const startsAt = formToIso(date, timeStart);
    const endsAt = formToIso(date, timeEnd);

    await onSubmit({
      title: title.trim(),
      description: description.trim() || `Sự kiện ${title.trim()} tổ chức tại ${venueName.trim()}`,
      genreName: genreName.trim(),
      cityName: cityName.trim(),
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim() || `${venueName.trim()}, ${cityName.trim()}`,
      startsAt,
      endsAt,
      published,
      superVipPrice: Number(superVipPrice) || 500000,
      vipPrice: Number(vipPrice) || 300000,
      normalPrice: Number(normalPrice) || 150000,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onMouseDown={(e) => {
        isBackdropMouseDown.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (isBackdropMouseDown.current && e.target === e.currentTarget) {
          onClose();
        }
        isBackdropMouseDown.current = false;
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: '#fffdf8',
          border: '1px solid #dcd6cb',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#faf7ef',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: '#db5a39', color: '#fff', padding: '0.5rem', borderRadius: '8px' }}>
              <Ticket size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Thêm sự kiện mới & Cấu hình giá vé
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.125rem 0 0' }}>
                Hệ thống tự động thiết lập địa điểm, suất diễn và tạo sơ đồ ghế theo 3 hạng vé
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', display: 'grid', gap: '1.25rem' }}>
          {/* Section 1: Thông tin sự kiện */}
          <div style={{ padding: '1rem', background: '#fff', border: '1px solid #e0dacf', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={16} style={{ color: '#db5a39' }} /> 1. Thông tin sự kiện
            </h3>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Tên sự kiện <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Live Concert Sky Tour 2026, Hà Anh Tuấn..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #cfc9bc',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fffdf8',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Thể loại / Danh mục
                </label>
                <input
                  type="text"
                  placeholder="VD: Ca nhạc, EDM Concert, Hài kịch..."
                  value={genreName}
                  onChange={(e) => setGenreName(e.target.value)}
                  list="genre-suggestions"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    border: '1px solid #cfc9bc',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fffdf8',
                  }}
                />
                <datalist id="genre-suggestions">
                  {genres.map((g) => (
                    <option key={g.id} value={g.name} />
                  ))}
                  {popularGenres.map((pg) => (
                    <option key={pg} value={pg} />
                  ))}
                </datalist>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                  {popularGenres.map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setGenreName(pg)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.6875rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        background: genreName === pg ? '#f1f5f9' : '#fff',
                        fontWeight: genreName === pg ? 600 : 400,
                        color: genreName === pg ? '#0f172a' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {pg}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Mô tả sự kiện
                </label>
                <textarea
                  rows={2}
                  placeholder="Giới thiệu nội dung sự kiện, dàn nghệ sĩ khách mời, quy định tham gia..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    border: '1px solid #cfc9bc',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fffdf8',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Địa điểm & Thời gian */}
          <div style={{ padding: '1rem', background: '#fff', border: '1px solid #e0dacf', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} style={{ color: '#db5a39' }} /> 2. Địa điểm & Thời gian tổ chức
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Thành phố <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Hà Nội, TP. Hồ Chí Minh..."
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  list="city-suggestions"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    border: '1px solid #cfc9bc',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fffdf8',
                  }}
                />
                <datalist id="city-suggestions">
                  {cities.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                  <option value="Hà Nội" />
                  <option value="TP. Hồ Chí Minh" />
                  <option value="Đà Nẵng" />
                  <option value="Cần Thơ" />
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Tên địa điểm <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nhà hát Lớn, SVĐ Quân Khu 7..."
                  value={venueName}
                  onChange={(e) => handleVenueChange(e.target.value)}
                  list="venue-suggestions"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    border: '1px solid #cfc9bc',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fffdf8',
                  }}
                />
                <datalist id="venue-suggestions">
                  {venues.map((v) => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                Địa chỉ chi tiết
              </label>
              <input
                type="text"
                placeholder="VD: 1 Tràng Tiền, Hoàn Kiếm, Hà Nội"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  border: '1px solid #cfc9bc',
                  borderRadius: '6px',
                  outline: 'none',
                  background: '#fffdf8',
                }}
              />
            </div>

            {/* Date & Showtime */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Ngày biểu diễn <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    border: '1px solid #cfc9bc',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fffdf8',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Giờ bắt đầu <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="time"
                  required
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    border: '1px solid #cfc9bc',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fffdf8',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Giờ kết thúc <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="time"
                  required
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    border: '1px solid #cfc9bc',
                    borderRadius: '6px',
                    outline: 'none',
                    background: '#fffdf8',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Cấu hình giá vé 3 hạng */}
          <div style={{ padding: '1rem', background: '#fff', border: '1px solid #e0dacf', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Crown size={16} style={{ color: '#f59e0b' }} /> 3. Cấu hình giá vé 3 hạng (Tiers)
              </h3>
              <small style={{ color: '#64748b', fontSize: '0.7rem' }}>Tự động gán cho sơ đồ ghế</small>
            </div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
              Hệ thống sẽ tạo sơ đồ ghế tương ứng: Hàng A nhận giá Super VIP, Hàng B nhận giá VIP, Hàng C & D nhận giá Thường.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {/* Tier 1: SUPER VIP */}
              <div
                style={{
                  padding: '0.85rem',
                  border: '2px solid #f59e0b',
                  borderRadius: '8px',
                  background: '#fffbeb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Crown size={14} /> SUPER VIP
                  </span>
                  <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.35rem', background: '#fde68a', color: '#78350f', borderRadius: '4px', fontWeight: 700 }}>
                    Hàng A
                  </span>
                </div>
                <small style={{ color: '#92400e', fontSize: '0.6875rem' }}>Gần sân khấu, góc nhìn đẹp nhất</small>
                <div style={{ marginTop: '0.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#78350f' }}>Giá vé (VNĐ)</label>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={superVipPrice}
                    onChange={(e) => setSuperVipPrice(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      border: '1px solid #f59e0b',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#b45309',
                    }}
                  />
                  <small style={{ display: 'block', marginTop: '0.2rem', color: '#b45309', fontWeight: 600, fontSize: '0.6875rem' }}>
                    {formatVnd(superVipPrice)}
                  </small>
                </div>
              </div>

              {/* Tier 2: VIP */}
              <div
                style={{
                  padding: '0.85rem',
                  border: '2px solid #8b5cf6',
                  borderRadius: '8px',
                  background: '#f5f3ff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={14} /> VIP
                  </span>
                  <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.35rem', background: '#ede9fe', color: '#5b21b6', borderRadius: '4px', fontWeight: 700 }}>
                    Hàng B
                  </span>
                </div>
                <small style={{ color: '#5b21b6', fontSize: '0.6875rem' }}>Tầm nhìn đẹp, trải nghiệm cao cấp</small>
                <div style={{ marginTop: '0.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#5b21b6' }}>Giá vé (VNĐ)</label>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={vipPrice}
                    onChange={(e) => setVipPrice(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      border: '1px solid #8b5cf6',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#6d28d9',
                    }}
                  />
                  <small style={{ display: 'block', marginTop: '0.2rem', color: '#6d28d9', fontWeight: 600, fontSize: '0.6875rem' }}>
                    {formatVnd(vipPrice)}
                  </small>
                </div>
              </div>

              {/* Tier 3: NORMAL */}
              <div
                style={{
                  padding: '0.85rem',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Ticket size={14} /> THƯỜNG
                  </span>
                  <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.35rem', background: '#d1fae5', color: '#065f46', borderRadius: '4px', fontWeight: 700 }}>
                    Hàng C & D
                  </span>
                </div>
                <small style={{ color: '#047857', fontSize: '0.6875rem' }}>Khán đài tiêu chuẩn, giá tiết kiệm</small>
                <div style={{ marginTop: '0.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#065f46' }}>Giá vé (VNĐ)</label>
                  <input
                    type="number"
                    min={10000}
                    step={10000}
                    value={normalPrice}
                    onChange={(e) => setNormalPrice(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      border: '1px solid #10b981',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#047857',
                    }}
                  />
                  <small style={{ display: 'block', marginTop: '0.2rem', color: '#047857', fontWeight: 600, fontSize: '0.6875rem' }}>
                    {formatVnd(normalPrice)}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Tùy chọn xuất bản */}
          <div style={{ padding: '0.75rem 1rem', background: '#fff', border: '1px solid #e0dacf', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#db5a39', cursor: 'pointer' }}
              />
              <span>
                <strong style={{ display: 'block', color: '#1e293b' }}>Xuất bản sự kiện ngay lập tức</strong>
                <small style={{ color: '#64748b' }}>
                  Người dùng có thể tìm thấy sự kiện trên trang chủ và đặt vé ngay sau khi tạo
                </small>
              </span>
            </label>
          </div>

          {/* Form Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid #cfc9bc',
                borderRadius: '6px',
                background: '#fff',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={busy}
              className="primary"
              style={{
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                backgroundColor: '#db5a39',
                color: '#fff',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(219, 90, 57, 0.25)',
              }}
            >
              {busy ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Tạo sự kiện ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
