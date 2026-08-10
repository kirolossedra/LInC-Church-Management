const baseUrl = (process.env.LINC_BACKEND_URL || 'https://linc-backend.linc-ministry.workers.dev').replace(/\/+$/, '')
const maxAttempts = Number(process.env.LINC_SMOKE_ATTEMPTS || 6)
const retryDelayMs = Number(process.env.LINC_SMOKE_RETRY_DELAY_MS || 5_000)

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: 'application/json' },
  })
  const contentType = response.headers.get('content-type') || ''
  let body = null
  try { body = await response.json() } catch { body = null }
  return { response, contentType, body }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function verifyProductionContract() {
  const health = await getJson('/api/v1/nextgen/health')
  assert(health.response.status === 200, `NextGen health returned HTTP ${health.response.status}; the Worker is probably not deployed.`)
  assert(health.contentType.includes('application/json'), 'NextGen health did not return JSON.')
  assert(health.body?.success === true, 'NextGen health did not report success.')
  assert(health.body?.data?.service === 'nextgen', 'NextGen health returned the wrong service contract.')
  assert(health.body?.data?.contractVersion === 1, 'NextGen health returned the wrong contract version.')

  for (const path of [
    '/api/v1/nextgen/qa/sessions',
    '/api/v1/nextgen/files',
    '/api/v1/nextgen/files/folders',
  ]) {
    const result = await getJson(path)
    assert(result.response.status === 401, `${path} returned HTTP ${result.response.status}; expected protected-route HTTP 401.`)
    assert(result.contentType.includes('application/json'), `${path} did not return JSON.`)
    assert(result.body?.error?.code === 'AUTHENTICATION_REQUIRED', `${path} returned the wrong authentication contract.`)
  }
}

let lastError
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    await verifyProductionContract()
    console.log(`Production NextGen backend smoke check passed on attempt ${attempt}.`)
    process.exit(0)
  } catch (error) {
    lastError = error
    if (attempt < maxAttempts) {
      console.warn(`Production smoke attempt ${attempt} failed: ${error instanceof Error ? error.message : error}`)
      await new Promise(resolve => setTimeout(resolve, retryDelayMs))
    }
  }
}

throw lastError
