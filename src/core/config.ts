import { execSync } from 'node:child_process'
import { IncomingHttpHeaders } from 'node:http'
import environment, { type CIEnvironment, detectCIEnvironment } from '@/utils/environment'
import { Logger } from '@/utils/logger'

export default class BuddyUnitTestCollectorConfig {
  static displayName = 'BuddyUnitTestCollectorConfig'
  static libraryName = '@buddy-works/test-collector'

  #logger: Logger
  context: string
  environment: CIEnvironment

  utToken!: string
  debugEnabled!: boolean
  apiBaseUrl!: string

  sessionId?: string
  triggeringActorId?: string
  runHash?: string
  runRefName?: string
  runRefType!: string
  runCommit?: string
  runPreCommit?: string
  runBranch?: string
  buildUrl?: string

  constructor(context: string) {
    this.context = context
    this.environment = detectCIEnvironment()

    const loggerNameWithContext = `${BuddyUnitTestCollectorConfig.displayName}_${context}`
    this.#logger = new Logger(loggerNameWithContext)

    // Load configuration based on CI environment
    if (this.environment === 'github_actions') {
      this.#loadGitHubActionsConfig()
    } else {
      this.#loadBuddyConfig()
    }

    this.#logger.debug(
      `Config loaded in ${BuddyUnitTestCollectorConfig.libraryName} (environment: ${this.environment})`,
    )
  }

  #loadBuddyConfig(): void {
    this.#logger.debug('Loading Buddy CI configuration')

    // Log detected environment variables
    const detectedVariables: Record<string, string | boolean | undefined> = {
      BUDDY_UT_TOKEN: environment.BUDDY_UT_TOKEN ? '***' : undefined,
      BUDDY_LOGGER_DEBUG: environment.BUDDY_LOGGER_DEBUG,
      BUDDY_API_URL: environment.BUDDY_API_URL,
      BUDDY_SESSION_ID: environment.BUDDY_SESSION_ID,
      BUDDY_TRIGGERING_ACTOR_ID: environment.BUDDY_TRIGGERING_ACTOR_ID,
      BUDDY_RUN_HASH: environment.BUDDY_RUN_HASH,
      BUDDY_RUN_REF_NAME: environment.BUDDY_RUN_REF_NAME,
      BUDDY_RUN_REF_TYPE: environment.BUDDY_RUN_REF_TYPE,
      BUDDY_RUN_COMMIT: environment.BUDDY_RUN_COMMIT,
      BUDDY_RUN_PRE_COMMIT: environment.BUDDY_RUN_PRE_COMMIT,
      BUDDY_RUN_BRANCH: environment.BUDDY_RUN_BRANCH,
      BUDDY_RUN_URL: environment.BUDDY_RUN_URL,
    }

    const foundVariables = Object.entries(detectedVariables)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${String(value)}`)

    if (foundVariables.length > 0) {
      this.#logger.debug(`Detected Buddy environment variables: ${foundVariables.join(', ')}`)
    }

    this.utToken = environment.BUDDY_UT_TOKEN
    this.debugEnabled = environment.BUDDY_LOGGER_DEBUG
    this.apiBaseUrl = environment.BUDDY_API_URL || this.#fallback.apiBaseUrl
    this.sessionId = environment.BUDDY_SESSION_ID
    this.triggeringActorId = environment.BUDDY_TRIGGERING_ACTOR_ID
    this.runHash = environment.BUDDY_RUN_HASH
    this.runRefName = environment.BUDDY_RUN_REF_NAME
    this.runRefType = environment.BUDDY_RUN_REF_TYPE || this.#fallback.runRefType
    this.runCommit = environment.BUDDY_RUN_COMMIT || this.#fallback.runCommit
    this.runPreCommit = environment.BUDDY_RUN_PRE_COMMIT || this.#fallback.runPreCommit
    this.runBranch = environment.BUDDY_RUN_BRANCH || this.#fallback.runBranch
    this.buildUrl = environment.BUDDY_RUN_URL

    this.#logLoadedConfig()
  }

  #loadGitHubActionsConfig(): void {
    this.#logger.debug('Loading GitHub Actions configuration')

    // Log detected environment variables
    const detectedVariables: Record<string, string | boolean | undefined> = {
      BUDDY_UT_TOKEN: environment.BUDDY_UT_TOKEN ? '***' : undefined,
      BUDDY_LOGGER_DEBUG: environment.BUDDY_LOGGER_DEBUG,
      BUDDY_API_URL: environment.BUDDY_API_URL,
      GITHUB_API_URL: environment.GITHUB_API_URL,
      GITHUB_REPOSITORY: environment.GITHUB_REPOSITORY,
      GITHUB_SHA: environment.GITHUB_SHA,
      GITHUB_REF: environment.GITHUB_REF,
      GITHUB_REF_NAME: environment.GITHUB_REF_NAME,
      GITHUB_REF_TYPE: environment.GITHUB_REF_TYPE,
      GITHUB_WORKFLOW: environment.GITHUB_WORKFLOW,
      GITHUB_RUN_ID: environment.GITHUB_RUN_ID,
      GITHUB_RUN_NUMBER: environment.GITHUB_RUN_NUMBER,
      GITHUB_ACTOR: environment.GITHUB_ACTOR,
      GITHUB_ACTOR_ID: environment.GITHUB_ACTOR_ID,
      GITHUB_SERVER_URL: environment.GITHUB_SERVER_URL,
      GITHUB_ACTIONS: environment.GITHUB_ACTIONS,
    }

    const foundVariables = Object.entries(detectedVariables)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${String(value)}`)

    if (foundVariables.length > 0) {
      this.#logger.debug(`Detected GitHub Actions environment variables: ${foundVariables.join(', ')}`)
    }

    this.utToken = environment.BUDDY_UT_TOKEN
    this.debugEnabled = environment.BUDDY_LOGGER_DEBUG || false
    this.apiBaseUrl = environment.BUDDY_API_URL || environment.GITHUB_API_URL || this.#fallback.apiBaseUrl
    this.sessionId = environment.GITHUB_RUN_ID
    this.triggeringActorId = environment.GITHUB_ACTOR_ID
    this.runHash = environment.GITHUB_RUN_ID
    this.runRefName = environment.GITHUB_REF_NAME
    this.runRefType = environment.GITHUB_REF_TYPE || this.#fallback.runRefType
    this.runCommit = environment.GITHUB_SHA || this.#fallback.runCommit
    this.runPreCommit = this.#fallback.runPreCommit // GitHub Actions doesn't have a pre-commit SHA
    this.runBranch = environment.GITHUB_REF_NAME || this.#fallback.runBranch
    const serverUrl = environment.GITHUB_SERVER_URL || 'https://github.com'
    const repository = environment.GITHUB_REPOSITORY || ''
    const runId = environment.GITHUB_RUN_ID || ''
    this.buildUrl = repository && runId ? `${serverUrl}/${repository}/actions/runs/${runId}` : undefined

    this.#logLoadedConfig()
  }

  readonly #fallback = {
    runRefType: 'BRANCH',

    get apiBaseUrl() {
      return environment.BUDDY_UT_TOKEN.startsWith('bud_ut_eu')
        ? 'https://api.eu.buddy.works'
        : 'https://api.buddy.works'
    },

    get runBranch() {
      // TODO: check if we're in git repo and git installed
      try {
        return execSync('git rev-parse --abbrev-ref HEAD', {
          encoding: 'utf8',
        }).trim()
      } catch {
        return
      }
    },

    get runCommit() {
      // TODO: check if we're in git repo and git installed
      try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
      } catch {
        return
      }
    },

    get runPreCommit() {
      // TODO: check if we're in git repo and git installed
      try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
      } catch {
        return
      }
    },
  }

  get headers(): IncomingHttpHeaders {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.utToken}`,
    }
  }

  get sessionPayload() {
    const payload = {
      ref_type: this.runRefType,
      ref_name: this.runRefName ?? this.runBranch,
      from_revision: this.runPreCommit,
      to_revision: this.runCommit,
      ...(this.triggeringActorId && { created_by: { id: this.triggeringActorId } }),
      ...(this.runHash && { build_id: this.runHash }),
      ...(this.buildUrl && { build_url: this.buildUrl }),
    }

    this.#logger.debug(`Generated session payload for ${payload.ref_name || 'unknown'} (${payload.ref_type})`)
    return payload
  }

  #logLoadedConfig(): void {
    const config = {
      environment: this.environment,
      utToken: this.utToken ? '***' : 'not set',
      debugEnabled: this.debugEnabled,
      apiBaseUrl: this.apiBaseUrl,
      sessionId: this.sessionId,
      triggeringActorId: this.triggeringActorId,
      runHash: this.runHash,
      runRefName: this.runRefName,
      runRefType: this.runRefType,
      runCommit: this.runCommit,
      runPreCommit: this.runPreCommit,
      runBranch: this.runBranch,
      buildUrl: this.buildUrl,
    }

    this.#logger.debug('Loaded configuration:', config)
  }
}
