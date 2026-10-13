import { api } from './api';

export const request = {
  get: async (url, params = {}) => {
    try {
      const response = await api.get(url, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Terjadi kesalahan sistem';
    }
  },

  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Terjadi kesalahan sistem';
    }
  },

  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Terjadi kesalahan sistem';
    }
  },

  delete: async (url) => {
    try {
      const response = await api.delete(url);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Terjadi kesalahan sistem';
    }
  },

  downloadBlob: async (url, params = {}) => {
    try {
      const response = await api.get(url, {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Gagal mengunduh file';
    }
  },
};
