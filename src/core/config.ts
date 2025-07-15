import { execSync } from 'child_process'
import { IncomingHttpHeaders } from 'http'
import env from '@/utils/env'
import { Logger } from '@/utils/logger'

interface BuddyTestCollectorConfig {
  utToken: string
  apiBaseUrl: string
  debugEnabled: boolean
  runRefType: string
  runCommit?: string
  runBranch?: string
  sessionId?: string
  runRefName?: string
  runHash?: string
  runPreCommit?: string
  buildUrl?: string
}

export class Config {
  static libraryName = '@buddy-works/test-collector'
  context: string
  config: BuddyTestCollectorConfig
  logger: Logger

  constructor(context: string) {
    this.context = context
    this.logger = new Logger(`${Config.libraryName}_${context}`)

    this.config = {
      utToken: env.BUDDY_UT_TOKEN,
      debugEnabled: env.BUDDY_LOGGER_DEBUG,
      apiBaseUrl: env.BUDDY_API_URL ?? this.#fallbackApiBaseUrl,
      sessionId: env.BUDDY_SESSION_ID,
      runHash: env.BUDDY_RUN_HASH,
      runRefName: env.BUDDY_RUN_REF_NAME,
      runRefType: env.BUDDY_RUN_REF_TYPE ?? this.#fallbackRunRefType,
      runCommit: env.BUDDY_RUN_COMMIT ?? this.#fallbackRunCommit,
      runPreCommit: env.BUDDY_RUN_PRE_COMMIT ?? this.#fallbackRunPreCommit,
      runBranch: env.BUDDY_RUN_BRANCH ?? this.#fallbackRunBranch,
      buildUrl: env.BUDDY_RUN_URL,
    }

    this.logger.debug(`Config loaded in ${Config.libraryName}:`, this.config)
  }

  // TODO: remove if unused
  get headers(): IncomingHttpHeaders {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${this.config.utToken}`,
    }
  }

  readonly #fallbackRunRefType = 'BRANCH'

  get #fallbackApiBaseUrl() {
    return env.BUDDY_UT_TOKEN.startsWith('bud_ut_eu')
      ? 'https://api.eu.buddy.works'
      : 'https://api.buddy.works'
  }

  get #fallbackRunBranch() {
    // TODO: check if we're in git repo and git installed
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
      }).trim()
    } catch {
      return undefined
    }
  }

  get #fallbackRunCommit() {
    // TODO: check if we're in git repo and git installed
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    } catch {
      return undefined
    }
  }

  get #fallbackRunPreCommit() {
    // TODO: check if we're in git repo and git installed
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    } catch {
      return undefined
    }
  }
}
