import { apiClient } from './client';
import type { Event, PageResponse, Show } from './types';

export type EventSearchParams = {
  keyword?: string;
  genre?: string;
  cityId?: string;
  venueId?: string;
  page?: number;
  size?: number;
};

export const eventsApi = {
  async getPublishedEvents(page = 0, size = 20): Promise<PageResponse<Event>> {
    return apiClient<PageResponse<Event>>(`/api/events?page=${page}&size=${size}`);
  },

  async searchEvents(params: EventSearchParams): Promise<PageResponse<Event>> {
    const query = new URLSearchParams();
    if (params.keyword?.trim()) query.append('keyword', params.keyword.trim());
    if (params.genre?.trim()) query.append('genre', params.genre.trim());
    if (params.cityId) query.append('cityId', params.cityId);
    if (params.venueId) query.append('venueId', params.venueId);
    query.append('page', String(params.page ?? 0));
    query.append('size', String(params.size ?? 20));

    // Notice: /api/events returns Event objects with attached shows, while /api/events/search returns EventSummary
    // If filtering by city/venue/keyword/genre, we use /api/events or /api/events/search
    // In our backend, /api/events gives published events with their shows.
    // If no search filter is given, use /api/events. If filters are active, use /api/events/search then load shows or use /api/events with filtering
    return apiClient<PageResponse<Event>>(`/api/events?${query.toString()}`);
  },

  async getEventShows(eventId: string): Promise<Show[]> {
    return apiClient<Show[]>(`/api/events/${eventId}/shows`);
  },
};
