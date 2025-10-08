import { execSync } from 'node:child_process'
import { IncomingHttpHeaders } from 'node:http'
import environment, { CI_PROVIDER, detectCIProvider, environmentConfig } from '@/utils/environment'
import logger from '@/utils/logger'

export default class BuddyUnitTestCollectorConfig {
  static displayName = 'BuddyUnitTestCollectorConfig'
  static libraryName = '@buddy-works/unit-tests'

  context: string
  ciProvider: CI_PROVIDER

  utToken: string
  debugEnabled: boolean
  apiBaseUrl: string
  runRefType?: string
  sessionId?: string
  triggeringActorId?: string

  runId?: string
  runRefName?: string
  runCommit?: string
  runPreCommit?: string
  runBranch?: string
  runUrl?: string

  constructor(context: string) {
    this.context = context
    this.ciProvider = detectCIProvider()

    this.#logEnvironmentVariables()

    this.utToken = environment.BUDDY_UT_TOKEN
    this.debugEnabled = environment.BUDDY_LOGGER_DEBUG
    this.apiBaseUrl = this.#normalizeApiUrl(environment.BUDDY_API_URL || this.#fallback.apiBaseUrl)
    this.sessionId = environment.BUDDY_SESSION_ID

    switch (this.ciProvider) {
      case CI_PROVIDER.BUDDY: {
        logger.debug('Loading Buddy CI configuration')

        this.runRefName = environment.BUDDY_RUN_REF_NAME
        this.runRefType = environment.BUDDY_RUN_REF_TYPE
        this.runCommit = environment.BUDDY_RUN_COMMIT || this.#fallback.runCommit
        this.runPreCommit = environment.BUDDY_RUN_PRE_COMMIT || this.#fallback.runPreCommit
        this.runBranch = environment.BUDDY_RUN_BRANCH || this.#fallback.runBranch
        this.runId = environment.BUDDY_RUN_HASH
        this.runUrl = environment.BUDDY_RUN_URL
        this.triggeringActorId = environment.BUDDY_TRIGGERING_ACTOR_ID
        break
      }
      case CI_PROVIDER.GITHUB_ACTION: {
        logger.debug('Loading GitHub Actions configuration')

        const serverUrl = environment.GITHUB_SERVER_URL || 'https://github.com'
        const repository = environment.GITHUB_REPOSITORY

        this.runRefName = environment.GITHUB_REF_NAME
        this.runRefType = environment.GITHUB_REF_TYPE?.toUpperCase()
        this.runCommit = environment.GITHUB_SHA || this.#fallback.runCommit
        this.runPreCommit = this.#fallback.runPreCommit
        this.runBranch = environment.GITHUB_REF_NAME || this.#fallback.runBranch
        this.runId = environment.GITHUB_RUN_ID
        this.runUrl = repository && this.runId ? `${serverUrl}/${repository}/actions/runs/${this.runId}` : undefined

        break
      }
      default: {
        logger.warn(`No supported CI environment detected: ${this.ciProvider}.`)
        this.ciProvider = CI_PROVIDER.NONE
        logger.debug(`Environment set to ${this.ciProvider} for compatibility.`)
      }
    }

    this.#logLoadedConfig()

    logger.debug(`Config loaded in ${BuddyUnitTestCollectorConfig.libraryName} (environment: ${this.ciProvider})`)
  }

  #logEnvironmentVariables(): void {
    const foundVariables = Object.entries(environmentConfig).flatMap(([key, config]) => {
      const value = environment[key as keyof typeof environment]
      if (value === undefined) {
        return []
      }

      const isSecret = 'secret' in config ? config.secret : false
      const displayValue = isSecret ? '***' : String(value)
      return [`${key}=${displayValue}`]
    })

    if (foundVariables.length > 0) {
      const variablesList = foundVariables.map((variable) => `  ${variable}`).join('\n')
      logger.debug(`Detected environment variables:\n${variablesList}`)
    } else {
      logger.debug('No environment variables detected from configuration schema')
    }
  }

  #normalizeApiUrl(url: string): string {
    try {
      const normalized = new URL(url)
      return normalized.href.endsWith('/') ? normalized.href : `${normalized.href}/`
    } catch {
      return url.endsWith('/') ? url : `${url}/`
    }
  }

  readonly #fallback = {
    get apiBaseUrl() {
      const token = environment.BUDDY_UT_TOKEN
      const parts = token.split('_')

      // for non-prod tokens, the api url is base64url encoded in the 3rd part
      if (parts.length === 5) {
        return Buffer.from(parts[3], 'base64url').toString('utf8')
      }

      return token.startsWith('bud_ut_eu') ? 'https://api.eu.buddy.works/' : 'https://api.buddy.works/'
    },

    get runBranch() {
      try {
        return execSync('git rev-parse --abbrev-ref HEAD', {
          encoding: 'utf8',
        }).trim()
      } catch {
        return
      }
    },

    get runCommit() {
      try {
        return execSync('git rev-parse HEAD', {
          encoding: 'utf8',
        }).trim()
      } catch {
        return
      }
    },

    get runPreCommit() {
      try {
        return execSync('git rev-parse HEAD', {
          encoding: 'utf8',
        }).trim()
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
      ci_provider: this.ciProvider,
      ...(this.triggeringActorId && { created_by: { id: this.triggeringActorId } }),
      ...(this.runId && { run_id: this.runId }),
      ...(this.runUrl && { run_url: this.runUrl }),
    }

    logger.debug(`Generated session payload for ${payload.ref_name || 'unknown'} (${payload.ref_type || 'unknown'})`)
    return payload
  }

  #logLoadedConfig(): void {
    const config = {
      ciProvider: this.ciProvider,
      utToken: this.utToken ? '***' : 'not set',
      debugEnabled: this.debugEnabled,
      apiBaseUrl: this.apiBaseUrl,
      sessionId: this.sessionId,
      triggeringActorId: this.triggeringActorId,
      runRefName: this.runRefName,
      runRefType: this.runRefType,
      runCommit: this.runCommit,
      runPreCommit: this.runPreCommit,
      runBranch: this.runBranch,
      runId: this.runId,
      runUrl: this.runUrl,
    }

    logger.debug('Loaded configuration:', config)
  }
}
