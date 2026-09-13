import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Armchair,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Ticket,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';
import { BookingHistoryView, CheckinWorkspace, EnhancedTicketView } from './featureViews';
import { AdminWorkspace } from './adminView';
import { AuthDialog } from './components/common/AuthDialog';
import { clearStoredAuth, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from './api/client';
import type { User } from './api/types';

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
  holdId: string;
  bookingId?: string;
  status: string;
  totalAmount: number;
  seats: BookingSeat[];
  eventTitle: string;
  show: Show;
  expiresAt?: string;
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

type TicketData = {
  ticketCode: string;
  qrPayload: string;
  status: string;
  seatId: string;
};

type CheckinRecord = {
  qrPayload: string;
  ticketCode: string | null;
  result: string;
  usedAt?: string | null;
  deviceId: string;
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

type DemoUserResponse = {
  id: string;
  email: string;
  role: IdentityKey;
};

type IdentityAuthResponse = {
  id: string;
  email: string;
  displayName: string;
  role: IdentityKey;
};

function canAccessView(role: IdentityKey | string | undefined, view: View) {
  if (view === 'checkin') {
    return role === 'CHECK_IN_STAFF' || role === 'ADMIN';
  }
  if (view === 'admin') {
    return role === 'ORGANIZER' || role === 'ADMIN';
  }
  return true;
}

// API is optional so the UI can still be previewed with the local demo data.
const API = import.meta.env.VITE_API_BASE_URL ?? '';
const BOOKING_HISTORY_PREFIX = 'ebooking-booking-history:';
const CHECKIN_HISTORY_PREFIX = 'ebooking-checkin-history:';
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
    userId: 'f639fec1-eb8c-4782-8507-9cb8c5df392c',
    role: 'ORGANIZER',
    displayName: 'E Booking Organizer',
    email: 'organizer@ebooking.local',
  },
  CHECK_IN_STAFF: {
    key: 'CHECK_IN_STAFF',
    userId: '11111111-1111-1111-1111-111111111111',
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

// Shared API client. Demo role switching still uses X-User-Id, while real
// login/register sessions use Basic auth until a token endpoint is introduced.
function createRequest(userId: string, basicAuthHeader: string, token: string = '') {
  return async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> | undefined),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (basicAuthHeader) {
      headers.Authorization = basicAuthHeader;
    } else if (userId) {
      headers['X-User-Id'] = userId;
    }
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let msg = `API ${response.status}`;
      try {
        const body = await response.json();
        if (body?.message) msg = body.message;
      } catch {
        // ignore parse error
      }
      throw new Error(msg);
    }

    return response.status === 204 ? (undefined as T) : response.json();
  };
}

function toBasicAuthHeader(email: string, password: string) {
  return `Basic ${window.btoa(`${email.trim().toLowerCase()}:${password}`)}`;
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

async function loadDemoIdentitySessions() {
  const response = await fetch(`${API}/api/identity/demo-users`);
  if (!response.ok) {
    throw new Error(`Identity API ${response.status}`);
  }

  const demoUsers = (await response.json()) as DemoUserResponse[];
  return demoUsers.reduce<Record<IdentityKey, IdentitySession>>((sessions, user) => {
    const key = user.role;
    const fallback = IDENTITY_SESSIONS[key];
    if (fallback) {
      sessions[key] = {
        ...fallback,
        userId: user.id,
        email: user.email,
      };
    }
    return sessions;
  }, { ...IDENTITY_SESSIONS });
}

function readBookingHistory(identityKey: IdentityKey): BookingRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(`${BOOKING_HISTORY_PREFIX}${identityKey}`);
    return raw ? (JSON.parse(raw) as BookingRecord[]) : [];
  } catch {
    return [];
  }
}

function mergeBookingHistory(records: BookingRecord[], next: BookingRecord) {
  const index = records.findIndex((record) => record.bookingId === next.bookingId);
  if (index === -1) {
    return [next, ...records];
  }
  const merged = [...records];
  merged[index] = { ...merged[index], ...next };
  return merged;
}

function readCheckinHistory(identityKey: IdentityKey): CheckinRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(`${CHECKIN_HISTORY_PREFIX}${identityKey}`);
    return raw ? (JSON.parse(raw) as CheckinRecord[]) : [];
  } catch {
    return [];
  }
}

