import { CI, getCiAndGitInfo } from '@buddy-works/ci-info'
import { IncomingHttpHeaders } from 'node:http'
import { CI_PROVIDER, IBuddyUTSession, IBuddyUTSessionsPayload, SESSION_REF_TYPE } from '@/core/types'
import environment, { environmentConfig } from '@/utils/environment'
import logger from '@/utils/logger'

export class BuddyUnitTestCollectorConfig {
  static displayName = 'BuddyUnitTestCollectorConfig'
  static libraryName = '@buddy-works/unit-tests'

  utToken: string
  apiBaseUrl: string
  runRefType?: IBuddyUTSessionsPayload['ref_type']
  sessionId?: IBuddyUTSession['id']
  invokerId?: NonNullable<IBuddyUTSessionsPayload['created_by']>['id']

  ciProvider: IBuddyUTSessionsPayload['ci_provider']
  executionId?: IBuddyUTSessionsPayload['execution_id']
  actionExecutionId?: IBuddyUTSessionsPayload['action_execution_id']
  runRefName?: IBuddyUTSessionsPayload['ref_name']
  runCommit?: IBuddyUTSessionsPayload['revision']
  runId?: IBuddyUTSessionsPayload['run_id']
  runUrl?: IBuddyUTSessionsPayload['ci_run_url']
  runBranch?: string

  /**
   * Creates a new BuddyUnitTestCollectorConfig instance with async CI detection
   * Uses @buddy-works/ci-info package to detect CI environment
   * Falls back to manual detection if ci-info fails
   */
  static async create(): Promise<BuddyUnitTestCollectorConfig> {
    try {
      const ciInfo = await getCiAndGitInfo()
      const ciProvider = CI_PROVIDER[ciInfo.ci]
      const config = new BuddyUnitTestCollectorConfig()

      config.ciProvider = ciProvider

      config.runCommit = ciInfo.commit
      if (ciInfo.branch !== undefined) {
        config.runBranch = ciInfo.branch
      }

      // Set ref name and type based on tag or branch
      if (ciInfo.tag) {
        config.runRefName = ciInfo.tag
        config.runRefType = SESSION_REF_TYPE.TAG
      } else if (ciInfo.branch) {
        config.runRefName = ciInfo.branch
        config.runRefType = SESSION_REF_TYPE.BRANCH
      }

      // Map provider-specific properties for Buddy CI
      if (ciInfo.ci === CI.BUDDY) {
        config.executionId = ciInfo.executionId
        config.actionExecutionId = ciInfo.actionExecutionId
        config.invokerId = ciInfo.invokerId
      }

      // Map provider-specific properties for GitHub Actions and CircleCI
      if (
        (ciInfo.ci === CI.GITHUB_ACTION || ciInfo.ci === CI.CIRCLE_CI) &&
        'executionUrl' in ciInfo &&
        ciInfo.executionUrl
      ) {
        config.runUrl = ciInfo.executionUrl
      }

      logger.debug('Config created successfully with ci-info integration')
      return config
    } catch (error) {
      // If ci-info fails, fall back to manual detection
      logger.warn('Failed to get CI info from @buddy-works/ci-info, falling back to manual detection', error)
      return new BuddyUnitTestCollectorConfig()
    }
  }

  constructor() {
    // Only initialize project-specific configuration
    // CI detection is handled by the async create() factory method using ci-info
    this.#logEnvironmentVariables()

    this.utToken = environment.BUDDY_UT_TOKEN
    this.sessionId = environment.BUDDY_SESSION_ID
    this.apiBaseUrl = this.#normalizeApiUrl(environment.BUDDY_API_URL || this.#fallback.apiBaseUrl)

    // Set CI provider to NONE by default - will be overridden by create() method
    this.ciProvider = CI_PROVIDER.NONE

    this.#logLoadedConfig()

    logger.debug(`Config loaded in ${BuddyUnitTestCollectorConfig.libraryName}`)
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
      return token.startsWith('bud_ut_eu') ? 'https://api.eu.buddy.works/' : 'https://api.buddy.works/'
    },
  }

  get headers(): IncomingHttpHeaders {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.utToken}`,
    }
  }

  get sessionPayload(): IBuddyUTSessionsPayload {
    const basePayload: Partial<IBuddyUTSessionsPayload> = {
      ref_type: this.runRefType,
      ref_name: this.runRefName ?? this.runBranch,
      revision: this.runCommit,
      ci_provider: this.ciProvider,
      ...(this.invokerId && { created_by: { id: this.invokerId } }),
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
        ...(this.runId && { run_id: this.runId }),
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
      apiBaseUrl: this.apiBaseUrl,
      sessionId: this.sessionId,
      invokerId: this.invokerId,
      runRefName: this.runRefName,
      runRefType: this.runRefType,
      runCommit: this.runCommit,
      runBranch: this.runBranch,
      executionId: this.executionId,
      actionExecutionId: this.actionExecutionId,
      runUrl: this.runUrl,
    }

    logger.debug('Loaded configuration:', config)
  }
}
