const FIRST_WORDS = [
  'Cedar',
  'Harbor',
  'Maple',
  'Olive',
  'River',
  'Stone',
  'Willow',
  'Winter',
] as const

const SECOND_WORDS = [
  'Beacon',
  'Bridge',
  'Garden',
  'Light',
  'Meadow',
  'Morning',
  'Promise',
  'Valley',
] as const

export type RandomUint32 = () => number

export function generateMemorableTemporaryPassword(
  randomUint32: RandomUint32 = secureRandomUint32,
) {
  const first = FIRST_WORDS[randomUint32() % FIRST_WORDS.length]
  const second = SECOND_WORDS[randomUint32() % SECOND_WORDS.length]
  const digits = String(100 + (randomUint32() % 900))
  const suffix = randomUint32().toString(16).padStart(8, '0').slice(-6).toUpperCase()
  return `${first}-${second}-${digits}-${suffix}!`
}

function secureRandomUint32() {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0]
}
