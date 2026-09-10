export type Role = 'USER' | 'ORGANIZER' | 'CHECK_IN_STAFF' | 'ADMIN';

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  token?: string;
};

export type DemoUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
};

export type City = {
  id: string;
  name: string;
};

export type Venue = {
  id: string;
  cityId: string;
  name: string;
  address: string;
};

export type Genre = {
  id: string;
  name: string;
  slug: string;
};

export type Show = {
  id: string;
  venueId?: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  category: string;
  genre?: string;
  published?: boolean;
  shows: Show[];
};

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD';

export type Seat = {
  seatId: string;
  section: string;
  row: string;
  number: number;
  status: SeatStatus;
  price: number;
};

export type SeatHoldSeat = {
  seatId: string;
  price: number;
};

export type SeatHoldResponse = {
  holdId: string;
  showId: string;
  expiresAt: string;
  seats: SeatHoldSeat[];
};

export type BookingSeat = {
  seatId: string;
  label: string;
  price: number;
};

export type BookingStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'EXPIRED';

export type Booking = {
  id: string;
  holdId: string;
  status: BookingStatus;
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

export type PaymentRequest = {
  paymentMethod: 'SUCCESS' | 'FAIL' | string;
};

export type PaymentResponse = {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string;
  provider?: string;
  providerReference?: string;
  amount: number;
};

export type TicketStatus = 'ISSUED' | 'USED' | 'CANCELLED';

export type Ticket = {
  id: string;
  bookingId: string;
  seatId: string;
  ticketCode: string;
  qrPayload: string;
  status: TicketStatus;
  issuedAt: string;
  usedAt?: string | null;
};

export type CheckinScanResult = 'ACCEPTED' | 'ALREADY_USED' | 'CANCELLED' | 'INVALID';

export type ScanResponse = {
  ticketCode: string | null;
  result: CheckinScanResult;
  usedAt?: string | null;
};

export type ScanRecord = {
  id: string;
  ticketCode: string | null;
  result: CheckinScanResult;
  deviceId?: string;
  note?: string;
  scannedAt: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ViewTab = 'browse' | 'bookings' | 'checkin' | 'admin';
export type BookingStep = 'browse' | 'seats' | 'checkout' | 'ticket';
