import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarPlus, MapPin, Plus, Ticket, Trash2, Users } from 'lucide-react';

type IdentityRole = 'USER' | 'ORGANIZER' | 'CHECK_IN_STAFF' | 'ADMIN';

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
type Event = { id: string; title: string; description: string; category: string; published: boolean; shows: Show[] };

type RequestClient = <T>(path: string, options?: RequestInit) => Promise<T>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formToIso(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return '';
  }
  return new Date(`${dateValue}T${timeValue}:00Z`).toISOString();
}

export function AdminWorkspace({
  identity,
  request,
}: {
  identity: IdentitySession;
  request: RequestClient;
}) {
  const canEdit = identity.role === 'ADMIN' || identity.role === 'ORGANIZER';
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [cityName, setCityName] = useState('');
  const [genreName, setGenreName] = useState('');
  const [genreSlug, setGenreSlug] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [eventGenreId, setEventGenreId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [showEventId, setShowEventId] = useState('');
  const [showVenueId, setShowVenueId] = useState('');
  const [showDate, setShowDate] = useState('');
  const [showTime, setShowTime] = useState('19:30');
  const [showEndTime, setShowEndTime] = useState('21:30');

  // Refresh all visible catalog data after each write. This keeps the admin
  // screen truthful without inventing a separate list API that does not exist.
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
          setSelectedCityId((current) => current || cityPage.content[0]?.id || '');
          setSelectedVenueId((current) => current || venuePage.content[0]?.id || '');
          setShowEventId((current) => current || eventPage.content[0]?.id || '');
        }
      } catch {
        if (!cancelled) {
          setNotice('Khong tai duoc du lieu catalog.');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [request, refresh]);

  const venuesInCity = useMemo(
    () => venues.filter((venue) => !selectedCityId || venue.cityId === selectedCityId),
    [selectedCityId, venues],
  );

  async function mutate<T>(label: string, fn: () => Promise<T>) {
    if (!canEdit) {
      setNotice('Role hien tai khong du quyen thao tac.');
      return;
    }
    setBusy(true);
    try {
      await fn();
      setNotice(`${label} thanh cong.`);
      setRefresh((value) => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${label} that bai.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="content standalone">
      <p className="eyebrow">Operations</p>
      <h1>Quan ly catalog</h1>
      <div className="admin-grid">
        <AdminStat icon={<Ticket />} label="Event" value={String(events.length)} />
        <AdminStat icon={<MapPin />} label="Venue" value={String(venues.length)} />
        <AdminStat icon={<Users />} label="City" value={String(cities.length)} />
      </div>

      {notice && <div className="admin-notice">{notice}</div>}

      <div className="admin-layout">
        <section className="admin-panel">
          <h2>Tao moi</h2>
          <div className="admin-form-grid">
            <label>City<input className="text-input" value={cityName} onChange={(e) => setCityName(e.target.value)} /></label>
            <button className="primary" disabled={busy || !cityName.trim()} onClick={() => mutate('City', async () => {
              await request('/api/admin/cities', { method: 'POST', body: JSON.stringify({ name: cityName.trim() }) });
              setCityName('');
            })}><Plus size={16} />City</button>

            <label>Genre<input className="text-input" value={genreName} onChange={(e) => setGenreName(e.target.value)} /></label>
            <label>Slug<input className="text-input" value={genreSlug} onChange={(e) => setGenreSlug(e.target.value)} /></label>
            <button className="primary" disabled={busy || !genreName.trim() || !genreSlug.trim()} onClick={() => mutate('Genre', async () => {
              await request('/api/admin/genres', { method: 'POST', body: JSON.stringify({ name: genreName.trim(), slug: genreSlug.trim() }) });
              setGenreName('');
              setGenreSlug('');
            })}><Plus size={16} />Genre</button>

            <label>Venue city
              <select className="text-input" value={selectedCityId} onChange={(e) => setSelectedCityId(e.target.value)}>
                {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
            </label>
            <label>Venue name<input className="text-input" value={venueName} onChange={(e) => setVenueName(e.target.value)} /></label>
            <label>Address<input className="text-input" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} /></label>
            <button className="primary" disabled={busy || !selectedCityId || !venueName.trim() || !venueAddress.trim()} onClick={() => mutate('Venue', async () => {
              await request('/api/admin/venues', { method: 'POST', body: JSON.stringify({ cityId: selectedCityId, name: venueName.trim(), address: venueAddress.trim() }) });
              setVenueName('');
              setVenueAddress('');
            })}><Plus size={16} />Venue</button>

            <label>Event genre
              <select className="text-input" value={eventGenreId} onChange={(e) => setEventGenreId(e.target.value)}>
                <option value="">Chon genre</option>
                {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
              </select>
            </label>
            <label>Title<input className="text-input" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} /></label>
            <label>Description<textarea className="text-input" rows={3} value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} /></label>
            <button className="primary" disabled={busy || !eventGenreId || !eventTitle.trim() || !eventDescription.trim()} onClick={() => mutate('Event', async () => {
              // The select displays the genre name, but the API must receive its UUID.
              await request('/api/admin/events', { method: 'POST', body: JSON.stringify({ genreId: eventGenreId, title: eventTitle.trim(), description: eventDescription.trim() }) });
              setEventTitle('');
              setEventDescription('');
            })}><Plus size={16} />Event</button>

            <label>Show event
              <select className="text-input" value={showEventId} onChange={(e) => setShowEventId(e.target.value)}>
                <option value="">Chon event</option>
                {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
              </select>
            </label>
            <label>Show venue
              <select className="text-input" value={showVenueId} onChange={(e) => setShowVenueId(e.target.value)}>
                <option value="">Chon venue</option>
                {venuesInCity.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
              </select>
            </label>
            <label>Start<input className="text-input" type="date" value={showDate} onChange={(e) => setShowDate(e.target.value)} /></label>
            <label>Time<input className="text-input" type="time" value={showTime} onChange={(e) => setShowTime(e.target.value)} /></label>
            <label>End<input className="text-input" type="time" value={showEndTime} onChange={(e) => setShowEndTime(e.target.value)} /></label>
            <button className="primary" disabled={busy || !showEventId || !showVenueId || !showDate} onClick={() => mutate('Show', async () => {
              const startsAt = formToIso(showDate, showTime);
              const endsAt = formToIso(showDate, showEndTime);
              await request('/api/admin/shows', { method: 'POST', body: JSON.stringify({ eventId: showEventId, venueId: showVenueId, startsAt, endsAt }) });
              setShowDate('');
            })}><CalendarPlus size={16} />Show</button>
          </div>
        </section>

        <section className="admin-panel">
          <h2>Hien tai</h2>
          <div className="admin-list">
            {events.map((event) => (
              <article key={event.id} className="admin-item">
                <div>
                  <strong>{event.title}</strong>
                  <small>{event.published ? 'Published' : 'Draft'} · {event.shows.length} show</small>
                </div>
                <div className="admin-actions">
                  <button className="secondary" onClick={() => mutate('Publication', async () => {
                    await request(`/api/admin/events/${event.id}/publication`, {
                      method: 'PATCH',
                      body: JSON.stringify({ published: true }),
                    });
                  })}>Publish</button>
                  <button className="secondary" onClick={() => mutate('Event delete', async () => {
                    await request(`/api/admin/events/${event.id}`, { method: 'DELETE' });
                  })}><Trash2 size={14} />Xoa</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function AdminStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="admin-stat">{icon}<small>{label}</small><strong>{value}</strong></div>;
}
