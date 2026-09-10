import { apiClient } from './client';
import type { ScanRecord, ScanResponse, Ticket } from './types';

export const ticketsApi = {
  async getBookingTickets(bookingId: string): Promise<Ticket[]> {
    return apiClient<Ticket[]>(`/api/bookings/${bookingId}/tickets`);
  },

  async scanTicket(payload: { qrPayload: string; deviceId?: string; note?: string }): Promise<ScanResponse> {
    return apiClient<ScanResponse>('/api/checkin/scans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getRecentScans(): Promise<ScanRecord[]> {
    return apiClient<ScanRecord[]>('/api/checkin/scans');
  },
};
