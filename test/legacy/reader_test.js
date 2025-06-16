'use strict'

const fs = require('fs')
const path = require('path')
const { assert } = require('chai')
const sinon = require('sinon')

const Reader = require('../../lib/legacy/reader')

const VERSION = process.version.match(/\d+/).map((n) => parseInt(n, 10))
const PASSWORD = 'open sesame'

const LOGGER = {
  info: sinon.spy(),
  error: sinon.spy()
}

describe('reading v0.2 files', () => {
  if (VERSION[0] > 20) return

  const KEYCHAIN = path.resolve(__dirname, 'v0.2-keychain')

  it('can read an encrypted file', async () => {
    let data = fs.readFileSync(KEYCHAIN, 'utf8')
    let config = await Reader.read({ logger: LOGGER, password: PASSWORD }, data)

    assert.deepEqual(config, {
      global: { phrase: 'version 0.2' },
      services: {
        google: { length: 24 },
        pin: { length: 4, number: 4 }
      }
    })
  })
})

describe('reading v0.3 files', () => {
  const KEYCHAIN = path.resolve(__dirname, 'v0.3-keychain')

  it('can read an encrypted file', async () => {
    let data = fs.readFileSync(KEYCHAIN, 'utf8')
    let config = await Reader.read({ logger: LOGGER, password: PASSWORD }, data)

    assert.deepEqual(config, {
      global: { phrase: 'version 0.3' },
      services: {
        google: { length: 24 },
        pin: { length: 6, number: 6 }
      }
    })
  })
})
