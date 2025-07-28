interface StringConfig {
  type: 'string'
  required?: boolean
}
interface BooleanConfig {
  type: 'boolean'
  defaultValue?: boolean
}
type EnvironmentConfigSchema = Readonly<Record<string, StringConfig | BooleanConfig>>

const environmentConfig = {
  BUDDY_UT_TOKEN: { type: 'string', required: true },
  BUDDY_LOGGER_DEBUG: { type: 'boolean' },
  BUDDY_API_URL: { type: 'string' },
  BUDDY_SESSION_ID: { type: 'string' },
  BUDDY_RUN_HASH: { type: 'string' },
  BUDDY_RUN_REF_NAME: { type: 'string' },
  BUDDY_RUN_REF_TYPE: { type: 'string' },
  BUDDY_RUN_COMMIT: { type: 'string' },
  BUDDY_RUN_PRE_COMMIT: { type: 'string' },
  BUDDY_RUN_BRANCH: { type: 'string' },
  BUDDY_RUN_URL: { type: 'string' },
  BUDDY_TRIGGERING_ACTOR_ID: { type: 'string' },
} as const satisfies EnvironmentConfigSchema

type EnvironmentConfig = {
  [K in keyof typeof environmentConfig]: (typeof environmentConfig)[K]['type'] extends 'boolean'
    ? boolean
    : (typeof environmentConfig)[K] extends { required: true }
      ? string
      : string | undefined
}

function processConfigEntry<K extends keyof typeof environmentConfig>(
  key: K,
  config: (typeof environmentConfig)[K],
): EnvironmentConfig[K] {
  if (config.type === 'boolean') {
    return getEnvironmentFlag(key as string, (config as BooleanConfig).defaultValue ?? false) as EnvironmentConfig[K]
  } else {
    const stringConfig = config as StringConfig
    return stringConfig.required === true
      ? (getEnvironment(key as string, true) as EnvironmentConfig[K])
      : (getEnvironment(key as string, false) as EnvironmentConfig[K])
  }
}

function loadEnvironment(): EnvironmentConfig {
  const entries = (Object.keys(environmentConfig) as (keyof typeof environmentConfig)[]).map(
    (key) => [key, processConfigEntry(key, environmentConfig[key])] as const,
  )

  return Object.fromEntries(entries) as EnvironmentConfig
}

function setEnvironment<K extends keyof typeof environmentConfig>(key: K, value: EnvironmentConfig[K]): void {
  const config = environmentConfig[key]

  if (config.type === 'boolean') {
    process.env[key as string] = value ? '1' : '0'
  } else {
    if (value === undefined) {
      process.env[key as string] = ''
    } else {
      process.env[key as string] = value as string
    }
  }
}

function getEnvironment(key: string, required: true): string
function getEnvironment(key: string, required?: false): string | undefined
function getEnvironment(key: string, required = false): string | undefined {
  const value = process.env[key]

  if (value === undefined && required) {
    throw new Error(`Missing required configuration. Please set the ${key} environment variable.`)
  }

  return value
}

function getEnvironmentFlag(key: string, defaultValue = false): boolean {
  const value = process.env[key]

  if (value === undefined) {
    return defaultValue
  }

  const falseValues = ['0', 'false', 'no', 'off', '']
  return !falseValues.includes(value.toLowerCase().trim())
}

export default loadEnvironment()
export { setEnvironment as setEnv }
