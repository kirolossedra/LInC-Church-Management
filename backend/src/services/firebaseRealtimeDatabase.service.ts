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
  putIfAbsent(path: readonly string[], value: unknown): Promise<boolean>
  delete(path: readonly string[]): Promise<void>
}

export type FirebaseGoogleAccessTokenProvider = () => Promise<string>

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
    putIfAbsent: (path, value) => putIfAbsent({
      normalizedDatabaseUrl,
      path,
      value,
      fetchImpl,
      authorization: async () => ({ query: { auth: idToken } }),
    }),
    delete: async path => {
      await request('DELETE', path)
    },
  }
}

export function createFirebaseAdminRealtimeDatabaseClient({
  databaseUrl,
  getAccessToken,
  fetchImpl = fetch,
}: {
  databaseUrl: string
  getAccessToken: FirebaseGoogleAccessTokenProvider
  fetchImpl?: FirebaseDatabaseFetch
}): FirebaseRealtimeDatabaseClient {
  const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrl)

  async function request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: readonly string[],
    value?: unknown,
  ): Promise<T | null> {
    const accessToken = await getAccessToken()
    const encodedPath = path.map(encodeURIComponent).join('/')
    const url = `${normalizedDatabaseUrl}/${encodedPath}.json`

    const response = await fetchImpl(url, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(value === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
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
    putIfAbsent: (path, value) => putIfAbsent({
      normalizedDatabaseUrl,
      path,
      value,
      fetchImpl,
      authorization: async () => ({
        headers: { Authorization: `Bearer ${await getAccessToken()}` },
      }),
    }),
    delete: async path => {
      await request('DELETE', path)
    },
  }
}

async function putIfAbsent({
  normalizedDatabaseUrl,
  path,
  value,
  fetchImpl,
  authorization,
}: {
  normalizedDatabaseUrl: string
  path: readonly string[]
  value: unknown
  fetchImpl: FirebaseDatabaseFetch
  authorization: () => Promise<{
    headers?: Record<string, string>
    query?: Record<string, string>
  }>
}): Promise<boolean> {
  const encodedPath = path.map(encodeURIComponent).join('/')
  const url = new URL(`${normalizedDatabaseUrl}/${encodedPath}.json`)
  const auth = await authorization()
  Object.entries(auth.query ?? {}).forEach(([key, queryValue]) => {
    url.searchParams.set(key, queryValue)
  })

  const existingResponse = await fetchImpl(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Firebase-ETag': 'true',
      ...auth.headers,
    },
  })
  if (!existingResponse.ok) {
    throw new FirebaseRealtimeDatabaseError(
      existingResponse.status,
      `Firebase Realtime Database returned HTTP ${existingResponse.status}.`,
    )
  }
  const currentValue = await existingResponse.json()
  if (currentValue !== null) return false

  const etag = existingResponse.headers.get('etag')
  if (!etag) {
    throw new FirebaseRealtimeDatabaseError(
      502,
      'Firebase Realtime Database did not return a transaction ETag.',
    )
  }

  const writeResponse = await fetchImpl(url.toString(), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'if-match': etag,
      ...auth.headers,
    },
    body: JSON.stringify(value),
  })
  if (writeResponse.status === 412) return false
  if (!writeResponse.ok) {
    throw new FirebaseRealtimeDatabaseError(
      writeResponse.status,
      `Firebase Realtime Database returned HTTP ${writeResponse.status}.`,
    )
  }
  return true
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
