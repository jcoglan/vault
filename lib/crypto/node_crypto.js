'use strict'

const crypto = require('crypto')
const { promisify } = require('util')

module.exports = {
  randomBytes: crypto.randomBytes,

  pbkdf2: {
    async digest (password, salt, iterations, size) {
      let pw = password.normalize('NFKD')
      let fn = promisify(crypto.pbkdf2)
      let bytes = Math.ceil(size / 8)
      return fn(pw, salt, iterations, bytes, 'sha1')
    }
  },

  legacy: {
    hmacSha256: {
      async sign (key, data) {
        let hmac = crypto.createHmac('sha256', key)
        hmac.update(data)
        return hmac.digest()
      },

      async verify (key, data, signature) {
        let expected = await this.sign(key, data)
        return crypto.timingSafeEqual(expected, signature)
      }
    },

    aes256cbc: {
      async decrypt (key, iv, data) {
        let cipher = (iv === null)
                   ? crypto.createDecipher('aes256', key)
                   : crypto.createDecipheriv('aes-256-cbc', key, iv)

        return Buffer.concat([
          cipher.update(data),
          cipher.final()
        ])
      }
    }
  }
}
