const base64urlDecode = (input: string): string | undefined => {
  try {
    let normalized = input.replace(/-/g, '+').replace(/_/g, '/')

    const pad = normalized.length % 4
    if (pad) {
      normalized = normalized + '='.repeat(4 - pad)
    }

    return Buffer.from(normalized, 'base64').toString('utf8')
  } catch {
    return undefined
  }
}

export { base64urlDecode }
