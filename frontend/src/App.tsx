import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Armchair,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  LayoutDashboard,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Ticket,
  Users,
  WalletCards,
} from 'lucide-react';

// Domain models mirror the API payloads used by the booking flow.
// Keep these close to the API contract until the frontend is split into feature modules.
type View = 'browse' | 'bookings' | 'checkin' | 'admin';
type Step = 'browse' | 'seats' | 'checkout' | 'ticket';

type Show = {
  id: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
};

type Event = {
  id: string;
  title: string;
  description: string;
  category: string;
  genre?: string;
  shows: Show[];
};

type Seat = {
  seatId: string;
  section: string;
  row: string;
  number: number;
  status: string;
  price: number;
};

type BookingSeat = {
  seatId: string;
  label: string;
  price: number;
};

type Booking = {
  id: string;
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

type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

type City = {
  id: string;
  name: string;
};

type Venue = {
  id: string;
  cityId: string;
  name: string;
  address: string;
};

type IdentityKey = 'USER' | 'ORGANIZER' | 'CHECK_IN_STAFF' | 'ADMIN';

type IdentitySession = {
  key: IdentityKey;
  userId: string;
  role: IdentityKey;
  displayName: string;
  email: string;
};

// API is optional so the UI can still be previewed with the local demo data.
const API = import.meta.env.VITE_API_BASE_URL ?? '';
const IDENTITY_SESSIONS: Record<IdentityKey, IdentitySession> = {
  USER: {
    key: 'USER',
    userId: import.meta.env.VITE_DEMO_USER_ID ?? '00000000-0000-0000-0000-000000000001',
    role: 'USER',
    displayName: 'E Booking Customer',
    email: 'customer@ebooking.local',
  },
  ORGANIZER: {
    key: 'ORGANIZER',
    userId: '00000000-0000-0000-0000-000000000002',
    role: 'ORGANIZER',
    displayName: 'E Booking Organizer',
    email: 'organizer@ebooking.local',
  },
  CHECK_IN_STAFF: {
    key: 'CHECK_IN_STAFF',
    userId: '00000000-0000-0000-0000-000000000003',
    role: 'CHECK_IN_STAFF',
    displayName: 'E Booking Staff',
    email: 'staff@ebooking.local',
  },
  ADMIN: {
    key: 'ADMIN',
    userId: '00000000-0000-0000-0000-000000000004',
    role: 'ADMIN',
    displayName: 'E Booking Admin',
    email: 'admin@ebooking.local',
  },
} as const;

// Demo data is a visual fallback when the backend is unavailable or has no catalog yet.
// Do not use these identifiers as production defaults.
const demoShow: Show = {
  id: 'demo-show',
  venueName: 'Theater Hoa Sen',
  startsAt: '2026-09-12T19:30:00Z',
  endsAt: '2026-09-12T22:00:00Z',
};

const demoEvents: Event[] = [
  {
    id: 'demo-event',
    title: 'Neon Nights: Live in Saigon',
    description: 'Mot dem nhac dien tu va indie am thanh bao quanh.',
    category: 'Concert',
    genre: 'Music',
    shows: [demoShow],
  },
  {
    id: 'demo-event-2',
    title: 'The Art of Moving Images',
    description: 'Trinh chieu nghe thuat thi giac trong khong gian immersive.',
    category: 'Exhibition',
    genre: 'Art',
    shows: [
      {
        ...demoShow,
        id: 'demo-show-2',
        venueName: 'Factory Contemporary Arts Centre',
        startsAt: '2026-09-20T18:00:00Z',
      },
    ],
  },
  {
    id: 'demo-event-3',
    title: 'Late Night Comedy Club',
    description: 'Stand-up comedy va nhung cau chuyen rat doi thuong.',
    category: 'Comedy',
    genre: 'Comedy',
    shows: [
      {
        ...demoShow,
        id: 'demo-show-3',
        venueName: 'The Workshop Coffee',
        startsAt: '2026-09-28T20:00:00Z',
      },
    ],
  },
];

const demoSeats: Seat[] = Array.from({ length: 36 }, (_, index) => ({
  seatId: `seat-${index + 1}`,
  section: index < 18 ? 'A' : 'B',
  row: String.fromCharCode(65 + Math.floor(index / 6)),
  number: (index % 6) + 1,
  status: [3, 8, 20, 30].includes(index) ? 'SOLD' : 'AVAILABLE',
  price: 100000,
}));

// Shared API client. The identity module currently authenticates through X-User-Id,
// so every request must use the user selected in the active frontend session.
function createRequest(userId: string) {
  return async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> | undefined),
    };
    if (userId) {
      headers['X-User-Id'] = userId;
    }
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }

    return response.status === 204 ? (undefined as T) : response.json();
  };
}

