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
  }
}
