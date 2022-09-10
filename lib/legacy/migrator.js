'use strict';

var assert       = require('assert'),
    EventEmitter = require('events').EventEmitter,
    fs           = require('fs'),
    util         = require('util'),
    storeroom    = require('storeroom'),
    Buffer       = storeroom.Buffer,
    crypto       = storeroom.crypto,
    Promise      = storeroom.Promise;

var READERS = [
  require('./v03_reader'),
  require('./v02_reader')
];

var random = function() {
  return crypto.randomBytes(6).toString('hex');
};

var Migrator = function(filename, password) {
  this._filename = filename;
  this._password = password;
};
util.inherits(Migrator, EventEmitter);

Migrator.prototype.run = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    try {
      resolve(self._migrate());
    } catch (error) {
      reject(error);
    }
  });
};

Migrator.prototype.log = function(message) {
  this.emit('message', message);
};

Migrator.prototype._migrate = function() {
  this._readInputFile();
  this._decryptFile();
  this._createStoreroom();

  var self = this;

  return this._copySettings().then(function() {
    return self._swapFiles();
  }).then(function() {
    self.log('done');
    return self._backuppath;
  });
};

Migrator.prototype._readInputFile = function() {
  this.log('reading input file: ' + this._filename);

  try {
    this._content = fs.readFileSync(this._filename, 'utf8');
  } catch (error) {
    throw new Error('File is unreadable: ' + this._filename);
  }

  this._buffer = Buffer.from(this._content, 'base64');
};

Migrator.prototype._decryptFile = function() {
  READERS.forEach(function(Reader) {
    if (this._data) return;

    var reader = new Reader(this, this._buffer, this._password);
    try {
      this._data = reader.run();
    } catch (error) {
      this.log(error.message);
    }
  }, this);

  if (!this._data)
    throw new Error('Failed to decrypt the file');
};

Migrator.prototype._createStoreroom = function() {
  this._storepath = '/tmp/vault-convert-' + random();
  this.log('creating new storage target: ' + this._storepath);

  var adapter = storeroom.createFileAdapter(this._storepath);
  this._store = storeroom.createStore({adapter: adapter, password: this._password});
};

Migrator.prototype._copySettings = function() {
  var copies = [['/global', this._data.global]];

  for (var service in this._data.services)
    copies.push(['/services/' + service, this._data.services[service]]);

  var self = this;

  return copies.reduce(function(state, copy) {
    var key   = copy[0],
        value = copy[1];

    if (value === undefined) return state;

    return state.then(function() {
      return self._store.put(key, value);

    }).then(function() {
      return self._store.get(key);

    }).then(function(result) {
      var message = 'Failed to write: [' + key + '] ' + JSON.stringify(value);
      assert.deepEqual(result, value, message);

      self.log('wrote setting: ' + key);
    });
  }, Promise.resolve());
};

Migrator.prototype._swapFiles = function() {
  this._backuppath = '/tmp/vault-backup-' + random();

  this.log('moving old file: ' + this._filename + ' -> ' + this._backuppath);
  fs.renameSync(this._filename, this._backuppath);

  this.log('moving new file: ' + this._storepath + ' -> ' + this._filename);
  fs.renameSync(this._storepath, this._filename);
};

module.exports = Migrator;
