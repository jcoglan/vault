'use strict'

const escodb = require('./escodb')
const { sortObject } = require('./util')

const GLOBAL_ITEM = '/global'
const SERVICE_DIR = '/services/'

class Store {
  static async open (adapter, password) {
    let store = await escodb.createStore({ adapter, password })
    return new Store(store)
  }

  constructor (esco) {
    this._esco = esco
    this._task = esco.task()
  }

  async listServices (prefix) {
    let parts = prefix.split('/')
    let last = parts.pop()
    let base = ['', 'services', ...parts, ''].join('/')

    let items = await this._task.list(base) || []
    return items.map((item) => [...parts, item].join('/'))
  }

  async saveGlobals (settings) {
    await this._task.update(GLOBAL_ITEM, (doc) => ({ ...doc, ...settings }))
  }

  async deleteGlobals () {
    await this._task.remove(GLOBAL_ITEM)
  }

  async saveService (service, settings) {
    await this._task.update(SERVICE_DIR + service, (doc) => ({ ...doc, ...settings }))
  }

  async deleteService (service) {
    let pathname = SERVICE_DIR + service
    let doc = await this._task.get(pathname)

    if (!doc) {
      throw new Error('Service "' + service + '" is not configured')
    }

    await this._task.remove(pathname)
  }

  async globalSettings () {
    let doc = await this._task.get(GLOBAL_ITEM)
    return doc || {}
  }

  async serviceSettings (service, includeGlobal) {
    let [global, settings] = await Promise.all([
      includeGlobal ? this.globalSettings() : null,
      this._task.get(SERVICE_DIR + service)
    ])

    return { ...global, ...settings }
  }

  async import (settings) {
    let global = settings.global
               ? this._task.update(GLOBAL_ITEM, () => settings.global)
               : null

    let entries = Object.entries(settings.services || {})

    let services = entries.map(([name, settings]) => {
      return this._task.update(SERVICE_DIR + name, () => settings)
    })

    await Promise.all([global, ...services])
  }

  async export () {
    let exported = { services: {} }

    let global = await this._task.get(GLOBAL_ITEM)
    if (global) exported.global = global

    for await (let service of this._task.find(SERVICE_DIR)) {
      exported.services[service] = await this._task.get(SERVICE_DIR + service)
    }

    return sortObject(exported)
  }

  async clear () {
    await Promise.all([
      this._task.remove(GLOBAL_ITEM),
      this._task.prune(SERVICE_DIR)
    ])
  }
}

module.exports = Store
