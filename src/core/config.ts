import { execSync } from 'node:child_process'
import { IncomingHttpHeaders } from 'node:http'
import { IBuddySessionRequestPayload } from '@/core/types'
import environment, { CI_PROVIDER, detectCIProvider, environmentConfig } from '@/utils/environment'
import logger from '@/utils/logger'

export default class BuddyUnitTestCollectorConfig {
  static displayName = 'BuddyUnitTestCollectorConfig'
  static libraryName = '@buddy-works/unit-tests'

  ciProvider: CI_PROVIDER

  utToken: string
  debugEnabled: boolean
  apiBaseUrl: string
  runRefType?: string
  sessionId?: string
  triggeringActorId?: string

  executionId?: string
  actionExecutionId?: string
  runRefName?: string
  runCommit?: string
  runPreCommit?: string
  runBranch?: string
  runUrl?: string

  constructor() {
    this.ciProvider = detectCIProvider()

    this.#logEnvironmentVariables()

    this.utToken = environment.BUDDY_UT_TOKEN
    this.debugEnabled = environment.BUDDY_LOGGER_LEVEL === 'debug'
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
        this.executionId = environment.BUDDY_RUN_HASH
        this.actionExecutionId = environment.BUDDY_ACTION_RUN_HASH
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
        this.runUrl =
          repository && environment.GITHUB_RUN_ID
            ? `${serverUrl}/${repository}/actions/runs/${environment.GITHUB_RUN_ID}`
            : undefined

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
        return execSync('git rev-parse HEAD^1', {
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

  get sessionPayload(): IBuddySessionRequestPayload {
    const basePayload = {
      ref_type: this.runRefType,
      ref_name: this.runRefName ?? this.runBranch,
      from_revision: this.runPreCommit,
      to_revision: this.runCommit,
      ci_provider: this.ciProvider,
      ...(this.triggeringActorId && { created_by: { id: this.triggeringActorId } }),
    }

    if (this.ciProvider === CI_PROVIDER.BUDDY) {
      const payload = {
        ...basePayload,
        ...(this.executionId && { execution_id: this.executionId }),
        ...(this.actionExecutionId && { action_execution_id: this.actionExecutionId }),
      }
      logger.debug(`Generated session payload for ${payload.ref_name || 'unknown'} (${payload.ref_type || 'unknown'})`)
      return payload
    } else {
      const payload = {
        ...basePayload,
        ...(this.runUrl && { ci_run_url: this.runUrl }),
      }
      logger.debug(`Generated session payload for ${payload.ref_name || 'unknown'} (${payload.ref_type || 'unknown'})`)
      return payload
    }
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
      executionId: this.executionId,
      actionExecutionId: this.actionExecutionId,
      runUrl: this.runUrl,
    }

    logger.debug('Loaded configuration:', config)
  }
}
