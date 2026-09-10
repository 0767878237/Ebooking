import { apiClient } from './client';
import type { Booking, PaymentResponse } from './types';

export const bookingsApi = {
  async createBooking(holdId: string): Promise<Booking> {
    return apiClient<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ holdId }),
    });
  },

  async getBooking(bookingId: string): Promise<Booking> {
    return apiClient<Booking>(`/api/bookings/${bookingId}`);
  },

  async getMyBookings(): Promise<Booking[]> {
    return apiClient<Booking[]>('/api/bookings');
  },

  async payBooking(bookingId: string, paymentMethod: string): Promise<PaymentResponse> {
    return apiClient<PaymentResponse>(`/api/bookings/${bookingId}/payment`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
    });
  },

  async cancelBooking(bookingId: string): Promise<void> {
    return apiClient<void>(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
    });
  },
};
