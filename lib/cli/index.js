'use strict'

const fs = require('fs')
const path = require('path')
const { parseArgs } = require('util')

const editor = require('./editor')
const escodb = require('../escodb')
const Store = require('../store')
const util = require('../util')
const Vault = require('../vault')

const OPTIONS = {
  'phrase':         { type: Boolean,  short: 'p' },
  'key':            { type: Boolean,  short: 'k' },
  'length':         { type: Number,   short: 'l' },
  'repeat':         { type: Number,   short: 'r' },

  'lower':          { type: Number },
  'upper':          { type: Number },
  'number':         { type: Number },
  'space':          { type: Number },
  'dash':           { type: Number },
  'symbol':         { type: Number },
  'notes':          { type: Boolean,  short: 'n' },

  'config':         { type: Boolean,  short: 'c' },
  'delete':         { type: String,   short: 'x' },
  'delete-globals': { type: Boolean,  short: 'G' },
  'clear':          { type: Boolean,  short: 'X' },

  'export':         { type: String,   short: 'e' },
  'import':         { type: String,   short: 'i' },

  'initpath':       { type: Boolean },
  'cmplt':          { type: String },
  'help':           { type: Boolean,  short: 'h' }
}

function parseArgv (args) {
  let options = Object.fromEntries(
    Object.entries(OPTIONS).map(([key, { type, short }]) => {
      let opt = short ? { short } : {}
      opt.type = (type === Boolean) ? 'boolean' : 'string'
      return [key, opt]
    })
  )

  let { values, positionals } = parseArgs({
    args,
    options,
    strict: true,
    allowPositionals: true
  })

  for (let key in values) {
    if (OPTIONS[key].type === Number) {
      values[key] = parseInt(values[key], 10)
    }
  }

  return { ...values, service: positionals[0] }
}

class CLI {
  constructor (options) {
    let pathname = options.config.path
    let key = options.config.key

    let adapter = escodb.createFileAdapter(pathname)
    this._storeParams = { adapter, password: key }

    this._out = options.stdout
    this._err = options.stderr
    this._tty = options.tty

    this._requestPassword = options.password
    this._confirmAction = options.confirm
    this._selectKey = options.selectKey
    this._signData = options.sign
  }

  async run (argv) {
    let { adapter, password } = this._storeParams
    this._store = await Store.open(adapter, password)

    let params = parseArgv(argv)

    await this.execute(params)
  }

  async execute (params) {
    let service = params.service
    delete params.service // TODO whitelist generator config params

    if (params.help) {
      let helpPath = path.resolve(__dirname, 'usage.txt')
      return this._out.write(fs.readFileSync(helpPath))
    }

    if (params.initpath) {
      return this._out.write(path.resolve(__dirname, 'scripts', 'init'))
    }

    if (params.cmplt !== undefined) {
      return this.complete(params.cmplt)
    }

    if (params['delete-globals']) return this.deleteGlobals()

    if (params.delete) return this.deleteService(params.delete)
    if (params.clear)  return this.deleteAll()
    if (params.export) return this.export(params.export)
    if (params.import) return this.import(params.import)

    await this._getPhrase(params)

    if (params.config) {
      delete params.config
      return this.configure(service, params)
    } else {
      return this.generate(service, params)
    }
  }

  async complete (word) {
    if (word === 'true') word = '--'

    if (/^-/.test(word)) {
      let names = Object.keys(OPTIONS).map((opt) => '--' + opt)
      names = names.filter((name) => name.indexOf(word) === 0)
      this._out.write(names.sort().join('\n'))
    } else {
      let services = await this._store.listServices(word)
      services = services.filter((service) => service.indexOf(word) === 0)
      this._out.write(services.sort().join('\n'))
    }
  }

  async _getNotes (service, params) {
    if (!params.notes) return null
    if (!service) throw new Error('No service name given')

    let settings = await this._store.serviceSettings(service, false)

    let notes = (settings || {}).notes ||
                '# Notes for service "' + service + '"\n' +
                '# Save this file and quit your editor to save your notes\n'

    notes = await editor.editTempfile(notes)
    params.notes = /^\s*$/.test(notes) ? undefined : notes
  }

  async _getPhrase (params) {
    params.input = { key: !!params.key, phrase: !!params.phrase }

    if (params.key) {
      params.key = await this._selectKey()
    }

    if (params.phrase) {
      params.phrase = await this._requestPassword()
    }
  }

  async export (path) {
    let config = await this._store.export()
    config = config || { global: {}, services: {} }

    let json = JSON.stringify(config, true, 2)
    fs.writeFileSync(path, json)

    this._out.write('Exported settings to ' + path + '\n')
  }

  async import (path) {
    let content = fs.readFileSync(path, 'utf8')
    let config = null

    try {
      config = JSON.parse(content)
    } catch (error) {
      throw new Error('The file "' + path + '" does not contain valid JSON')
    }

    await this._store.import(config)
    this._out.write('Imported settings from ' + path + '\n')
  }

  async configure (service, params) {
    await this._getNotes(service, params)
    let settings = {}

    for (let key in params) {
      if (typeof params[key] !== 'object') settings[key] = params[key]
    }

    if (service) {
      return this._store.saveService(service, settings)
    } else {
      return this._store.saveGlobals(settings)
    }
  }

  async deleteGlobals () {
    let message = 'This will delete your global settings. Are you sure?'

    await this._confirmAction(message)
    await this._store.deleteGlobals()
  }

  async deleteService (service) {
    if (!service) throw new Error('No service name given')

    let message = 'This will delete your "' + service + '" settings. Are you sure?'

    await this._confirmAction(message)
    await this._store.deleteService(service)
  }

  async deleteAll () {
    let message = 'This will delete ALL your settings. Are you sure?'

    await this._confirmAction(message)
    await this._store.clear()
  }

  async generate (service, params) {
    if (!service) throw new Error('No service name given')

    let settings = await this._store.serviceSettings(service, true)
    params = { ...settings, ...params }

    if (params.key && !params.input.phrase) {
      params.phrase = await this._signData(params.key, Vault.UUID)
    }

    if (params.phrase === undefined) {
      throw new Error('No passphrase given; pass `-p` or run `vault -cp`')
    }

    let vault = new Vault(params)
    let password = await vault.generate(service)

    this._out.write(password)
    if (this._tty) this._out.write('\n')

    if (settings.notes !== undefined) {
      this._err.write('\n' + settings.notes.replace(/^\s*|\s*$/g, '') + '\n\n')
    }
  }
}

module.exports = CLI
