/**
 * CampusRide API Client — Typed fetch wrapper.
 * Used by both web (React) and mobile (Expo) apps.
 *
 * In M0 this is a minimal stub. It will grow as endpoints are added in M2+.
 */

import type { Problem } from '@campusride/shared';

export interface ApiClientConfig {
  baseUrl: string;
  /** Access token (in-memory, refreshed automatically) */
  getAccessToken?: (() => string | null) | undefined;
  /** Called when access token expires and needs refresh */
  onRefreshToken?: (() => Promise<string | null>) | undefined;
  /** Called when session is fully expired (logout) */
  onSessionExpired?: (() => void) | undefined;
}

export class ApiError extends Error {
  constructor(
    public readonly problem: Problem,
    public readonly status: number,
  ) {
    super(problem.detail);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string> | undefined;
  signal?: AbortSignal | undefined;
}

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: RequestOptions,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const token = this.config.getAccessToken?.();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const init: RequestInit = {
      method,
      headers,
      credentials: 'include', // for httpOnly refresh cookie
    };

    if (options?.body != null) {
      init.body = JSON.stringify(options.body);
    }

    if (options?.signal) {
      init.signal = options.signal;
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      const problem = (await response.json()) as Problem;
      if (response.status === 401) {
        this.config.onSessionExpired?.();
      }
      throw new ApiError(problem, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>('GET', path, { signal });
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', path, { body, headers });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

/** Create a singleton API client instance */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export * from '@campusride/shared';
