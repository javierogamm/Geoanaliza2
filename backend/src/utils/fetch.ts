import fetch, { RequestInit } from 'node-fetch';

const USER_AGENT = 'AppGeoAnaliza/1.0 (contact: josem.juangracia@gmail.com)';

export const withUserAgent = (options: RequestInit = {}): RequestInit => ({
  ...options,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept-Language': 'es,en;q=0.8',
    ...(options.headers || {})
  }
});

export default fetch;
