const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3000';
const APP_BASE_URL = import.meta.env.PUBLIC_APP_BASE_URL || 'http://localhost:4321';

export function getShortUrl(code: string): string {
  return `${APP_BASE_URL}/r/${code}`;
}

export function getAppUrl(path: string): string {
  return `${APP_BASE_URL}${path}`;
}

export function getApiUrl(path: string): string {
  return `${API_BASE_URL}/api/v1${path}`;
}

export { API_BASE_URL, APP_BASE_URL };
