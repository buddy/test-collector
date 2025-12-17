import { CI, CiInfo, getCiAndGitInfo } from '@buddy-works/ci-info'
import { IncomingHttpHeaders } from 'node:http'
import { CI_PROVIDER, IBuddyUTSession, IBuddyUTSessionsPayload, SESSION_REF_TYPE } from '@/core/types'
import environment, { environmentConfig } from '@/utils/environment'
import logger from '@/utils/logger'

export class BuddyUnitTestCollectorConfig {
  static displayName = 'BuddyUnitTestCollectorConfig'

  utToken: string
  apiBaseUrl: string
  sessionId?: IBuddyUTSession['id']
  ciInfo: CiInfo

  static async create(): Promise<BuddyUnitTestCollectorConfig> {
    try {
      const ciInfo = await getCiAndGitInfo({
        optionalGit: true,
        skipCommitDetails: true,
        skipBaseCommitDiscovery: true,
        logger: logger.warn.bind(logger),
      })
      return new BuddyUnitTestCollectorConfig(ciInfo)
    } catch (error) {
      logger.error('Failed to read environment information', error)
      throw error
    }
  }

  constructor(ciInfo: CiInfo) {
    this.utToken = environment.BUDDY_UT_TOKEN
    this.sessionId = environment.BUDDY_SESSION_ID
    this.apiBaseUrl = this.#normalizeApiUrl(environment.BUDDY_API_URL || this.#fallback.apiBaseUrl)
    this.ciInfo = ciInfo

    this.#logEnvironmentVariables()
    this.#logLoadedConfig()
  }

  #logEnvironmentVariables() {
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

  #normalizeApiUrl(url: string) {
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
      if (parts.length === 5 && parts[3]) {
        return Buffer.from(parts[3], 'base64url').toString('utf8')
      }

      if (token.startsWith('bud_ut_eu')) {
        return 'https://api.buddy.works/'
      }

      if (token.startsWith('bud_ut_asia')) {
        return 'https://api.asia.buddy.works/'
      }

      return 'https://api.buddy.works/'
    },
  }

  get headers(): IncomingHttpHeaders {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.utToken}`,
    }
  }

  get sessionPayload(): IBuddyUTSessionsPayload {
    const ciProvider = CI_PROVIDER[this.ciInfo.ci]

    const basePayload: Partial<IBuddyUTSessionsPayload> = {
      ref_type: this.ciInfo.refType as unknown as SESSION_REF_TYPE,
      ref_name: this.ciInfo.refName ?? this.ciInfo.branch,
      revision: this.ciInfo.commit,
      ci_provider: ciProvider,
    }

    if (this.ciInfo.ci === CI.BUDDY) {
      const payload = {
        ...basePayload,
        ...(this.ciInfo.executionId && { execution_id: this.ciInfo.executionId }),
        ...(this.ciInfo.actionExecutionId && { action_execution_id: this.ciInfo.actionExecutionId }),
        ...(this.ciInfo.invokerId && { created_by: { id: this.ciInfo.invokerId } }),
      }
      logger.debug(`Generated session payload for ${payload.ref_name || 'unknown'} (${payload.ref_type || 'unknown'})`)
      return payload
    } else if (
      (this.ciInfo.ci === CI.GITHUB_ACTION || this.ciInfo.ci === CI.CIRCLE_CI) &&
      'executionUrl' in this.ciInfo &&
      this.ciInfo.executionUrl
    ) {
      const payload = {
        ...basePayload,
        ...(this.ciInfo.executionUrl && { ci_run_url: this.ciInfo.executionUrl }),
      }
      logger.debug(`Generated session payload for ${payload.ref_name || 'unknown'} (${payload.ref_type || 'unknown'})`)
      return payload
    } else {
      logger.debug(
        `Generated session payload for ${basePayload.ref_name || 'unknown'} (${basePayload.ref_type || 'unknown'})`,
      )
      return basePayload
    }
  }

  #logLoadedConfig(): void {
    const config = {
      ciInfo: this.ciInfo,
      utToken: this.utToken ? '***' : 'not set',
      apiBaseUrl: this.apiBaseUrl,
      sessionId: this.sessionId,
    }

    logger.debug('Loaded configuration:', config)
  }
}
