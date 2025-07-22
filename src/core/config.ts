import { execSync } from 'node:child_process'
import { IncomingHttpHeaders } from 'node:http'
import env from '@/utils/environment'
import { Logger } from '@/utils/logger'

export default class BuddyUnitTestCollectorConfig {
  static displayName = 'BuddyUnitTestCollectorConfig'
  static libraryName = '@buddy-works/test-collector'

  #logger: Logger
  context: string

  utToken: string
  debugEnabled: boolean
  apiBaseUrl: string

  sessionId?: string
  runHash?: string
  runRefName?: string
  runRefType: string
  runCommit?: string
  runPreCommit?: string
  runBranch?: string
  buildUrl?: string

  constructor(context: string) {
    this.context = context

    const loggerNameWithContext = `${BuddyUnitTestCollectorConfig.displayName}_${context}`
    this.#logger = new Logger(loggerNameWithContext)

    this.utToken = env.BUDDY_UT_TOKEN
    this.debugEnabled = env.BUDDY_LOGGER_DEBUG
    this.apiBaseUrl = env.BUDDY_API_URL ?? this.#fallback.apiBaseUrl
    this.sessionId = env.BUDDY_SESSION_ID
    this.runHash = env.BUDDY_RUN_HASH
    this.runRefName = env.BUDDY_RUN_REF_NAME
    this.runRefType = env.BUDDY_RUN_REF_TYPE ?? this.#fallback.runRefType
    this.runCommit = env.BUDDY_RUN_COMMIT ?? this.#fallback.runCommit
    this.runPreCommit = env.BUDDY_RUN_PRE_COMMIT ?? this.#fallback.runPreCommit
    this.runBranch = env.BUDDY_RUN_BRANCH ?? this.#fallback.runBranch
    this.buildUrl = env.BUDDY_RUN_URL

    this.#logger.debug(`Config loaded in ${BuddyUnitTestCollectorConfig.libraryName}`)
  }

  readonly #fallback = {
    runRefType: 'BRANCH',

    get apiBaseUrl() {
      return env.BUDDY_UT_TOKEN.startsWith('bud_ut_eu') ? 'https://api.eu.buddy.works' : 'https://api.buddy.works'
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
      'content-type': 'application/json',
      authorization: `Bearer ${this.utToken}`,
    }
  }

  get sessionPayload() {
    const payload = {
      ref_type: this.runRefType,
      ref_name: this.runRefName ?? this.runBranch,
      from_revision: this.runPreCommit,
      to_revision: this.runCommit,
      ...(this.runHash && { build_id: this.runHash }),
      ...(this.buildUrl && { build_url: this.buildUrl }),
    }

    this.#logger.debug('Generated session payload:', payload)
    return payload
  }
}
