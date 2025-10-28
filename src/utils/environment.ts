import { CI_PROVIDER } from '@/core/types'

interface StringConfig {
  type: 'string'
  required?: boolean
  secret?: boolean
}
interface BooleanConfig {
  type: 'boolean'
  defaultValue?: boolean
  secret?: boolean
}
type EnvironmentConfigSchema = Readonly<Record<string, StringConfig | BooleanConfig>>

const environmentConfig = {
  BUDDY_UT_TOKEN: { type: 'string', required: true, secret: true },
  CI: { type: 'boolean' },
  BUDDY_LOGGER_LEVEL: { type: 'string' },
  BUDDY_API_URL: { type: 'string' },
  BUDDY_SESSION_ID: { type: 'string' },
  BUDDY_API_FAILURE: { type: 'boolean' },

  // Buddy environment variables
  BUDDY: { type: 'boolean' },
  BUDDY_RUN_HASH: { type: 'string' },
  BUDDY_ACTION_RUN_HASH: { type: 'string' },
  BUDDY_RUN_REF_NAME: { type: 'string' },
  BUDDY_RUN_REF_TYPE: { type: 'string' },
  BUDDY_RUN_COMMIT: { type: 'string' },
  BUDDY_RUN_PRE_COMMIT: { type: 'string' },
  BUDDY_RUN_BRANCH: { type: 'string' },
  BUDDY_RUN_ID: { type: 'string' },
  BUDDY_RUN_URL: { type: 'string' },
  BUDDY_TRIGGERING_ACTOR_ID: { type: 'string' },

  // GitHub Actions environment variables
  GITHUB_REPOSITORY: { type: 'string' },
  GITHUB_SHA: { type: 'string' },
  GITHUB_REF: { type: 'string' },
  GITHUB_REF_NAME: { type: 'string' },
  GITHUB_REF_TYPE: { type: 'string' },
  GITHUB_WORKFLOW: { type: 'string' },
  GITHUB_RUN_ID: { type: 'string' },
  GITHUB_RUN_NUMBER: { type: 'string' },
  GITHUB_ACTOR: { type: 'string' },
  GITHUB_ACTOR_ID: { type: 'string' },
  GITHUB_SERVER_URL: { type: 'string' },
  GITHUB_API_URL: { type: 'string' },
  GITHUB_ACTIONS: { type: 'boolean' },
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

interface EnvironmentResult {
  error?: unknown
  variables: EnvironmentConfig
}

function loadEnvironment(): EnvironmentResult {
  const variables = {} as EnvironmentConfig

  // validate required variables at load time for early error detection
  for (const key of Object.keys(environmentConfig) as (keyof typeof environmentConfig)[]) {
    try {
      const config = environmentConfig[key]
      if (config.type === 'string' && (config as StringConfig).required) {
        getEnvironment(key as string, true)
      }
    } catch (error: unknown) {
      return {
        error,
        variables: {} as EnvironmentConfig,
      }
    }
  }

  // define getters for all variables to read fresh from process.env
  for (const key of Object.keys(environmentConfig) as (keyof typeof environmentConfig)[]) {
    Object.defineProperty(variables, key, {
      get() {
        return processConfigEntry(key, environmentConfig[key])
      },
      enumerable: true,
      configurable: true,
    })
  }

  return {
    variables,
  }
}

function setEnvironmentVariable<K extends keyof typeof environmentConfig>(key: K, value: EnvironmentConfig[K]): void {
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
  const MISSING_REQUIRED_ENVIRONMENT_VARIABLE_ERROR = `Missing required configuration. Please set the ${key} environment variable.`

  const value = process.env[key]

  if (value === undefined) {
    if (required) {
      throw new Error(MISSING_REQUIRED_ENVIRONMENT_VARIABLE_ERROR)
    }
    return undefined
  }

  // Trim whitespace from string values
  const trimmedValue = value.trim()

  // Treat empty strings as undefined after trimming
  if (trimmedValue === '') {
    if (required) {
      throw new Error(MISSING_REQUIRED_ENVIRONMENT_VARIABLE_ERROR)
    }
    return undefined
  }

  return trimmedValue
}

function getEnvironmentFlag(key: string, defaultValue = false): boolean {
  const value = process.env[key]

  if (value === undefined) {
    return defaultValue
  }

  const falseValues = ['0', 'false', 'no', 'off', '']
  return !falseValues.includes(value.toLowerCase().trim())
}

function detectCIProvider(): CI_PROVIDER {
  const result = loadEnvironment()

  if (result.variables.BUDDY) {
    return CI_PROVIDER.BUDDY
  }

  if (result.variables.GITHUB_ACTIONS) {
    return CI_PROVIDER.GITHUB_ACTION
  }

  return CI_PROVIDER.NONE
}

const environmentResult = loadEnvironment()
export default environmentResult.variables
export const environmentError = environmentResult.error

export { setEnvironmentVariable, detectCIProvider, environmentConfig, type EnvironmentResult }
