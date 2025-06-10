'use strict'

const { subtle } = crypto

function randomBytes (n) {
  let buf = Buffer.alloc(n)
  crypto.getRandomValues(buf)
  return buf
}

module.exports = {
  randomBytes,

  pbkdf2: {
    async digest (password, salt, iterations, size) {
      let pw = Buffer.from(password.normalize('NFKD'), 'utf8')
      pw = await subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveKey'])

      salt = Buffer.from(salt, 'utf8')
      size = 8 * Math.ceil(size / 8)

      let params = { name: 'PBKDF2', hash: 'SHA-1', salt, iterations }
      let algo = { name: 'HMAC', hash: 'SHA-256', length: size }
      let key = await subtle.deriveKey(params, pw, algo, true, ['sign'])

      key = await subtle.exportKey('raw', key)
      return Buffer.from(key)
    }
  }
}
