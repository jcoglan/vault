'use strict';

var storeroom = require('storeroom'),
    Buffer    = storeroom.Buffer,
    crypto    = storeroom.crypto,
    Vault     = require('../vault');

var Reader = function(migrator, contents, password) {
  this._migrator = migrator;
  this._buffer   = contents;
  this._password = password;
};

Reader.prototype.log = function(message) {
  this._migrator.log(message);
};

Reader.prototype.run = function() {
  this._parseContents();
  this._deriveKeys();
  this._checkSignature();
  this._decryptPayload();

  return this._data;
};

Reader.prototype.pbkdf2 = function(password, size, work) {
  var binary = crypto.pbkdf2Sync(password, Vault.UUID, work, size / 2, 'sha1');
  return Buffer.from(Buffer.from(binary, 'binary').toString('hex'), 'utf8');
};

Reader.prototype._parseContents = function() {
  this.log('parsing IV, payload and signature from the file contents');

  if (this._buffer.length < this._ivSize + 16 + this._macSize)
    throw new Error('File contents are too small to parse');

  var cut1 = this._ivSize,
      cut2 = this._buffer.length - this._macSize;

  this._message = this._buffer.slice(0, cut2);
  this._tag     = this._buffer.slice(cut2);

  this._iv      = this._message.slice(0, cut1);
  this._payload = this._message.slice(cut1);
};

Reader.prototype._deriveKeys = function() {
  this.log('checking password');

  if (typeof this._password !== 'string' || this._password === '')
    throw new Error('No password is set; check your VAULT_KEY environment variable');

  this.log('deriving an encryption key and signing key');

  this._generateKeys();

  if (!(this._encKey instanceof Buffer) || this._encKey.length !== this._encKeySize)
    throw new Error('Derived encryption key is not valid');

  if (!(this._signKey instanceof Buffer) || this._signKey.length !== this._signKeySize)
    throw new Error('Derived signing key is not valid');
};

Reader.prototype._checkSignature = function() {
  this.log('checking HMAC signature');

  var hmac = crypto.createHmac('sha256', this._signKey);
  hmac.update(this._hmacInput());

  if (this._expectedTag() !== hmac.digest('hex'))
    throw new Error('File does not contain a valid HMAC-SHA256 signature');
};

Reader.prototype._decryptPayload = function() {
  this.log('decrypting file contents');

  var cipher = this._createDecipher(), plaintext;

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

module.exports = Reader;
