import { getQboApiBaseUrl } from './env';
import { getValidQuickBooksAccessToken } from './tokens';

/** Thrown when the connection must be re-authorized (401 / token invalid). */
export class QuickBooksNeedsReauthError extends Error {
  readonly status = 401;
  constructor(message = 'QuickBooks connection needs re-authorization') {
    super(message);
    this.name = 'QuickBooksNeedsReauthError';
  }
}

/** Thrown when the API returns an error (4xx/5xx). Includes status and parsed detail. */
export class QuickBooksApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'QuickBooksApiError';
  }
}

/** Options for a single QuickBooks API request. path may contain {realmId} placeholder. */
export type QuickBooksRequestOptions = {
  /** Path including optional {realmId}, e.g. "/v3/company/{realmId}/query". */
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** JSON body for POST/PUT. */
  body?: unknown;
  /** Query params appended to path (will be encoded). */
  searchParams?: Record<string, string>;
};

const MAX_RETRIES_429 = 3;
const DEFAULT_BACKOFF_MS = 2000;

function parseErrorBody(data: unknown): { code?: string; message?: string; detail?: string } {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const fault = o.Fault as Record<string, unknown> | undefined;
    if (fault && Array.isArray(fault.Error)) {
      const err = (fault.Error as Array<Record<string, unknown>>)[0];
      if (err) {
        return {
          code: err.code as string | undefined,
          message: (err.message ?? err.Message) as string | undefined,
          detail: (err.detail ?? err.Detail) as string | undefined,
        };
      }
    }
    return {
      code: o.code as string | undefined,
      message: o.message as string | undefined,
      detail: o.detail as string | undefined,
    };
  }
  return {};
}

/**
 * Sends an authenticated request to the QuickBooks API.
 * - Uses getValidQuickBooksAccessToken (handles refresh).
 * - Resolves sandbox vs production via QBO_ENVIRONMENT.
 * - On 401: throws QuickBooksNeedsReauthError.
 * - On 429: retries up to MAX_RETRIES_429 with Retry-After or exponential backoff.
 * - On other 4xx/5xx: throws QuickBooksApiError with status and parsed message.
 * Server-only; never expose tokens to the frontend.
 */
function isTokenReauthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /refresh token|invalid|authorize again|token expired|needs_reauth/i.test(msg);
}

export async function quickBooksRequest<T = unknown>(
  clientId: string,
  options: QuickBooksRequestOptions
): Promise<T> {
  const { path, method = 'GET', body, searchParams } = options;

  let accessToken: string;
  let realmId: string;
  try {
    const tokenResult = await getValidQuickBooksAccessToken(clientId);
    accessToken = tokenResult.accessToken;
    realmId = tokenResult.realmId;
  } catch (err) {
    if (isTokenReauthError(err)) {
      const msg = err instanceof Error ? err.message : 'QuickBooks connection needs re-authorization';
      throw new QuickBooksNeedsReauthError(msg);
    }
    throw err;
  }

  const baseUrl = getQboApiBaseUrl();
  const pathWithRealm = path.replace('{realmId}', realmId);
  let url = `${baseUrl}${pathWithRealm}`;
  if (searchParams && Object.keys(searchParams).length > 0) {
    const sp = new URLSearchParams(searchParams).toString();
    url += (pathWithRealm.includes('?') ? '&' : '?') + sp;
  }

  let lastResponse: Response | null = null;
  let lastBody: unknown = null;
  let attempt = 0;

  const doFetch = async (): Promise<Response> => {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        ...(body !== undefined && {
          'Content-Type': 'application/json',
        }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    lastResponse = res;
    if (!res.ok) {
      const contentType = res.headers.get('content-type');
      lastBody = contentType?.includes('application/json')
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);
    }
    return res;
  };

  while (true) {
    const res = await doFetch();

    if (res.status === 401) {
      throw new QuickBooksNeedsReauthError();
    }

    if (res.status === 429) {
      attempt += 1;
      if (attempt > MAX_RETRIES_429) {
        const parsed = parseErrorBody(lastBody);
        throw new QuickBooksApiError(
          parsed.message ?? parsed.detail ?? 'Rate limit exceeded (429)',
          429,
          parsed.code,
          parsed.detail
        );
      }
      const retryAfter = res.headers.get('Retry-After');
      const waitMs = retryAfter
        ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
        : DEFAULT_BACKOFF_MS * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const parsed = parseErrorBody(lastBody);
      const message =
        parsed.message ?? parsed.detail ?? `QuickBooks API error ${res.status}`;
      throw new QuickBooksApiError(
        message,
        res.status,
        parsed.code,
        parsed.detail
      );
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }
}
