'use strict'

const sinon = require('sinon')
const CliHelper = require('./helper')

describe('CLI completion', () => {
  let sandbox, helper

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    helper = await CliHelper.create(sandbox, {})
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('completes option names', async () => {
    await helper.call('--cmplt', '--n')
    helper.assertStdout(['--notes', '--number'].join('\n'))
  })

  describe('service names', () => {
    beforeEach(async () => {
      await Promise.all([
        helper.store.update('/services/acme/username', () => ({})),
        helper.store.update('/services/acme/password', () => ({})),
        helper.store.update('/services/bar', () => ({})),
        helper.store.update('/services/bee', () => ({})),
        helper.store.update('/services/queue', () => ({})),
        helper.store.update('/services/zzz', () => ({})),
        helper.store.update('/services/zzz/hello/world', () => ({}))
      ])
    })

    it('completes a simple service name', async () => {
      await helper.call('--cmplt', 'b')
      helper.assertStdout(['bar', 'bee'].join('\n'))
    })

    it('completes the base of a namespaced service', async () => {
      await helper.call('--cmplt', 'ac')
      helper.assertStdout(['acme/'].join('\n'))
    })

    it('completes the children of a namespace', async () => {
      await helper.call('--cmplt', 'acme/')
      helper.assertStdout(['acme/password', 'acme/username'].join('\n'))
    })

    it('completes a namespaced service', async () => {
      await helper.call('--cmplt', 'acme/u')
      helper.assertStdout(['acme/username'].join('\n'))
    })

    it('completes a word that is both a service and namespace', async () => {
      await helper.call('--cmplt', 'z')
      helper.assertStdout(['zzz', 'zzz/'].join('\n'))
    })

    it('completes a word following a namespace', async () => {
      await helper.call('--cmplt', 'zzz/')
      helper.assertStdout(['zzz/hello/'].join('\n'))
    })

    it('completes a multiply-namespaced service', async () => {
      await helper.call('--cmplt', 'zzz/hello/w')
      helper.assertStdout(['zzz/hello/world'].join('\n'))
    })
  })
})
