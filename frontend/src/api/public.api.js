import axios from 'axios';
import { API_BASE_URL } from '@/lib/apiConfig';

/** No auth — for public student fill links only */
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
