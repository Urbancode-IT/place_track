import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/** No auth — for public student fill links only */
export const publicApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});
