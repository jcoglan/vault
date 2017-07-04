'use strict';

var storeroom = require('storeroom'),
    Buffer    = storeroom.Buffer,
    crypto    = storeroom.crypto,
    Reader    = require('./reader'),
    util      = require('util');

var KEY_SIZE = 32;

var V03Reader = function() {
  Reader.apply(this, arguments);

  this._ivSize  = 16;
  this._macSize = 32;
};
util.inherits(V03Reader, Reader);

V03Reader.prototype.run = function() {
  this.log('attempting to parse the v0.3 file format');

  return Reader.prototype.run.apply(this);
};

V03Reader.prototype._generateKeys = function() {
  this._encKey  = this.pbkdf2(this._password, KEY_SIZE, 100);
  this._signKey = this.pbkdf2(this._password, KEY_SIZE, 200);

  this._encKeySize = this._signKeySize = KEY_SIZE;
};

V03Reader.prototype._hmacInput = function() {
  return this._message.toString('hex');
};

V03Reader.prototype._expectedTag = function() {
  return this._tag.toString('hex');
};

V03Reader.prototype._createDecipher = function() {
  return crypto.createDecipheriv('aes-256-cbc', this._encKey, this._iv);
};

module.exports = V03Reader;
