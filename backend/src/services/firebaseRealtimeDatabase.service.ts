export type FirebaseDatabaseFetch = typeof fetch

export class FirebaseRealtimeDatabaseError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'FirebaseRealtimeDatabaseError'
  }
}

export type FirebaseRealtimeDatabaseClient = {
  get<T>(path: readonly string[]): Promise<T | null>
  post<T>(path: readonly string[], value: unknown): Promise<T>
  patch<T>(path: readonly string[], value: unknown): Promise<T>
  delete(path: readonly string[]): Promise<void>
}

export function createFirebaseRealtimeDatabaseClient({
  databaseUrl,
  idToken,
  fetchImpl = fetch,
}: {
  databaseUrl: string
  idToken: string
  fetchImpl?: FirebaseDatabaseFetch
}): FirebaseRealtimeDatabaseClient {
  const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrl)

  async function request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: readonly string[],
    value?: unknown,
  ): Promise<T | null> {
    const encodedPath = path.map(encodeURIComponent).join('/')
    const url = new URL(
      `${normalizedDatabaseUrl}/${encodedPath}.json`,
    )
    url.searchParams.set('auth', idToken)

    const response = await fetchImpl(url.toString(), {
      method,
      headers: value === undefined
        ? { Accept: 'application/json' }
        : {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
      body: value === undefined
        ? undefined
        : JSON.stringify(value),
    })

    if (!response.ok) {
      throw new FirebaseRealtimeDatabaseError(
        response.status,
        `Firebase Realtime Database returned HTTP ${response.status}.`,
      )
    }

    if (response.status === 204) return null

    try {
      return (await response.json()) as T | null
    } catch {
      throw new FirebaseRealtimeDatabaseError(
        502,
        'Firebase Realtime Database returned invalid JSON.',
      )
    }
  }

  return {
    get: path => request('GET', path),
    post: async (path, value) => {
      const result = await request('POST', path, value)
      return result as never
    },
    patch: async (path, value) => {
      const result = await request('PATCH', path, value)
      return result as never
    },
    delete: async path => {
      await request('DELETE', path)
    },
  }
}

function normalizeDatabaseUrl(databaseUrl: string): string {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(databaseUrl.trim())
  } catch {
    throw new FirebaseRealtimeDatabaseError(
      503,
      'Firebase Realtime Database URL is invalid.',
    )
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new FirebaseRealtimeDatabaseError(
      503,
      'Firebase Realtime Database URL must use HTTPS.',
    )
  }

  return parsedUrl.toString().replace(/\/+$/, '')
}