// Keep presentation formatting outside components to make UI output consistent.
function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

// The catalog endpoint returns genre names, while event search expects slugs.
// Keeping the conversion here makes the API contract explicit and easy to debug.
function toGenreSlug(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function App() {
  // App coordinates cross-screen state. Feature-specific rendering is delegated to
  // the small components below; extract this state with its feature when the app grows.
  const [view, setView] = useState<View>('browse');
  const [step, setStep] = useState<Step>('browse');
  const [events, setEvents] = useState<Event[]>(demoEvents);
  const [query, setQuery] = useState('');
  const [cityId, setCityId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [genre, setGenre] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [seats, setSeats] = useState<Seat[]>(demoSeats);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [notice, setNotice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('sandbox_card');
  const [scanValue, setScanValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [identityKey, setIdentityKey] = useState<IdentityKey>('USER');
  const identity = IDENTITY_SESSIONS[identityKey];
  const request = useMemo(() => createRequest(identity.userId), [identity.userId]);

  // Load filter options once. These are public catalog APIs and do not require a
  // customer booking session, but using the same request client keeps identity
  // propagation consistent across the whole frontend.
  useEffect(() => {
    let cancelled = false;

    async function loadCatalogOptions() {
      try {
        const [cityPage, genreList] = await Promise.all([
          request<PageResponse<City>>('/api/catalog/cities?page=0&size=100'),
          request<string[]>('/api/catalog/genres'),
        ]);
        if (!cancelled) {
          setCities(cityPage.content);
          setGenres(genreList);
        }
      } catch {
        // Demo events remain available when the backend is not running locally.
      }
    }

    void loadCatalogOptions();
    return () => {
      cancelled = true;
    };
  }, [request]);

  // Venue options depend on the selected city. Clearing the venue prevents an
  // old venue from silently narrowing a newly selected city.
  useEffect(() => {
    let cancelled = false;

    async function loadVenues() {
      const params = new URLSearchParams({ page: '0', size: '100' });
      if (cityId) {
        params.set('cityId', cityId);
      }

      try {
        const page = await request<PageResponse<Venue>>(`/api/catalog/venues?${params}`);
        if (!cancelled) {
          setVenues(page.content);
        }
      } catch {
        if (!cancelled) {
          setVenues([]);
        }
      }
    }

    void loadVenues();
    return () => {
      cancelled = true;
    };
  }, [cityId, request]);

  // Search is debounced so typing a phrase does not issue one HTTP request per
  // keystroke. Results are enriched with shows because the search endpoint returns
  // event summaries while the seat flow needs the event's available shows.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCatalogLoading(true);

      try {
        const params = new URLSearchParams({
          page: '0',
          size: '20',
          sort: 'createdAt,desc',
        });
        if (query.trim()) {
          params.set('keyword', query.trim());
        }
        if (genre) {
          params.set('genre', toGenreSlug(genre));
        }
        if (cityId) {
          params.set('cityId', cityId);
        }
        if (venueId) {
          params.set('venueId', venueId);
        }

        const result = await request<PageResponse<{
          id: string;
          title: string;
          description: string;
          category: string;
          genre: string;
        }>>(`/api/events/search?${params}`);

        const enrichedEvents = await Promise.all(
          result.content.map(async (event) => ({
            ...event,
            shows: await request<Show[]>(`/api/events/${event.id}/shows`),
          })),
        );

        if (!cancelled) {
          setEvents(enrichedEvents);
        }
      } catch {
        // Keep the visual demo usable if the API is unavailable.
        if (!cancelled && !query && !cityId && !venueId && !genre) {
          setEvents(demoEvents);
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cityId, genre, query, request, venueId]);

  // Derived values stay out of state to prevent stale search results and totals.
  const selectedSeatObjects = seats.filter((seat) => selectedSeats.includes(seat.seatId));
  const total = selectedSeatObjects.reduce((sum, seat) => sum + seat.price, 0);

  async function chooseEvent(event: Event) {
    // Selecting an event always starts a fresh seat-selection session.
    const show = event.shows[0] ?? demoShow;
    setSelectedEvent(event);
    setSelectedShow(show);
    setSelectedSeats([]);
    setStep('seats');

    try {
      setSeats(await request<Seat[]>(`/api/shows/${show.id}/seats`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Khong tai duoc so do ghe.');
    }
  }

  async function chooseShow(show: Show) {
    // A new show has an independent seat map, so clear the prior selection first.
    setSelectedShow(show);
    setSelectedSeats([]);

    try {
      setSeats(await request<Seat[]>(`/api/shows/${show.id}/seats`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Khong tai duoc so do ghe.');
    }
  }

  function toggleSeat(seat: Seat) {
    if (seat.status !== 'AVAILABLE') {
      return;
    }

    setSelectedSeats((current) => {
      if (current.includes(seat.seatId)) {
        return current.filter((id) => id !== seat.seatId);
      }

      // The UI caps a single order at six seats; the backend remains the final authority.
      return current.length < 6 ? [...current, seat.seatId] : current;
    });
  }

  async function holdAndContinue() {
    if (!selectedShow || !selectedSeats.length) {
      return;
    }

    // A hold prevents another buyer from taking these seats before payment finishes.
    setLoading(true);

    try {
      const hold = await request<{
        holdId: string;
        expiresAt: string;
        seats: Array<{ seatId: string; label: string }>;
      }>(
        `/api/shows/${selectedShow.id}/holds`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': `hold-${selectedShow.id}-${selectedSeats.slice().sort().join('-')}` },
          body: JSON.stringify({ seatIds: selectedSeats }),
        },
      );
      setBooking({
        id: hold.holdId,
        status: 'PENDING_PAYMENT',
        totalAmount: selectedSeatObjects.reduce((sum, seat) => sum + seat.price, 0),
        seats: hold.seats.map((seat) => ({
          seatId: seat.seatId,
          label: seat.label,
          price: selectedSeatObjects.find((item) => item.seatId === seat.seatId)?.price ?? 0,
        })),
        eventTitle: selectedEvent?.title ?? 'Event',
        show: selectedShow,
        expiresAt: hold.expiresAt,
      });
      setStep('checkout');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Khong the giu ghe.');
    } finally {
      setLoading(false);
    }
  }

  async function pay() {
    if (!booking) {
      return;
    }

    // Payment is a three-step contract: create booking from hold, submit payment,
    // then retrieve the tickets issued by a successful payment.
    setLoading(true);
    try {
      const created = await request<{
        id: string;
        status: string;
        totalAmount: number;
        seats: BookingSeat[];
      }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ holdId: booking.id }),
      });

      await request(`/api/bookings/${created.id}/payment`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `pay-${created.id}` },
        body: JSON.stringify({ paymentMethod }),
      });
      const issuedTickets = await request<TicketData[]>(`/api/bookings/${created.id}/tickets`);
      setBooking({ ...booking, ...created, status: 'PAID' });
      setTickets(issuedTickets);
      setStep('ticket');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Thanh toan that bai.');
    } finally {
      setLoading(false);
    }
  }

  function resetFlow() {
    // Preserve the loaded catalog and active identity while clearing only the purchase flow.
    setStep('browse');
    setSelectedEvent(null);
    setSelectedShow(null);
    setBooking(null);
    setTickets([]);
    setSelectedSeats([]);
    setNotice('');
  }

  function navigate(nextView: View) {
    setView(nextView);
    if (nextView === 'browse') {
      resetFlow();
    }
  }

  function switchIdentity(nextIdentity: IdentityKey) {
    setIdentityKey(nextIdentity);
    // A new identity should not inherit the previous booking/check-in state.
    resetFlow();
  }

  return (
    <main className="app-shell">
      {/* Global shell and top-level routes. Each view owns its local layout below. */}
      <Header
        view={view}
        identity={identity}
        onIdentityChange={switchIdentity}
        onNavigate={navigate}
        onHome={resetFlow}
      />
      {notice && <Toast message={notice} onClose={() => setNotice('')} />}

      {view === 'browse' && (
        <BrowseFlow
          step={step}
          query={query}
          events={events}
          cities={cities}
          venues={venues}
          genres={genres}
          cityId={cityId}
          venueId={venueId}
          genre={genre}
          catalogLoading={catalogLoading}
          selectedEvent={selectedEvent}
          selectedShow={selectedShow}
          seats={seats}
          selectedSeats={selectedSeats}
          booking={booking}
          tickets={tickets}
          onQueryChange={setQuery}
          onCityChange={(value) => {
            setCityId(value);
            setVenueId('');
          }}
          onVenueChange={setVenueId}
          onGenreChange={setGenre}
          onChooseEvent={chooseEvent}
          onChooseShow={chooseShow}
          onSeat={toggleSeat}
          onContinue={holdAndContinue}
          loading={loading}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onPay={pay}
          onBack={() => (step === 'seats' ? resetFlow() : setStep(step === 'ticket' ? 'checkout' : 'seats'))}
          onDone={resetFlow}
        />
      )}
      {view === 'bookings' && <BookingsPage booking={booking} onBrowse={() => navigate('browse')} />}
      {view === 'checkin' && (
        <CheckinPage
          value={scanValue}
          onChange={setScanValue}
          onSubmit={async () => {
            if (!scanValue.trim()) {
              setNotice('Hay nhap QR payload truoc.');
              return;
            }
            try {
              const result = await request<{ ticketCode: string | null; result: string }>('/api/checkin/scans', {
                method: 'POST',
                body: JSON.stringify({ qrPayload: scanValue.trim(), deviceId: 'web-gate-01' }),
              });
              setNotice(`${result.result}${result.ticketCode ? `: ${result.ticketCode}` : ''}`);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : 'Khong the check-in.');
            }
          }}
        />
      )}
      {view === 'admin' && <AdminPage />}

      <Footer />
    </main>
  );
}

