import { apiClient } from './client';
import type { City, Genre, Event, PageResponse, Show, Venue } from './types';

export const adminApi = {
  async getAdminEvents(page = 0, size = 100): Promise<PageResponse<Event>> {
    return apiClient<PageResponse<Event>>(`/api/admin/events?page=${page}&size=${size}`);
  },

  async createCity(name: string): Promise<City> {
    return apiClient<City>('/api/admin/cities', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async createVenue(payload: { cityId: string; name: string; address: string }): Promise<Venue> {
    return apiClient<Venue>('/api/admin/venues', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createGenre(payload: { name: string; slug: string }): Promise<Genre> {
    return apiClient<Genre>('/api/admin/genres', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createEvent(payload: { genreId: string; title: string; description: string }): Promise<{ id: string; title: string; published: boolean }> {
    return apiClient<{ id: string; title: string; published: boolean }>('/api/admin/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createShow(payload: { eventId: string; venueId: string; startsAt: string; endsAt: string }): Promise<Show> {
    return apiClient<Show>('/api/admin/shows', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async changePublication(eventId: string, published: boolean): Promise<{ id: string; title: string; published: boolean }> {
    return apiClient<{ id: string; title: string; published: boolean }>(`/api/admin/events/${eventId}/publication`, {
      method: 'PATCH',
      body: JSON.stringify({ published }),
    });
  },

  async deleteCity(cityId: string): Promise<void> {
    return apiClient<void>(`/api/admin/cities/${cityId}`, {
      method: 'DELETE',
    });
  },

  async deleteVenue(venueId: string): Promise<void> {
    return apiClient<void>(`/api/admin/venues/${venueId}`, {
      method: 'DELETE',
    });
  },

  async deleteEvent(eventId: string): Promise<void> {
    return apiClient<void>(`/api/admin/events/${eventId}`, {
      method: 'DELETE',
    });
  },
};
