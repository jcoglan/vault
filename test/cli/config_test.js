'use strict'

const fs = require('fs')
const path = require('path')
const { assert } = require('chai')
const sinon = require('sinon')

const CliHelper = require('./helper')
const editor = require('../../lib/cli/editor')

const EXPORT_PATH = path.resolve(__dirname, '..', '__vault-export.json')

describe('CLI configuration', () => {
  let sandbox, helper

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    helper = await CliHelper.create(sandbox, {})
  })

  afterEach(() => {
    sandbox.restore()

    try {
      fs.unlinkSync(EXPORT_PATH)
    } catch (error) {
    }
  })

  describe('global settings', () => {
    it('stores a global passphrase', async () => {
      helper.settings.password = 'saved phrase'
      await helper.call('--config', '--phrase')

      let doc = await helper.store.get('/global')
      assert.deepEqual(doc, { phrase: 'saved phrase' })
    })

    it('reports a read error', async () => {
      helper.settings.password = 'saved phrase'
      sandbox.stub(helper.adapter, 'read').rejects(new Error('failed to read'))

      let error = await helper.call('--config', '--phrase').catch(e => e)
      assert.match(error.message, /failed to read/)
    })

    it('reports a write error', async () => {
      helper.settings.password = 'saved phrase'
      sandbox.stub(helper.adapter, 'write').rejects(new Error('failed to save'))

      let error = await helper.call('--config', '--phrase').catch(e => e)
      assert.match(error.message, /failed to save/)
    })

    it('stores a global length', async () => {
      await helper.call('--config', '--length', '32')
      let doc = await helper.store.get('/global')
      assert.deepEqual(doc, { length: 32 })
    })

    it('stores a global length using shorthand', async () => {
      await helper.call('-cl', '32')
      let doc = await helper.store.get('/global')
      assert.deepEqual(doc, { length: 32 })
    })

    it('extends an existing global setting', async () => {
      await helper.store.update('/global', () => ({ phrase: 'hello' }))
      await helper.call('--config', '--length', '32')

      let doc = await helper.store.get('/global')
      assert.deepEqual(doc, { phrase: 'hello', length: 32 })
    })

    it('replaces an existing global setting', async () => {
      await helper.store.update('/global', () => ({ length: 20 }))
      await helper.call('--config', '--length', '32')

      let doc = await helper.store.get('/global')
      assert.deepEqual(doc, { length: 32 })
    })

    it('deletes the global settings', async () => {
      helper.settings.confirm = true

      await helper.store.update('/global', () => ({ phrase: 'hello' }))
      await helper.call('--delete-globals')

      let doc = await helper.store.get('/global')
      assert.isNull(doc)
    })

    it('does not delete the global settings without confirmation', async () => {
      helper.settings.confirm = false

      await helper.store.update('/global', () => ({ phrase: 'hello' }))
      await helper.call('--delete-globals').catch(e => e)

      let doc = await helper.store.get('/global')
      assert.deepEqual(doc, { phrase: 'hello' })
    })

    it('reports a deletion error', async () => {
      helper.settings.confirm = true
      sandbox.stub(helper.adapter, 'write').rejects(new Error('failed to delete'))

      let error = await helper.call('--delete-globals').catch(e => e)
      assert.match(error.message, /failed to delete/)
    })
  })

  describe('service settings', () => {
    it('stores config for a service', async () => {
      await helper.call('--config', 'foo', '--symbol', '0')
      let doc = await helper.store.get('/services/foo')
      assert.deepEqual(doc, { symbol: 0 })
    })

    it('reports a read error', async () => {
      sandbox.stub(helper.adapter, 'read').rejects(new Error('failed to read'))

      let error = await helper.call('--config', 'foo', '--symbol', '0').catch(e => e)
      assert.match(error.message, /failed to read/)
    })

    it('reports a write error', async () => {
      sandbox.stub(helper.adapter, 'write').rejects(new Error('failed to save'))

      let error = await helper.call('--config', 'foo', '--symbol', '0').catch(e => e)
      assert.match(error.message, /failed to save/)
    })

    it('stores config for a service using shorthand', async () => {
      await helper.call('-cl', '42', 'foo')
      let doc = await helper.store.get('/services/foo')
      assert.deepEqual(doc, { length: 42 })
    })

    it('extends an existing service setting', async () => {
      await helper.store.update('/services/foo', () => ({ symbol: 0 }))
      await helper.call('--config', 'foo', '--number', '4', '--upper', '2')

      let doc = await helper.store.get('/services/foo')
      assert.deepEqual(doc, { symbol: 0, upper: 2, number: 4 })
    })

    it('replaces an existing service setting', async () => {
      await helper.store.update('/services/foo', () => ({ symbol: 0 }))
      await helper.call('--config', 'foo', '--symbol', '3')

      let doc = await helper.store.get('/services/foo')
      assert.deepEqual(doc, { symbol: 3 })
    })

    it('stores notes for a new service', async () => {
      sandbox.stub(editor, 'editTempfile').resolves('the notes')

      await helper.call('--config', 'foo', '--notes')

      let doc = await helper.store.get('/services/foo')
      assert.deepEqual(doc, { notes: 'the notes' })
    })

    it('stores new notes for an existing service', async () => {
      sandbox.stub(editor, 'editTempfile').resolves('the notes')

      await helper.store.update('/services/foo', () => ({ length: 9 }))
      await helper.call('--config', 'foo', '--notes')

      let doc = await helper.store.get('/services/foo')
      assert.deepEqual(doc, { length: 9, notes: 'the notes' })
    })

    it('replaces existing notes for an existing service', async () => {
      sandbox.stub(editor, 'editTempfile').resolves('new notes')

      await helper.store.update('/services/foo', () => ({ notes: 'old notes' }))
      await helper.call('--config', 'foo', '--notes')

      let doc = await helper.store.get('/services/foo')
      assert.deepEqual(doc, { notes: 'new notes' })
    })

    it('deletes existing notes for an existing service', async () => {
      sandbox.stub(editor, 'editTempfile').resolves('')

      await helper.store.update('/services/foo', () => ({ notes: 'old notes' }))
      await helper.call('--config', 'foo', '--notes')

      let doc = await helper.store.get('/services/foo')
      assert.deepEqual(doc, {})
    })

    it("deletes a service's settings", async () => {
      helper.settings.confirm = true

      await helper.store.update('/services/foo', () => ({ phrase: 'hello' }))
      await helper.call('--delete', 'foo')

      let doc = await helper.store.get('/services/foo')
      assert.isNull(doc)
    })

    it("does not delete a service's settings without confirmation", async () => {
      helper.settings.confirm = false

      await helper.store.update('/services/foo', () => ({ phrase: 'hello' }))
      await helper.call('--delete', 'foo').catch(e => e)

      let doc = await helper.store.get('/services/foo')
      assert.deepEqual(doc, { phrase: 'hello' })
    })

    it("does not delete a non-existent service's settings", async () => {
      helper.settings.confirm = true

      let error = await helper.call('--delete', 'foo').catch(e => e)
      assert.match(error.message, /service "foo" is not configured/i)
    })

    it('reports a pre-deletion read error', async () => {
      helper.settings.confirm = true
      sandbox.stub(helper.adapter, 'read').rejects(new Error('failed to read'))

      let error = await helper.call('--delete', 'foo').catch(e => e)
      assert.match(error.message, /failed to read/)
    })

    it('reports a deletion error', async () => {
      await helper.store.update('/services/foo', () => ({ length: 24 }))

      helper.settings.confirm = true
      sandbox.stub(helper.adapter, 'write').rejects(new Error('failed to delete'))

      let error = await helper.call('--delete', 'foo').catch(e => e)
      assert.match(error.message, /failed to delete/)
    })
  })

  describe('clearing', () => {
    it('clears all the settings', async () => {
      helper.settings.confirm = true

      await helper.store.update('/global', () => ({ length: 21 }))
      await helper.store.update('/services/foo', () => ({ length: 42 }))

      await helper.call('--clear')

      let docs = await helper.store.list('/')
      assert.isNull(docs)
    })

    it('does not clear all the settings without confirmation', async () => {
      helper.settings.confirm = false

      await helper.store.update('/global', () => ({ length: 21 }))
      await helper.store.update('/services/foo', () => ({ length: 42 }))

      await helper.call('--clear').catch(e => e)

      let docs = await helper.store.list('/')
      assert.deepEqual(docs, ['global', 'services/'])
    })

    it('reports a deletion error', async () => {
      helper.settings.confirm = true
      sandbox.stub(helper.adapter, 'write').rejects(new Error('failed to delete'))

      let error = await helper.call('--clear').catch(e => e)
      assert.match(error.message, /failed to delete/)
    })
  })

  describe('exporting', () => {
    function exported () {
      return JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf8'))
    }

    describe('with no stored settings', () => {
      it('produces a skeleton export file', async () => {
        await helper.call('--export', EXPORT_PATH)
        assert.deepEqual(exported(), { services: {} })
      })
    })

    describe('with stored global settings', () => {
      beforeEach(async () => {
        await helper.store.update('/global', () => ({ length: 5, space: 0 }))
      })

      it('exports the global settings', async () => {
        await helper.call('--export', EXPORT_PATH)

        assert.deepEqual(exported(), {
          global: { length: 5, space: 0 },
          services: {}
        })
      })
    })

    describe('with stored service settings', () => {
      beforeEach(async () => {
        await helper.store.update('/services/foo', () => ({ repeat: 3 }))
        await helper.store.update('/services/bar/qux', () => ({ space: 0 }))
      })

      it('exports the global settings', async () => {
        await helper.call('--export', EXPORT_PATH)

        assert.deepEqual(exported(), {
          services: {
            'foo': {repeat: 3},
            'bar/qux': {space: 0}
          }
        })
      })
    })
  })

  describe('importing', () => {
    describe('with an unreadable config file', () => {
      it('reports an error', async () => {
        let error = await helper.call('--import', EXPORT_PATH).catch(e => e)
        assert.match(error.message, /no such file/)
      })
    })

    describe('with an invalid JSON file', () => {
      beforeEach(() => {
        fs.writeFileSync(EXPORT_PATH, '{')
      })

      it('reports an error', async () => {
        let error = await helper.call('--import', EXPORT_PATH).catch(e => e)
        assert.match(error.message, /does not contain valid JSON/)
      })
    })

    describe('with an empty config file', () => {
      beforeEach(() => {
        fs.writeFileSync(EXPORT_PATH, JSON.stringify({}))
      })

      it('makes no changes to the store', async () => {
        await helper.call('--import', EXPORT_PATH)
        let docs = await helper.store.list('/')
        assert.isNull(docs)
      })
    })

    describe('with a global setting', () => {
      beforeEach(() => {
        fs.writeFileSync(EXPORT_PATH, JSON.stringify({
          global: { length: 32 }
        }))
      })

      it('saves the global setting', async () => {
        await helper.call('--import', EXPORT_PATH)
        let doc = await helper.store.get('/global')
        assert.deepEqual(doc, { length: 32 })
      })
    })

    describe('with service settings', () => {
      beforeEach(() => {
        fs.writeFileSync(EXPORT_PATH, JSON.stringify({
          services: {
            foo: { space: 0, symbol: 0 },
            bar: { phrase: 'hello' }
          }
        }))
      })

      it('saves the service settings', async () => {
        await helper.call('--import', EXPORT_PATH)

        let foo = await helper.store.get('/services/foo')
        assert.deepEqual(foo, { space: 0, symbol: 0 })

        let bar = await helper.store.get('/services/bar')
        assert.deepEqual(bar, { phrase: 'hello' })
      })
    })

    describe('with existing service settings', () => {
      beforeEach(async () => {
        fs.writeFileSync(EXPORT_PATH, JSON.stringify({
          services: {
            foo: { space: 0, symbol: 0 }
          }
        }))
        await helper.store.update('/services/foo', () => ({ length: 4 }))
      })

      it('overwrites the existing settings', async () => {
        await helper.call('--import', EXPORT_PATH)
        let doc = await helper.store.get('/services/foo')
        assert.deepEqual(doc, { space: 0, symbol: 0 })
      })
    })
  })
})
