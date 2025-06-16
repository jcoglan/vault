'use strict'

const { MemoryAdapter } = require('@escodb/core')
const sinon = require('sinon')

const CLI = require('../../lib/cli')
const escodb = require('../../lib/escodb')

const ESCODB_PATH = 'escodb path'
const ESCODB_KEY = 'escodb key'

class CliHelper {
  static async create (sandbox, settings) {
    let adapter = new MemoryAdapter()
    let store = await escodb.createStore({ adapter, password: ESCODB_KEY })
    return new CliHelper(adapter, store, sandbox, settings)
  }

  constructor (adapter, store, sandbox, settings) {
    this.adapter = adapter
    this.store = store
    this.settings = settings

    sandbox.stub(escodb, 'createFileAdapter').withArgs(ESCODB_PATH).returns(adapter)

    this.stdout = { write: sinon.spy() }
    this.stderr = { write: sinon.spy() }

    this.cli = new CLI({
      config: { path: ESCODB_PATH, key: ESCODB_KEY },

      stdout: this.stdout,
      stderr: this.stderr,
      tty: false,

      confirm () {
        return settings.confirm ? Promise.resolve() : Promise.reject()
      },

      async password () {
        return settings.password
      },

      async selectKey () {
        return settings.selectKey
      },

      async sign () {
        return settings.signature
      }
    })
  }

  call (...args) {
    return this.cli.run(['', '', ...args])
  }

  assertStdout (content) {
    sinon.assert.calledWith(this.stdout.write, content)
  }

  assertStderr (content) {
    sinon.assert.calledWith(this.stderr.write, content)
  }
}

module.exports = CliHelper