// Global navigation and local identity-session switcher.
function Header({
  view,
  identity,
  onIdentityChange,
  onNavigate,
  onHome,
}: {
  view: View;
  identity: IdentitySession;
  onIdentityChange: (role: IdentityKey) => void;
  onNavigate: (view: View) => void;
  onHome: () => void;
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome}>
        <span className="brand-mark">e</span>
        <span>
          ebooking
          <small>EVENTS / TICKETS / MOMENTS</small>
        </span>
      </button>
      <nav className="main-nav" aria-label="Main navigation">
        <NavButton active={view === 'browse'} icon={<Search size={17} />} onClick={() => onNavigate('browse')}>Kham pha</NavButton>
        <NavButton active={view === 'bookings'} icon={<Ticket size={17} />} onClick={() => onNavigate('bookings')}>Ve cua toi</NavButton>
        <NavButton active={view === 'checkin'} icon={<QrCode size={17} />} onClick={() => onNavigate('checkin')}>Check-in</NavButton>
        <NavButton active={view === 'admin'} icon={<LayoutDashboard size={17} />} onClick={() => onNavigate('admin')}>Quan ly</NavButton>
      </nav>
      <label className="account">
        <span className="live-dot" />
        Identity
        <select value={identity.key} onChange={(event) => onIdentityChange(event.target.value as IdentityKey)}>
          {Object.values(IDENTITY_SESSIONS).map((session) => (
            <option key={session.key} value={session.key}>
              {session.displayName}
            </option>
          ))}
        </select>
        <span className="avatar" title={`${identity.displayName} - ${identity.role}`}>
          {identity.role[0]}
        </span>
      </label>
    </header>
  );
}

