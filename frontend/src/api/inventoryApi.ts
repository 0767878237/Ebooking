import { apiClient } from './client';
import type { Seat, SeatHoldResponse } from './types';

export const inventoryApi = {
  async getSeatMap(showId: string): Promise<Seat[]> {
    return apiClient<Seat[]>(`/api/shows/${showId}/seats`);
  },

  async createSeatHold(showId: string, seatIds: string[]): Promise<SeatHoldResponse> {
    return apiClient<SeatHoldResponse>(`/api/shows/${showId}/holds`, {
      method: 'POST',
      body: JSON.stringify({ seatIds }),
    });
  },
};