function mergeCheckinHistory(records: CheckinRecord[], next: CheckinRecord) {
  return [next, ...records].slice(0, 12);
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
  // SUCCESS is the default sandbox path so checkout always opens with one
  // explicit payment outcome selected; FAIL remains available for testing.
  const [paymentMethod, setPaymentMethod] = useState('SUCCESS');
  const [scanValue, setScanValue] = useState('');
  const [checkinHistory, setCheckinHistory] = useState<CheckinRecord[]>([]);
  const [lastCheckin, setLastCheckin] = useState<CheckinRecord | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [identitySessions, setIdentitySessions] = useState(IDENTITY_SESSIONS);
  const [jwtToken, setJwtToken] = useState<string>(() => getStoredToken() ?? '');
  const [basicAuthHeader, setBasicAuthHeader] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authPrompt, setAuthPrompt] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [bookingHistory, setBookingHistory] = useState<BookingRecord[]>([]);

  // Current effective role
  const currentRole = currentUser?.role as IdentityKey | undefined;

  // Identity object for backward-compatible subcomponents (CheckinWorkspace, AdminWorkspace)
  const identity: IdentitySession = useMemo(() => {
    if (currentUser) {
      return {
        key: (currentUser.role as IdentityKey) || 'USER',
        userId: currentUser.id,
        role: currentUser.role,
        displayName: currentUser.displayName,
        email: currentUser.email,
      };
    }
    return {
      key: 'USER',
      userId: '',
      role: 'USER',
      displayName: 'Khách',
      email: '',
    };
  }, [currentUser]);

  const request = useMemo(() => {
    const userId = currentUser?.id ?? '';
    return createRequest(userId, basicAuthHeader, jwtToken);
  }, [basicAuthHeader, currentUser?.id, jwtToken]);

  // Restore and validate session from backend on page load
  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    if (token) {
      fetch(`${API}/api/identity/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (res.ok) {
            const data = (await res.json()) as User & { token?: string };
            if (!cancelled) {
              setCurrentUser(data);
              setStoredUser(data);
              if (data.token) {
                setJwtToken(data.token);
                setStoredToken(data.token);
              }
            }
          } else if (res.status === 401) {
            // Token expired or invalid
            if (!cancelled) {
              clearStoredAuth();
              setCurrentUser(null);
              setJwtToken('');
            }
          }
        })
        .catch(() => {
          // Keep stored user if offline
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Resolve demo UUIDs from the database so an existing Docker volume remains usable.
    loadDemoIdentitySessions()
      .then((sessions) => {
        if (!cancelled) {
          setIdentitySessions(sessions);
        }
      })
      .catch(() => {
        // Static fallback identities keep the visual demo usable without a backend.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch real booking history from backend API, with local storage fallback
  useEffect(() => {
    let cancelled = false;
    async function loadBackendBookings() {
      if (!currentUser) {
        setBookingHistory([]);
        return;
      }
      try {
        type ApiBooking = {
          id: string;
          holdId: string;
          status: string;
          totalAmount: number;
          createdAt?: string;
          expiresAt?: string;
          eventId?: string;
          eventTitle?: string;
          showId?: string;
          venueName?: string;
          startsAt?: string;
          endsAt?: string;
          seats: BookingSeat[];
        };
        const data = await request<ApiBooking[]>('/api/bookings');
        if (!cancelled && Array.isArray(data)) {
          const records: BookingRecord[] = data.map((b) => ({
            bookingId: b.id,
            holdId: b.holdId,
            status: b.status,
            totalAmount: b.totalAmount,
            seats: b.seats || [],
            eventTitle: b.eventTitle || 'Event',
            show: {
              id: b.showId || '',
              venueName: b.venueName || '',
              startsAt: b.startsAt || '',
              endsAt: b.endsAt || '',
            },
            expiresAt: b.expiresAt,
            tickets: [],
          }));
          setBookingHistory(records);
          return;
        }
      } catch {
        // fallback to local storage
      }
      if (!cancelled && currentUser) {
        const key: IdentityKey = (currentUser.role as IdentityKey) || 'USER';
        setBookingHistory(readBookingHistory(key));
      }
    }
    void loadBackendBookings();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.role, request]);

  useEffect(() => {
    let cancelled = false;
    async function loadRecentScans() {
      if (view === 'checkin' && (currentRole === 'CHECK_IN_STAFF' || currentRole === 'ADMIN')) {
        try {
          const scans = await request<Array<{
            id: string;
            ticketCode: string | null;
            result: string;
            deviceId?: string;
            note?: string;
            scannedAt: string;
          }>>('/api/checkin/scans');
          if (!cancelled && Array.isArray(scans) && scans.length > 0) {
            const records: CheckinRecord[] = scans.map((s) => ({
              qrPayload: '',
              ticketCode: s.ticketCode,
              result: s.result,
              usedAt: s.scannedAt,
              deviceId: s.deviceId || 'web-gate-01',
            }));
            setCheckinHistory(records);
            setLastCheckin(records[0] ?? null);
            return;
          }
        } catch {
          // fallback
        }
      }
      if (!cancelled && currentRole) {
        const history = readCheckinHistory(currentRole);
        setCheckinHistory(history);
        setLastCheckin(history[0] ?? null);
      }
    }
    void loadRecentScans();
    return () => {
      cancelled = true;
    };
  }, [currentRole, request, view]);

  useEffect(() => {
    if (!currentUser) return;
    try {
      const key: IdentityKey = (currentUser.role as IdentityKey) || 'USER';
      window.localStorage.setItem(
        `${BOOKING_HISTORY_PREFIX}${key}`,
        JSON.stringify(bookingHistory),
      );
    } catch {
      // Local storage is best-effort only.
    }
  }, [bookingHistory, currentUser]);

  useEffect(() => {
    if (!currentRole) return;
    try {
      window.localStorage.setItem(
        `${CHECKIN_HISTORY_PREFIX}${currentRole}`,
        JSON.stringify(checkinHistory),
      );
    } catch {
      // Local storage is best-effort only.
    }
  }, [checkinHistory, currentRole]);

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
  const holdExpiresLabel = booking?.expiresAt ? formatDate(booking.expiresAt) : '';

  async function chooseEvent(event: Event) {
    // Selecting an event always starts a fresh seat-selection session.
    const show = event.shows[0] ?? demoShow;
    setSelectedEvent(event);
    setSelectedShow(show);
    setSelectedSeats([]);
    setBooking(null);
    setTickets([]);
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
    setBooking(null);
    setTickets([]);

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

    // Must be logged in to hold seats / book tickets
    if (!currentUser) {
      openAuth('login', 'Vui lòng đăng nhập tài khoản để tiến hành giữ chỗ và đặt vé.');
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
        holdId: hold.holdId,
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
      // Keep the created booking id in state before payment. If the payment
      // request is retried after a network error, we must not create a second
      // booking from the same converted hold.
      let bookingId = booking.bookingId;
      let currentBooking = booking;

      if (!bookingId) {
        const created = await request<{
          id: string;
          status: string;
          totalAmount: number;
          expiresAt?: string;
          seats: BookingSeat[];
        }>('/api/bookings', {
          method: 'POST',
          body: JSON.stringify({ holdId: booking.holdId }),
        });
        bookingId = created.id;
        currentBooking = {
          ...booking,
          ...created,
          id: created.id,
          bookingId: created.id,
          holdId: booking.holdId,
        };
        setBooking(currentBooking);
        saveBookingRecord(currentBooking);
      }

      const payment = await request<{
        bookingId: string;
        bookingStatus: string;
        paymentStatus: string;
        provider: string;
        providerReference: string;
        amount: number;
      }>(`/api/bookings/${bookingId}/payment`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `pay-${bookingId}` },
        body: JSON.stringify({ paymentMethod }),
      });

      // Backend cancels the booking and releases seats when the fake provider
      // declines payment. Only SUCCEEDED/PAID may continue to ticket issuance.
      if (payment.paymentStatus !== 'SUCCEEDED' || payment.bookingStatus !== 'PAID') {
        const failedBooking = { ...currentBooking, status: payment.bookingStatus };
        setBooking(failedBooking);
        saveBookingRecord(failedBooking, [], payment.paymentStatus);
        setNotice(`Thanh toan that bai: ${payment.paymentStatus}. Ghe da duoc mo lai.`);
        setSelectedSeats([]);
        if (selectedShow) {
          setSeats(await request<Seat[]>(`/api/shows/${selectedShow.id}/seats`));
        }
        setStep('seats');
        return;
      }

      const issuedTickets = await request<TicketData[]>(`/api/bookings/${bookingId}/tickets`);
      const paidBooking = { ...currentBooking, id: bookingId, bookingId, status: 'PAID', holdId: booking.holdId };
      setBooking(paidBooking);
      setTickets(issuedTickets);
      saveBookingRecord(paidBooking, issuedTickets, payment.paymentStatus);
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
    // Keep client navigation aligned with backend roles so an identity switch
    // cannot leave the user on a screen they are no longer allowed to use.
    if (!canAccessView(currentRole, nextView)) {
      if (nextView === 'admin' || nextView === 'checkin') {
        setNotice('Bạn cần đăng nhập bằng tài khoản có thẩm quyền để truy cập trang này.');
      }
      setView('browse');
      resetFlow();
      return;
    }
    setView(nextView);
    if (nextView === 'browse') {
      resetFlow();
    }
  }

  async function switchDemoUser(roleKey: IdentityKey) {
    const targetSession = identitySessions[roleKey];
    if (!targetSession) return;
    try {
      const res = await fetch(`${API}/api/identity/demo-token/${targetSession.userId}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json()) as User & { token?: string };
        setCurrentUser(data);
        setStoredUser(data);
        if (data.token) {
          setJwtToken(data.token);
          setStoredToken(data.token);
        }
        setBasicAuthHeader('');
        setNotice(`Đã chuyển sang vai trò thử nghiệm: ${data.displayName} (${data.role})`);
        return;
      }
    } catch {
      // Fallback
    }
    const fallbackUser: User = {
      id: targetSession.userId,
      email: targetSession.email,
      displayName: targetSession.displayName,
      role: targetSession.role,
    };
    setCurrentUser(fallbackUser);
    setStoredUser(fallbackUser);
    setNotice(`Đã chuyển sang vai trò thử nghiệm: ${fallbackUser.displayName} (${fallbackUser.role})`);
  }

  function openAuth(mode: 'login' | 'register', prompt?: string) {
    setAuthMode(mode);
    setAuthPrompt(prompt ?? '');
    setIsAuthOpen(true);
  }

  function handleLogout() {
    clearStoredAuth();
    setCurrentUser(null);
    setJwtToken('');
    setBasicAuthHeader('');
    if (view === 'admin' || view === 'checkin') {
      setView('browse');
    }
    resetFlow();
    setNotice('Bạn đã đăng xuất tài khoản thành công.');
  }

  async function submitIdentityAuth(data: {
    mode: 'login' | 'register';
    email: string;
    password: string;
    displayName?: string;
  }) {
    const { mode, email, password, displayName } = data;
    setAuthLoading(true);
    try {
      const payload =
        mode === 'register'
          ? {
              email,
              displayName: displayName?.trim() || email.split('@')[0] || 'Khách hàng',
              password,
            }
          : { email, password };
      const response = await fetch(`${API}/api/identity/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? `Lỗi xác thực: ${response.status}`);
      }

      const session = (await response.json()) as User & { token?: string };
      setCurrentUser(session);
      setStoredUser(session);
      if (session.token) {
        setJwtToken(session.token);
        setStoredToken(session.token);
      }
      setBasicAuthHeader(toBasicAuthHeader(email, password));
      setIsAuthOpen(false);
      setNotice(
        mode === 'register'
          ? `Tạo tài khoản thành công! Chào mừng ${session.displayName} gia nhập E-Booking.`
          : `Đăng nhập thành công! Chào mừng ${session.displayName} quay trở lại.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Yêu cầu xác thực thất bại.';
      setNotice(message);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }

  function saveBookingRecord(nextBooking: Booking, nextTickets: TicketData[] = [], paymentStatus?: string) {
    if (!nextBooking.bookingId) {
      return;
    }

    const record: BookingRecord = {
      bookingId: nextBooking.bookingId,
      holdId: nextBooking.holdId,
      status: nextBooking.status,
      totalAmount: nextBooking.totalAmount,
      seats: nextBooking.seats,
      eventTitle: nextBooking.eventTitle,
      show: nextBooking.show,
      expiresAt: nextBooking.expiresAt,
      tickets: nextTickets,
      paymentStatus,
    };
    setBookingHistory((current) => mergeBookingHistory(current, record));
  }

  async function cancelBooking(record: BookingRecord) {
    if (record.status !== 'PENDING_PAYMENT' && record.status !== 'PAID') {
      return;
    }

    setLoading(true);
    try {
      await request(`/api/bookings/${record.bookingId}/cancel`, { method: 'POST' });
      const cancelled = { ...record, status: 'CANCELLED' };
      setBookingHistory((current) => mergeBookingHistory(current, cancelled));
      if (booking?.bookingId === record.bookingId) {
        setBooking({ ...booking, status: 'CANCELLED' });
      }
      setNotice('Booking da duoc huy va ghe da duoc mo lai.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Khong the huy booking.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      {/* Global shell and top-level routes. Each view owns its local layout below. */}
      <Header
        view={view}
        currentUser={currentUser}
        identitySessions={identitySessions}
        onSwitchDemo={switchDemoUser}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
        onNavigate={navigate}
        onHome={resetFlow}
      />
      <AuthDialog
        isOpen={isAuthOpen}
        initialMode={authMode}
        promptMessage={authPrompt}
        onClose={() => setIsAuthOpen(false)}
        onSubmit={submitIdentityAuth}
        loading={authLoading}
        demoUsers={Object.values(identitySessions).map((s) => ({
          id: s.userId,
          email: s.email,
          displayName: s.displayName,
          role: s.role,
        }))}
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
          holdClockLabel={holdExpiresLabel}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onPay={pay}
          onBack={() => (step === 'seats' ? resetFlow() : setStep(step === 'ticket' ? 'checkout' : 'seats'))}
          onDone={resetFlow}
        />
      )}
      {view === 'bookings' && (
        !currentUser ? (
          <section className="content standalone">
            <p className="eyebrow">Tài khoản</p>
            <h1>Vé của tôi</h1>
            <div className="empty-history" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
              <Ticket size={44} className="text-stone-400 mx-auto mb-3" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#292524', marginBottom: '0.5rem' }}>
                Bạn chưa đăng nhập
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#78716c', maxWidth: '380px', margin: '0 auto 1.5rem auto' }}>
                Vui lòng đăng nhập để xem danh sách vé đã đặt và lịch sử giao dịch của bạn.
              </p>
              <button
                type="button"
                className="primary"
                onClick={() => openAuth('login', 'Đăng nhập để xem danh sách vé của bạn')}
              >
                Đăng nhập ngay
              </button>
            </div>
          </section>
        ) : (
          <BookingHistoryView
            records={bookingHistory}
            onBrowse={() => navigate('browse')}
            onCancel={cancelBooking}
          />
        )
      )}
      {view === 'checkin' && (
        <CheckinWorkspace
          identity={identity}
          value={scanValue}
          onChange={setScanValue}
          lastCheckin={lastCheckin}
          history={checkinHistory}
          loading={checkinLoading}
          onSubmit={async () => {
            if (!scanValue.trim()) {
              setNotice('Hay nhap QR payload truoc.');
              return;
            }
            try {
              setCheckinLoading(true);
              const qrPayload = scanValue.trim();
              const result = await request<{ ticketCode: string | null; result: string; usedAt?: string | null }>('/api/checkin/scans', {
                method: 'POST',
                body: JSON.stringify({ qrPayload, deviceId: 'web-gate-01', note: 'web sandbox' }),
              });
              setNotice(`${result.result}${result.ticketCode ? `: ${result.ticketCode}` : ''}`);
              const nextRecord: CheckinRecord = {
                qrPayload,
                ticketCode: result.ticketCode,
                result: result.result,
                usedAt: result.usedAt ?? null,
                deviceId: 'web-gate-01',
              };
              setCheckinHistory((current) => mergeCheckinHistory(current, nextRecord));
              setLastCheckin(nextRecord);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : 'Khong the check-in.');
            } finally {
              setCheckinLoading(false);
            }
          }}
        />
      )}
      {view === 'admin' && <AdminWorkspace identity={identity} request={request} />}

      <Footer />
    </main>
  );
}