function NavButton({ active, icon, onClick, children }: { active: boolean; icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return <button className={active ? 'active' : ''} onClick={onClick}>{icon}{children}</button>;
}

// BrowseFlow selects the correct screen for each stage of a single booking journey.
function BrowseFlow(props: {
  step: Step;
  query: string;
  events: Event[];
  cities: City[];
  venues: Venue[];
  genres: string[];
  cityId: string;
  venueId: string;
  genre: string;
  catalogLoading: boolean;
  selectedEvent: Event | null;
  selectedShow: Show | null;
  seats: Seat[];
  selectedSeats: string[];
  booking: Booking | null;
  tickets: TicketData[];
  onQueryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onVenueChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onChooseEvent: (event: Event) => void;
  onChooseShow: (show: Show) => void;
  onSeat: (seat: Seat) => void;
  onContinue: () => void;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  onPay: () => void;
  loading: boolean;
  onBack: () => void;
  onDone: () => void;
}) {
  const { step } = props;

  return (
    <>
      {step !== 'browse' && <button className="back-link" onClick={props.onBack}><ArrowLeft size={16} />Quay lai</button>}
      {step === 'browse' && (
        <BrowsePage
          query={props.query}
          events={props.events}
          cities={props.cities}
          venues={props.venues}
          genres={props.genres}
          cityId={props.cityId}
          venueId={props.venueId}
          genre={props.genre}
          catalogLoading={props.catalogLoading}
          onQueryChange={props.onQueryChange}
          onCityChange={props.onCityChange}
          onVenueChange={props.onVenueChange}
          onGenreChange={props.onGenreChange}
          onChooseEvent={props.onChooseEvent}
        />
      )}
      {step === 'seats' && props.selectedEvent && <SeatStep {...props} event={props.selectedEvent} />}
      {step === 'checkout' && props.booking && <Checkout booking={props.booking} paymentMethod={props.paymentMethod} onPaymentMethodChange={props.onPaymentMethodChange} onPay={props.onPay} loading={props.loading} />}
      {step === 'ticket' && props.booking && <TicketView booking={props.booking} tickets={props.tickets} onDone={props.onDone} />}
    </>
  );
}

function BrowsePage({
  query,
  events,
  cities,
  venues,
  genres,
  cityId,
  venueId,
  genre,
  catalogLoading,
  onQueryChange,
  onCityChange,
  onVenueChange,
  onGenreChange,
  onChooseEvent,
}: {
  query: string;
  events: Event[];
  cities: City[];
  venues: Venue[];
  genres: string[];
  cityId: string;
  venueId: string;
  genre: string;
  catalogLoading: boolean;
  onQueryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onVenueChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onChooseEvent: (event: Event) => void;
}) {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Su kien dang dien ra</p>
          <h1>Di de cam nhan.<br /><em>Dat de yen tam.</em></h1>
          <p className="hero-copy">Tim kiem nhung trai nghiem dang cho ban trong thanh pho.</p>
          <div className="search-box"><Search size={20} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tim event, nghe si, the loai..." /><kbd>⌘ K</kbd></div>
        </div>
        <div className="hero-card"><span>THIS WEEKEND</span><strong>Live sessions<br />under neon</strong><small>Ho Chi Minh City · 12 — 14 Sep</small><ChevronRight /></div>
      </section>
      <section className="content">
        <div className="section-heading"><div><p className="eyebrow">Duyet theo tam trang</p><h2>Event phu hop voi ban</h2></div><div className="location"><MapPin size={16} />Ho Chi Minh City<ChevronRight size={15} /></div></div>
        <div className="filter-row">
          <select className="filter-select" value={cityId} onChange={(event) => onCityChange(event.target.value)}>
            <option value="">Tat ca thanh pho</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
          <select className="filter-select" value={venueId} onChange={(event) => onVenueChange(event.target.value)}>
            <option value="">Tat ca dia diem</option>
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
          <select className="filter-select" value={genre} onChange={(event) => onGenreChange(event.target.value)}>
            <option value="">Tat ca the loai</option>
            {genres.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <span className="result-count">{catalogLoading ? 'Dang tai...' : `${events.length} events`}</span>
        </div>
        {catalogLoading && <p className="catalog-status">Dang cap nhat danh sach event...</p>}
        {!catalogLoading && !events.length && <p className="catalog-status">Khong tim thay event phu hop.</p>}
        <div className="event-grid">{events.map((event, index) => <EventCard key={event.id} event={event} index={index} onChoose={onChooseEvent} />)}</div>
      </section>
    </>
  );
}

function EventCard({ event, index, onChoose }: { event: Event; index: number; onChoose: (event: Event) => void }) {
  const show = event.shows[0] ?? demoShow;
  return <article className="event-card" onClick={() => onChoose(event)}><div className={`event-art art-${index % 3}`}><span>{event.category}</span><strong>{index === 0 ? 'NN' : index === 1 ? 'AM' : 'LN'}</strong><small>{event.genre ?? event.category}</small></div><div className="event-info"><h3>{event.title}</h3><p>{event.description}</p><span className="event-date">{formatDate(show.startsAt)}</span><div className="event-meta"><span><MapPin size={14} />{show.venueName}</span><b>Gia theo so do ghe</b></div></div></article>;
}

// Seat-selection components keep the visual map and order summary in sync via props.
function SeatStep({ event, selectedShow, seats, selectedSeats, onChooseShow, onSeat, onContinue }: { event: Event; selectedShow: Show | null; seats: Seat[]; selectedSeats: string[]; onChooseShow: (show: Show) => void; onSeat: (seat: Seat) => void; onContinue: () => void }) {
  const selectedSeatObjects = seats.filter((seat) => selectedSeats.includes(seat.seatId));
  const shows = event.shows.length ? event.shows : [demoShow];
  return <section className="content"><div className="step-header"><div><p className="eyebrow">01 / Chon suat</p><h1>{event.title}</h1><p>{event.description}</p></div><StepIndicator /></div><div className="show-picker">{shows.map((show) => <button key={show.id} className={selectedShow?.id === show.id ? 'show-option selected' : 'show-option'} onClick={() => onChooseShow(show)}><Clock3 size={16} /><span>{formatDate(show.startsAt)}</span><small>{show.venueName}</small></button>)}</div><div className="seat-layout"><SeatMap seats={seats} selectedSeats={selectedSeats} onSeat={onSeat} /><SeatOrder selectedSeats={selectedSeatObjects} onContinue={onContinue} /></div></section>;
}

function StepIndicator() {
  return <div className="stepper"><span className="done"><Check size={14} />Event</span><span className="current">Ghe</span><span>Thanh toan</span><span>Ve</span></div>;
}

function SeatMap({ seats, selectedSeats, onSeat }: { seats: Seat[]; selectedSeats: string[]; onSeat: (seat: Seat) => void }) {
  return <div className="map-panel"><div className="stage">SAN KHAU</div><div className="seat-grid">{seats.map((seat) => <button key={seat.seatId} title={`${seat.section}-${seat.row}${seat.number}`} className={`seat ${seat.status.toLowerCase()} ${selectedSeats.includes(seat.seatId) ? 'selected' : ''}`} onClick={() => onSeat(seat)}><Armchair size={14} /><span>{seat.number}</span></button>)}</div><div className="legend"><span><i className="available" />Con trong</span><span><i className="selected-dot" />Dang chon</span><span><i className="sold" />Da ban</span></div></div>;
}

function SeatOrder({ selectedSeats, onContinue }: { selectedSeats: Seat[]; onContinue: () => void }) {
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  return <aside className="order-card"><p className="eyebrow">Ghe cua ban</p><h2>{selectedSeats.length ? `${selectedSeats.length} ghe da chon` : 'Chua chon ghe'}</h2><div className="selected-list">{selectedSeats.map((seat) => <div key={seat.seatId}><span>{seat.section}-{seat.row}{seat.number}</span><b>{formatMoney(seat.price)}</b></div>)}</div><div className="order-total"><span>Tong cong</span><strong>{formatMoney(total)}</strong></div><button className="primary full" disabled={!selectedSeats.length} onClick={onContinue}>Giu ghe & tiep tuc<ChevronRight size={17} /></button><small className="fine-print"><ShieldCheck size={13} />Ghe duoc giu trong 5 phut</small></aside>;
}

// Checkout only collects the sandbox outcome; booking creation and ticket issuance live in App.pay.
function Checkout({ booking, paymentMethod, onPaymentMethodChange, onPay, loading }: { booking: Booking; paymentMethod: string; onPaymentMethodChange: (value: string) => void; onPay: () => void; loading: boolean }) {
  return <section className="content narrow"><p className="eyebrow">02 / Thanh toan</p><h1>Xac nhan booking</h1><p className="intro">Kiem tra thong tin truoc khi thanh toan sandbox.</p><div className="checkout-grid"><div className="summary-card"><span className="summary-art">{booking.eventTitle.slice(0, 2).toUpperCase()}</span><h2>{booking.eventTitle}</h2><p>{formatDate(booking.show.startsAt)} · {booking.show.venueName}</p><div className="summary-seats">{booking.seats.map((seat) => <span key={seat.seatId}>{seat.label}</span>)}</div><div className="order-total"><span>Tong cong</span><strong>{formatMoney(booking.totalAmount)}</strong></div></div><div className="payment-card"><label>Payment sandbox</label><PaymentChoice selected={paymentMethod === 'SUCCESS'} icon={<CreditCard />} title="Thanh toan thanh cong" description="Gui SUCCESS cho fake provider" onClick={() => onPaymentMethodChange('SUCCESS')} /><PaymentChoice selected={paymentMethod === 'FAIL'} icon={<WalletCards />} title="Tu choi thanh toan" description="Gui FAIL de kiem tra loi" onClick={() => onPaymentMethodChange('FAIL')} /><button className="primary full" disabled={loading} onClick={onPay}>{loading ? 'Dang xu ly...' : `Thanh toan ${formatMoney(booking.totalAmount)}`}<ChevronRight size={17} /></button><small className="fine-print"><ShieldCheck size={13} />Giao dich an toan trong moi truong demo</small></div></div></section>;
}

function PaymentChoice({ selected, icon, title, description, onClick }: { selected: boolean; icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return <button className={selected ? 'payment-choice selected' : 'payment-choice'} onClick={onClick}>{icon}<span><b>{title}</b><small>{description}</small></span><Check size={17} /></button>;
}

// Post-payment confirmation uses issued ticket data rather than reconstructing ticket codes locally.
function TicketView({ booking, tickets, onDone }: { booking: Booking; tickets: TicketData[]; onDone: () => void }) {
  return <section className="content narrow"><div className="success-heading"><span><Check size={26} /></span><p className="eyebrow">03 / Hoan tat</p><h1>Ve cua ban da san sang</h1><p>Booking <strong>{booking.id}</strong> da duoc xac nhan.</p></div><div className="ticket-stack">{tickets.map((ticket) => <article className="ticket" key={ticket.ticketCode}><div className="ticket-main"><p className="eyebrow">{booking.eventTitle}</p><h2>{ticket.ticketCode}</h2><p>{formatDate(booking.show.startsAt)} · {booking.show.venueName}</p><strong className="ticket-seat">Ghe {booking.seats.find((seat) => seat.seatId === ticket.seatId)?.label}</strong></div><div className="qr"><QrCode size={92} /><small>{ticket.status}</small></div></article>)}</div><button className="primary" onClick={onDone}>Kham pha them event<ChevronRight size={17} /></button></section>;
}

function BookingsPage({ booking, onBrowse }: { booking: Booking | null; onBrowse: () => void }) {
  return <section className="content standalone"><p className="eyebrow">Account</p><h1>Ve cua toi</h1><div className="empty-history">{booking ? <BookingRow booking={booking} onOpen={onBrowse} /> : <><Ticket size={34} /><h3>Chua co booking nao</h3><p>Nhung ve ban dat se xuat hien o day.</p><button className="primary" onClick={onBrowse}>Kham pha event</button></>}</div></section>;
}

function BookingRow({ booking, onOpen }: { booking: Booking; onOpen: () => void }) {
  return <button className="booking-row" onClick={onOpen}><span className="summary-art small">{booking.eventTitle.slice(0, 2).toUpperCase()}</span><span><b>{booking.eventTitle}</b><small>{formatDate(booking.show.startsAt)} · {booking.seats.length} ghe</small></span><strong>{formatMoney(booking.totalAmount)}</strong><ChevronRight size={18} /></button>;
}

// Staff and operations views are intentionally independent from the customer booking state.
function CheckinPage({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return <section className="content standalone"><p className="eyebrow">Staff workspace</p><h1>Check-in tai cong</h1><div className="checkin-panel"><div className="scanner"><QrCode size={100} strokeWidth={1} /><span>Camera sandbox</span></div><div><h2>Quet ma QR cua khach</h2><p>Nhap payload de mo phong viec quet ve tai cong.</p><input className="text-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder="ebooking://ticket/..." /><button className="primary" onClick={onSubmit}>Xac nhan ve</button></div></div></section>;
}

function AdminPage() {
  return <section className="content standalone"><p className="eyebrow">Operations</p><h1>Quan ly catalog</h1><div className="admin-grid"><AdminStat icon={<Ticket />} label="Events dang mo" value="24" /><AdminStat icon={<MapPin />} label="Venue" value="08" /><AdminStat icon={<Users />} label="Bookings hom nay" value="186" /></div><div className="admin-table"><div className="table-head"><span>Event</span><span>Status</span><span>Show tiep theo</span><span>Bookings</span></div>{demoEvents.map((event) => <div className="table-row" key={event.id}><strong>{event.title}</strong><span className="status live">Published</span><span>{formatDate(event.shows[0]?.startsAt ?? demoShow.startsAt)}</span><span>—</span></div>)}</div></section>;
}

function AdminStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="admin-stat">{icon}<small>{label}</small><strong>{value}</strong></div>;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="toast">{message}<button onClick={onClose}>x</button></div>;
}

function Footer() {
  return <footer><span>© 2026 ebooking</span><span>Sandbox payment · API ready</span><span><CircleHelp size={14} />Ho tro</span></footer>;
}

export default App;
