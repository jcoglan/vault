'use strict'

const crypto = require('./crypto')
const Sequin = require('sequin')

const UUID = 'e87eb0f4-34cb-46b9-93ad-766c5ab063e7'
const DEFAULT_LENGTH = 20
const DEFAULT_REPEAT = 0
const CHARS = {}

CHARS.LOWER     = 'abcdefghijklmnopqrstuvwxyz'.split('')
CHARS.UPPER     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
CHARS.ALPHA     = CHARS.LOWER.concat(CHARS.UPPER)
CHARS.NUMBER    = '0123456789'.split('')
CHARS.ALPHANUM  = CHARS.ALPHA.concat(CHARS.NUMBER)
CHARS.SPACE     = [' ']
CHARS.DASH      = ['-', '_']
CHARS.SYMBOL    = '!"#$%&\'()*+,./:;<=>?@[\\]^{|}~'.split('').concat(CHARS.DASH)
CHARS.ALL       = CHARS.ALPHANUM.concat(CHARS.SPACE).concat(CHARS.SYMBOL)

const TYPES = 'LOWER UPPER NUMBER SPACE DASH SYMBOL'.split(' ')

function createHash (key, message, entropy) {
  return crypto.pbkdf2.digest(key, message, 8, entropy || 256)
}

function log2 (n) {
  return Math.ceil(Math.log(n) / Math.log(2))
}

class Vault {
  static UUID = UUID

  constructor (settings) {
    this._phrase   = settings.phrase || ''
    this._length   = settings.length || DEFAULT_LENGTH
    this._repeat   = settings.repeat || DEFAULT_REPEAT
    this._allowed  = CHARS.ALL.slice()
    this._required = []

    for (let type of TYPES) {
      let value = settings[type.toLowerCase()]
      if (value === 0) {
        this.subtract(CHARS[type])
      } else if (typeof value === 'number') {
        this.require(CHARS[type], value)
      }
    }

    let n = this._length - this._required.length
    while (n >= 0 && n--) this._required.push(this._allowed)
  }

  subtract (charset, allowed) {
    allowed = allowed || this._allowed

    for (let chr of charset) {
      let index = allowed.indexOf(chr)
      if (index >= 0) allowed.splice(index, 1)
    }
    return allowed
  }

  require (charset, n) {
    while (n--) this._required.push(charset)
  }

  async generate (service) {
    if (this._required.length > this._length) {
      throw new Error('Length too small to fit all required characters')
    }
    if (this._allowed.length === 0) {
      throw new Error('No characters available to create a password')
    }

    let hash = await createHash(this._phrase, service + UUID, 2 * this.entropy())
    let stream = new Sequin(hash, 8)
    let required = this._required.slice()
    let result = ''

    while (result.length < this._length) {
      let index = stream.generate(required.length)
      let charset = required.splice(index, 1)[0]
      
      charset = this.filterRepeated(result, charset)
      index = stream.generate(charset.length)
      result += charset[index]
    }

    return result
  }

  entropy () {
    let entropy = 0

    for (let [i, required] of this._required.entries()) {
      entropy += log2(i + 1)
      entropy += log2(required.length)
    }
    return entropy
  }

  filterRepeated (result, charset) {
    let last = result.charAt(result.length - 1)
    let i = this._repeat - 1
    let same = last && (i >= 0)

    while (same && i--) {
      let chr = result.charAt(result.length + i - this._repeat)
      same = same && chr === last
    }

    if (same) {
      return this.subtract([last], charset.slice())
    } else {
      return charset
    }
  }
}

module.exports = Vault
