'use strict'

const crypto = require('../crypto')
const Vault = require('../vault')

function convert (buf, { from = 'utf8', into = 'utf8' }) {
  return Buffer.from(buf.toString(into), from)
}

class Reader {
  static async read (config, data) {
    for (let klass of [V03Reader, V02Reader]) {
      let reader = new klass(config)
      try {
        return await reader.read(data)
      } catch (error) {
        config.logger.error(error)
      }
    }
    return null
  }

  constructor ({ logger, password }) {
    this._logger = logger
    this._password = password
  }

  async pbkdf2 (iterations, size) {
    let pw = this._password
    let digest = await crypto.pbkdf2.digest(pw, Vault.UUID, iterations, size / 2)
    return convert(digest, { into: 'hex' })
  }

  async read (data) {
    this._logger.info('trying ' + this.VERSION + ' file format')
    this._logger.info('parsing file contents')

    let buf = Buffer.from(data, 'base64')
    let a = this.IV_SIZE
    let b = buf.length - this.MAC_SIZE

    if (a >= b) {
      throw new Error('file content is too short to decrypt')
    }

    let payload = buf.subarray(0, b)
    let mac = buf.subarray(b, buf.length)

    this._logger.info('checking HMAC signature')

    let verified = await this.verify(payload, mac)
    if (!verified) {
      throw new Error('could not verify file contents')
    }

    this._logger.info('decrypting file contents')

    let iv = payload.subarray(0, a)
    let ciphertext = payload.subarray(a, payload.length)
    let plaintext = await this.decrypt(iv, ciphertext)

    this._logger.info('parsing decrypted JSON')
    let json = JSON.parse(plaintext)

    return json
  }
}

class V02Reader extends Reader {
  VERSION = 'v0.2'
  IV_SIZE = 16
  MAC_SIZE = 64

  async verify (payload, mac) {
    let key = await this.pbkdf2(16, 128)

    payload = convert(payload, { into: 'base64' })
    mac = convert(mac, { from: 'hex' })

    return crypto.legacy.hmacSha256.verify(key, payload, mac)
  }

  async decrypt (iv, ciphertext) {
    let key = await this.pbkdf2(16, 64)
    key = convert(Buffer.concat([iv, key]), { into: 'base64' })

    ciphertext = convert(ciphertext, { from: 'base64' })

    return crypto.legacy.aes256cbc.decrypt(key, null, ciphertext)
  }
}

class V03Reader extends Reader {
  VERSION = 'v0.3'
  IV_SIZE = 16
  MAC_SIZE = 32

  async verify (payload, mac) {
    let key = await this.pbkdf2(200, 256)
    payload = convert(payload, { into: 'hex' })
    return crypto.legacy.hmacSha256.verify(key, payload, mac)
  }

  async decrypt (iv, ciphertext) {
    let key = await this.pbkdf2(100, 256)
    return crypto.legacy.aes256cbc.decrypt(key, iv, ciphertext)
  }
}

module.exports = Reader
