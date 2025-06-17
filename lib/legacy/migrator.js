'use strict';

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const crypto = require('../crypto')
const escodb = require('../escodb')
const Reader = require('./reader')

class Migrator {
  constructor ({ logger, pathname, password }) {
    this._logger = logger
    this._password = password

    this._pathname = pathname
    this._dirname = path.dirname(pathname)
  };

  log (message) {
    this._logger.info(message)
  }

  async run () {
    await this._readInputFile()
    await this._decryptFile()
    await this._createStore()
    await this._copySettings()
    await this._swapFiles()

    this.log('done')
    return this._backuppath
  }

  _readInputFile () {
    this.log('reading input file: ' + this._pathname)

    try {
      this._content = fs.readFileSync(this._pathname, 'utf8')
    } catch (error) {
      throw new Error('file is unreadable: ' + this._pathname)
    }
  }

  async _decryptFile () {
    let config = { logger: this._logger, password: this._password }
    this._data = await Reader.read(config, this._content)

    if (!this._data) {
      throw new Error('failed to decrypt the file')
    }
  }

  async _createStore () {
    this._storepath = path.join(this._dirname, 'vault-convert-' + random())
    this.log('creating new storage target: ' + this._storepath)

    let adapter = escodb.createFileAdapter(this._storepath)
    this._store = await escodb.createStore({ adapter, password: this._password })
  }

  async _copySettings () {
    let writer = this._store.task()
    let reader = this._store.task()

    let docs = [['/global', this._data.global]];

    for (let service in this._data.services) {
      docs.push(['/services/' + service, this._data.services[service]])
    }

    let writes = docs.map(([key, value]) => writer.update(key, () => value))
    await Promise.all(writes)

    for (let [key, value] of docs) {
      let stored = await reader.get(key)

      assert.deepEqual(value, stored,
        'failed to write: [' + key + '] ' + JSON.stringify(value))

      this.log('wrote setting: ' + key)
    }
  }

  _swapFiles () {
    this._backuppath = path.join(this._dirname, 'vault-backup-' + random())

    this._rename(this._pathname, this._backuppath)
    this._rename(this._storepath, this._pathname)
  }

  _rename (a, b) {
    this.log('moving file: ' + a + ' -> ' + b)
    fs.renameSync(a, b)
  }
}

function random () {
  return crypto.randomBytes(6).toString('hex')
}

module.exports = Migrator
