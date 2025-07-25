import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read actual version from package-lock.json
let version = 'unknown'
try {
  const lockFile = JSON.parse(readFileSync(join(__dirname, 'package-lock.json'), 'utf8'))
  version = lockFile.packages['node_modules/vitest']?.version || 'unknown'
} catch (e) {
  // Fallback to package.json if package-lock.json is not available
  try {
    const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'))
    version = packageJson.devDependencies.vitest
  } catch {
    version = 'unknown'
  }
}

const prefix = `[vitest ${version}]`

export const prefixedDescribe = (name, fn) => describe(`${prefix} ${name}`, fn)
