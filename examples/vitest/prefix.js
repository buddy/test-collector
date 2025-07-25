import { describe } from 'vitest'
import packageJson from './package.json' with { type: 'json' }

const prefix = `[vitest ${packageJson.devDependencies.vitest}]`

export const prefixedDescribe = (name, fn) => describe(`${prefix} ${name}`, fn)
