interface StringConfig {
  type: 'string'
  required?: boolean
}
interface BooleanConfig {
  type: 'boolean'
  defaultValue?: boolean
}
type EnvConfigSchema = Record<string, StringConfig | BooleanConfig>

const envConfig = {
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
} as const satisfies EnvConfigSchema

type EnvConfig = {
  [K in keyof typeof envConfig]: (typeof envConfig)[K]['type'] extends 'boolean'
    ? boolean
    : (typeof envConfig)[K] extends { required: true }
      ? string
      : string | undefined
}

function processConfigEntry<K extends keyof typeof envConfig>(
  key: K,
  config: (typeof envConfig)[K],
): EnvConfig[K] {
  if (config.type === 'boolean') {
    return getEnvFlag(
      key as string,
      (config as BooleanConfig).defaultValue ?? false,
    ) as EnvConfig[K]
  } else {
    const stringConfig = config as StringConfig
    if (stringConfig.required === true) {
      return getEnv(key as string, true) as EnvConfig[K]
    } else {
      return getEnv(key as string, false) as EnvConfig[K]
    }
  }
}

function loadEnv(): EnvConfig {
  const entries = (Object.keys(envConfig) as (keyof typeof envConfig)[]).map(
    (key) => [key, processConfigEntry(key, envConfig[key])] as const,
  )

  return Object.fromEntries(entries) as EnvConfig
}

export default loadEnv()

function getEnv(key: string, required: true): string
function getEnv(key: string, required?: false): string | undefined
function getEnv(key: string, required = false): string | undefined {
  const value = process.env[key]

  if (value === undefined && required) {
    throw new Error(
      `Missing required configuration. Please set the ${key} environment variable.`,
    )
  }

  return value
}

function getEnvFlag(key: string, defaultValue = false): boolean {
  const value = process.env[key]

  if (value === undefined) {
    return defaultValue
  }

  const falseValues = ['0', 'false', 'no', 'off', '']
  return !falseValues.includes(value.toLowerCase().trim())
}
