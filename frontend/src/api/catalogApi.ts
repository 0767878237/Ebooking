import { apiClient } from './client';
import type { City, Genre, PageResponse, Venue } from './types';

export const catalogApi = {
  async getCities(page = 0, size = 100): Promise<PageResponse<City>> {
    return apiClient<PageResponse<City>>(`/api/catalog/cities?page=${page}&size=${size}`);
  },

  async getVenues(cityId?: string, page = 0, size = 100): Promise<PageResponse<Venue>> {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (cityId) {
      query.append('cityId', cityId);
    }
    return apiClient<PageResponse<Venue>>(`/api/catalog/venues?${query.toString()}`);
  },

  async getGenres(): Promise<string[]> {
    return apiClient<string[]>('/api/catalog/genres');
  },

  async getGenreDetails(): Promise<Genre[]> {
    return apiClient<Genre[]>('/api/catalog/genres/details');
  },
};
