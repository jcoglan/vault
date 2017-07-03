'use strict';

var assert       = require('assert'),
    EventEmitter = require('events').EventEmitter,
    fs           = require('fs'),
    util         = require('util'),
    storeroom    = require('storeroom'),
    Buffer       = storeroom.Buffer,
    crypto       = storeroom.crypto,
    Promise      = storeroom.Promise,
    Vault        = require('../vault');

var IV_SIZE  = 16,
    KEY_SIZE = 32,
    MAC_SIZE = 32;

var pbkdf2 = function(password, work) {
  var binary = crypto.pbkdf2Sync(password, Vault.UUID, work, 16, 'sha1');
  return new Buffer(new Buffer(binary, 'binary').toString('hex'), 'utf8');
};

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
  this._parseContents();
  this._deriveKeys();
  this._checkSignature();
  this._decryptPayload();
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

  this._buffer = new Buffer(this._content, 'base64');
};

Migrator.prototype._parseContents = function() {
  this.log('parsing MAC, IV and payload from the file contents');

  var cut1      = Math.max(this._buffer.length - MAC_SIZE, 0);
  this._message = this._buffer.slice(0, cut1);
  this._mac     = this._buffer.slice(cut1);

  var cut0      = Math.min(IV_SIZE, this._message.length);
  this._iv      = this._message.slice(0, cut0);
  this._payload = this._message.slice(cut0);
};

Migrator.prototype._deriveKeys = function() {
  this.log('checking password');

  if (typeof this._password !== 'string' || this._password === '')
    throw new Error('No password is set; check your VAULT_KEY environment variable');

  this.log('deriving an encryption key and signing key');

  this._encKey  = pbkdf2(this._password, 100);
  this._signKey = pbkdf2(this._password, 200);

  if (!(this._encKey instanceof Buffer) || this._encKey.length !== KEY_SIZE)
    throw new Error('Derived encryption key is not valid');

  if (!(this._signKey instanceof Buffer) || this._signKey.length !== KEY_SIZE)
    throw new Error('Derived signing key is not valid');
};

Migrator.prototype._checkSignature = function() {
  this.log('checking HMAC signature');

  var hmac = crypto.createHmac('sha256', this._signKey);
  hmac.update(this._message.toString('hex'));

  var expected = this._mac.toString('hex'),
      actual   = hmac.digest('hex');

  if (expected !== actual)
    throw new Error('File does not contain a valid HMAC-SHA256 signature');
};

Migrator.prototype._decryptPayload = function() {
  this.log('decrypting file contents');

  var cipher = crypto.createDecipheriv('aes-256-cbc', this._encKey, this._iv),
      plaintext;
  
  try {
    plaintext = cipher.update(this._payload, 'binary', 'utf8') + cipher.final('utf8');
  } catch (error) {
    throw new Error('Could not decrypt file: ' + error.message);
  }

  try {
    this._data = JSON.parse(plaintext);
  } catch (error) {
    throw new Error('File does not contain a valid JSON payload');
  }
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
