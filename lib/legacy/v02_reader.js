'use strict';

var storeroom = require('storeroom'),
    Buffer    = storeroom.Buffer,
    crypto    = storeroom.crypto,
    Reader    = require('./reader'),
    util      = require('util');

var V02Reader = function() {
  Reader.apply(this, arguments);

  this._ivSize  = 16;
  this._macSize = 64;
};
util.inherits(V02Reader, Reader);

V02Reader.prototype.run = function() {
  this.log('attempting to parse the v0.2 file format');

  return Reader.prototype.run.apply(this);
};

V02Reader.prototype._parseContents = function() {
  Reader.prototype._parseContents.apply(this);

  this._payload = new Buffer(this._payload.toString('utf8'), 'base64');
};

V02Reader.prototype._generateKeys = function() {
  this._encKey  = this.pbkdf2(this._password,  8, 16);
  this._signKey = this.pbkdf2(this._password, 16, 16);

  this._encKeySize  =  8;
  this._signKeySize = 16;
};

V02Reader.prototype._hmacInput = function() {
  return this._message.toString('base64');
};

V02Reader.prototype._expectedTag = function() {
  return this._tag.toString('utf8');
};

V02Reader.prototype._createDecipher = function() {
  var key = Buffer.concat([this._iv, this._encKey]);
  return crypto.createDecipher('aes256', key.toString('base64'));
};

module.exports = V02Reader;
