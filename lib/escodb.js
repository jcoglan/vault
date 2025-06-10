'use strict'

const { Store, FileAdapter } = require('@escodb/core')

const CREATE_OPTS = {
  shards: { n: 4 }
}

if (process.env.NODE_ENV === 'test') {
  CREATE_OPTS.password = { iterations: 10 }
}

module.exports = {
  createFileAdapter (path) {
    return new FileAdapter({ path })
  },

  createStore ({ adapter, password }) {
    let store = new Store(adapter, { key: { password } })
    return store.openOrCreate(CREATE_OPTS)
  }
}