// Role badge configuration for account tags
const ROLE_BADGE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  USER: { label: 'Khách hàng', badgeClass: 'bg-sky-100 text-sky-800 border-sky-300' },
  ORGANIZER: { label: 'Ban tổ chức', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  CHECK_IN_STAFF: { label: 'Soát vé', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  ADMIN: { label: 'Quản trị viên', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
};

// Global navigation and local identity-session switcher.
function Header({
  view,
  currentUser,
  identitySessions,
  onSwitchDemo,
  onOpenAuth,
  onLogout,
  onNavigate,
  onHome,
}: {
  view: View;
  currentUser: User | null;
  identitySessions: Record<IdentityKey, IdentitySession>;
  onSwitchDemo: (role: IdentityKey) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onNavigate: (view: View) => void;
  onHome: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const roleBadge = currentUser?.role ? (ROLE_BADGE_CONFIG[currentUser.role] ?? {
    label: currentUser.role,
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
  }) : null;

  return (
    <header className="sticky top-0 z-40 bg-[#f5f1e9]/95 backdrop-blur-md border-b border-[#dcd6cb] py-3.5 px-4 md:px-8 mb-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        {/* Brand logo & Main navigation */}
        <div className="flex items-center gap-6 md:gap-10">
          <button
            type="button"
            className="flex items-center gap-2.5 text-inherit border-0 bg-transparent cursor-pointer group text-left p-0"
            onClick={onHome}
          >
            <span className="w-9 h-9 rounded-full bg-[#db5a39] text-white flex items-center justify-center font-serif italic text-xl font-bold shadow-sm group-hover:scale-105 transition-transform">
              e
            </span>
            <span>
              <span className="block font-serif text-2xl font-bold tracking-tight text-stone-900 leading-none">
                ebooking
              </span>
              <small className="block text-[9px] font-sans font-bold tracking-wider text-stone-500 uppercase mt-0.5">
                Events / Tickets / Moments
              </small>
            </span>
          </button>

          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
            <NavButton active={view === 'browse'} icon={<Search size={16} />} onClick={() => onNavigate('browse')}>
              Khám phá
            </NavButton>
            <NavButton active={view === 'bookings'} icon={<Ticket size={16} />} onClick={() => onNavigate('bookings')}>
              Vé của tôi
            </NavButton>
            {canAccessView(currentUser?.role, 'checkin') && (
              <NavButton active={view === 'checkin'} icon={<QrCode size={16} />} onClick={() => onNavigate('checkin')}>
                Check-in
              </NavButton>
            )}
            {canAccessView(currentUser?.role, 'admin') && (
              <NavButton active={view === 'admin'} icon={<LayoutDashboard size={16} />} onClick={() => onNavigate('admin')}>
                Quản lý
              </NavButton>
            )}
          </nav>
        </div>

        {/* Right side: Demo tester selector & User profile / Auth buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Demo Switcher (Tool for testing & evaluation) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-200/75 border border-stone-300 rounded-lg text-xs text-stone-600">
            <FlaskConical size={13} className="text-[#db5a39]" />
            <span className="font-semibold text-stone-600">Chế độ Test:</span>
            <select
              value={currentUser ? currentUser.role : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  onSwitchDemo(val as IdentityKey);
                } else {
                  onLogout();
                }
              }}
              className="bg-transparent text-stone-900 font-semibold border-0 outline-none cursor-pointer text-xs"
              title="Chuyển nhanh tài khoản demo để kiểm thử vai trò"
            >
              <option value="">Khách (Chưa đăng nhập)</option>
              {Object.values(identitySessions).map((session) => (
                <option key={session.key} value={session.key}>
                  {session.displayName} ({session.role})
                </option>
              ))}
            </select>
          </div>

          {/* User state: Guest vs Authenticated */}
          {!currentUser ? (
            /* Guest State: Log In & Register Buttons */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn size={14} className="text-stone-500" />
                <span>Đăng nhập</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#db5a39] hover:bg-[#c44929] rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Đăng ký</span>
              </button>
            </div>
          ) : (
            /* Authenticated State: User Profile Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-2xs transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#db5a39]/30"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-[#34483f] text-white flex items-center justify-center font-bold text-xs shadow-inner">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-stone-900 leading-tight max-w-[130px] truncate" title={currentUser.displayName}>
                    {currentUser.displayName}
                  </span>
                  {roleBadge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border w-fit leading-normal mt-0.5 ${roleBadge.badgeClass}`}>
                      {roleBadge.label}
                    </span>
                  )}
                </div>
                <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/70">
                    <p className="text-xs font-bold text-stone-900 truncate">{currentUser.displayName}</p>
                    <p className="text-[11px] text-stone-500 truncate mt-0.5">{currentUser.email}</p>
                    {roleBadge && (
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border mt-2 ${roleBadge.badgeClass}`}>
                        {roleBadge.label}
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('bookings');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                    >
                      <Ticket size={15} className="text-stone-500" />
                      <span>Vé của tôi</span>
                    </button>

                    {canAccessView(currentUser.role, 'admin') && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('admin');
                          setDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                      >
                        <LayoutDashboard size={15} className="text-stone-500" />
                        <span>Quản lý sự kiện</span>
                      </button>
                    )}

                    {canAccessView(currentUser.role, 'checkin') && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('checkin');
                          setDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                      >
                        <QrCode size={15} className="text-stone-500" />
                        <span>Cổng soát vé</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-stone-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavButton({ active, icon, onClick, children }: { active: boolean; icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors border-0 cursor-pointer ${
        active
          ? 'text-stone-900 bg-stone-200/90 shadow-2xs'
          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
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
  holdClockLabel: string;
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
function SeatStep({ event, selectedShow, seats, selectedSeats, onChooseShow, onSeat, onContinue, holdClockLabel }: { event: Event; selectedShow: Show | null; seats: Seat[]; selectedSeats: string[]; onChooseShow: (show: Show) => void; onSeat: (seat: Seat) => void; onContinue: () => void; holdClockLabel: string }) {
  const selectedSeatObjects = seats.filter((seat) => selectedSeats.includes(seat.seatId));
  const shows = event.shows.length ? event.shows : [demoShow];
  return <section className="content"><div className="step-header"><div><p className="eyebrow">01 / Chon suat</p><h1>{event.title}</h1><p>{event.description}</p></div><StepIndicator /></div><div className="show-picker">{shows.map((show) => <button key={show.id} className={selectedShow?.id === show.id ? 'show-option selected' : 'show-option'} onClick={() => onChooseShow(show)}><Clock3 size={16} /><span>{formatDate(show.startsAt)}</span><small>{show.venueName}</small></button>)}</div><div className="seat-layout"><SeatMap seats={seats} selectedSeats={selectedSeats} onSeat={onSeat} /><SeatOrder selectedSeats={selectedSeatObjects} onContinue={onContinue} holdClockLabel={holdClockLabel} /></div></section>;
}

function StepIndicator() {
  return <div className="stepper"><span className="done"><Check size={14} />Event</span><span className="current">Ghe</span><span>Thanh toan</span><span>Ve</span></div>;
}

function SeatMap({ seats, selectedSeats, onSeat }: { seats: Seat[]; selectedSeats: string[]; onSeat: (seat: Seat) => void }) {
  return <div className="map-panel"><div className="stage">SAN KHAU</div><div className="seat-grid">{seats.map((seat) => <button key={seat.seatId} title={`${seat.section}-${seat.row}${seat.number}`} className={`seat ${seat.status.toLowerCase()} ${selectedSeats.includes(seat.seatId) ? 'selected' : ''}`} onClick={() => onSeat(seat)}><Armchair size={14} /><span>{seat.number}</span></button>)}</div><div className="legend"><span><i className="available" />Con trong</span><span><i className="selected-dot" />Dang chon</span><span><i className="sold" />Da ban</span></div></div>;
}

function SeatOrder({ selectedSeats, onContinue, holdClockLabel }: { selectedSeats: Seat[]; onContinue: () => void; holdClockLabel: string }) {
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  return <aside className="order-card"><p className="eyebrow">Ghe cua ban</p><h2>{selectedSeats.length ? `${selectedSeats.length} ghe da chon` : 'Chua chon ghe'}</h2><div className="selected-list">{selectedSeats.map((seat) => <div key={seat.seatId}><span>{seat.section}-{seat.row}{seat.number}</span><b>{formatMoney(seat.price)}</b></div>)}</div><div className="order-total"><span>Tong cong</span><strong>{formatMoney(total)}</strong></div><button className="primary full" disabled={!selectedSeats.length} onClick={onContinue}>Giu ghe & tiep tuc<ChevronRight size={17} /></button><small className="fine-print"><ShieldCheck size={13} />{holdClockLabel ? `Ghe duoc giu con ${holdClockLabel}` : 'Ghe duoc giu trong 5 phut'}</small></aside>;
}

// Checkout only collects the sandbox outcome; booking creation and ticket issuance live in App.pay.
function Checkout({ booking, paymentMethod, onPaymentMethodChange, onPay, loading }: { booking: Booking; paymentMethod: string; onPaymentMethodChange: (value: string) => void; onPay: () => void; loading: boolean }) {
  return <section className="content narrow"><p className="eyebrow">02 / Thanh toan</p><h1>Xac nhan booking</h1><p className="intro">Kiem tra thong tin truoc khi thanh toan sandbox.</p><div className="checkout-grid"><div className="summary-card"><span className="summary-art">{booking.eventTitle.slice(0, 2).toUpperCase()}</span><h2>{booking.eventTitle}</h2><p>{formatDate(booking.show.startsAt)} · {booking.show.venueName}</p><div className="summary-seats">{booking.seats.map((seat) => <span key={seat.seatId}>{seat.label}</span>)}</div><div className="order-total"><span>Tong cong</span><strong>{formatMoney(booking.totalAmount)}</strong></div><small className="fine-print">{booking.expiresAt ? `Giu ghe den ${formatDate(booking.expiresAt)}` : 'Giu ghe trong 5 phut'}</small></div><div className="payment-card"><label>Payment sandbox</label><PaymentChoice selected={paymentMethod === 'SUCCESS'} icon={<CreditCard />} title="Thanh toan thanh cong" description="Gui SUCCESS cho fake provider" onClick={() => onPaymentMethodChange('SUCCESS')} /><PaymentChoice selected={paymentMethod === 'FAIL'} icon={<WalletCards />} title="Tu choi thanh toan" description="Gui FAIL de kiem tra loi" onClick={() => onPaymentMethodChange('FAIL')} /><button className="primary full" disabled={loading} onClick={onPay}>{loading ? 'Dang xu ly...' : `Thanh toan ${formatMoney(booking.totalAmount)}`}<ChevronRight size={17} /></button><small className="fine-print"><ShieldCheck size={13} />Giao dich an toan trong moi truong demo</small></div></div></section>;
}

function PaymentChoice({ selected, icon, title, description, onClick }: { selected: boolean; icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return <button className={selected ? 'payment-choice selected' : 'payment-choice'} onClick={onClick}>{icon}<span><b>{title}</b><small>{description}</small></span><Check size={17} /></button>;
}

// Post-payment confirmation uses issued ticket data rather than reconstructing ticket codes locally.
function TicketView({ booking, tickets, onDone }: { booking: Booking; tickets: TicketData[]; onDone: () => void }) {
  return <section className="content narrow"><div className="success-heading"><span><Check size={26} /></span><p className="eyebrow">03 / Hoan tat</p><h1>Ve cua ban da san sang</h1><p>Booking <strong>{booking.id}</strong> da duoc xac nhan.</p></div><div className="ticket-stack">{tickets.map((ticket) => <article className="ticket" key={ticket.ticketCode}><div className="ticket-main"><p className="eyebrow">{booking.eventTitle}</p><h2>{ticket.ticketCode}</h2><p>{formatDate(booking.show.startsAt)} · {booking.show.venueName}</p><strong className="ticket-seat">Ghe {booking.seats.find((seat) => seat.seatId === ticket.seatId)?.label}</strong></div><div className="qr"><QrCode size={92} /><small>{ticket.status}</small></div></article>)}</div><button className="primary" onClick={onDone}>Kham pha them event<ChevronRight size={17} /></button></section>;
}

function BookingsPage({ records, onBrowse, onCancel }: { records: BookingRecord[]; onBrowse: () => void; onCancel: (record: BookingRecord) => void }) {
  // These compatibility values keep the old empty-state markup stable while the
  // history list below becomes the primary view.
  const booking: Booking | null = null;
  const onOpen = onBrowse;
  if (records.length) {
    return <section className="content standalone"><p className="eyebrow">Account</p><h1>Ve cua toi</h1><div className="booking-history">{records.map((record) => <HistoryBookingRow key={record.bookingId} record={record} onCancel={onCancel} />)}</div></section>;
  }
  return <section className="content standalone"><p className="eyebrow">Account</p><h1>Ve cua toi</h1><div className="empty-history">{booking ? <BookingRow booking={booking} onOpen={onBrowse} /> : <><Ticket size={34} /><h3>Chua co booking nao</h3><p>Nhung ve ban dat se xuat hien o day.</p><button className="primary" onClick={onBrowse}>Kham pha event</button></>}</div></section>;
}

function BookingHistoryPage({ records, onBrowse, onCancel }: { records: BookingRecord[]; onBrowse: () => void; onCancel: (record: BookingRecord) => void }) {
  return <BookingsPage records={records} onBrowse={onBrowse} onCancel={onCancel} />;
}

function HistoryBookingRow({ record, onCancel }: { record: BookingRecord; onCancel: (record: BookingRecord) => void }) {
  return <article className="booking-row"><span className="summary-art small">{record.eventTitle.slice(0, 2).toUpperCase()}</span><span><b>{record.eventTitle}</b><small>{formatDate(record.show.startsAt)} - {record.seats.length} ghe - {record.status}</small></span><strong>{formatMoney(record.totalAmount)}</strong>{record.status === 'PENDING_PAYMENT' && <button className="secondary" onClick={() => onCancel(record)}>Huy</button>}<ChevronRight size={18} /></article>;
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
