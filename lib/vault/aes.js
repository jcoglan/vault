var crypto = require('crypto'),
    Crypto = require('../crypto-hmac-sha256-2.5.3'),
    Vault  = require('../vault');

if (!crypto.randomBytes) // Node < 0.6
  crypto.randomBytes = function(size) {
    var buffer = new Buffer(size);
    while (size--) buffer[size] = Math.floor(Math.random() * 256);
    return buffer;
  };

var AES = function(key) {
  this._key = key;
};

AES.prototype.IV_SIZE  = 16;
AES.prototype.MAC_SIZE = 64;

AES.prototype.deriveKeys = function() {
  return [
    Crypto.PBKDF2(this._key, Vault.UUID, 16, {hasher: Crypto.SHA256, iterations: 1}),
    Crypto.PBKDF2(this._key, Vault.UUID, 16, {hasher: Crypto.SHA256, iterations: 2})
  ];
};

AES.prototype.encrypt = function(plaintext) {
  var keys   = this.deriveKeys(),
      key    = new Buffer(keys[0], 'utf8'),
      iv     = crypto.randomBytes(this.IV_SIZE),
      target = new Buffer(iv.length + key.length);
  
  iv.copy(target);
  key.copy(target, iv.length);
  
  var cipher     = crypto.createCipher('aes256', target.toString('binary')),
      ciphertext = cipher.update(plaintext, 'utf8', 'binary');
  
  ciphertext += cipher.final('binary');
  ciphertext = new Buffer(ciphertext, 'binary');
  
  var result = new Buffer(iv.length + ciphertext.length);
  iv.copy(result);
  ciphertext.copy(result, iv.length);
  
  var mac = new Buffer(Vault.createHash(keys[1], result.toString('binary')), 'utf8'),
      out = new Buffer(result.length + mac.length);
  
  result.copy(out);
  mac.copy(out, result.length);
  
  return out.toString('binary');
};

AES.prototype.decrypt = function(ciphertext) {
  var keys    = this.deriveKeys(),
      key     = new Buffer(keys[0], 'utf8'),
      buffer  = new Buffer(ciphertext, 'binary'),
      message = buffer.slice(0, buffer.length - this.MAC_SIZE),
      iv      = message.slice(0, this.IV_SIZE),
      payload = message.slice(this.IV_SIZE),
      mac     = buffer.slice(buffer.length - this.MAC_SIZE),
      target  = new Buffer(iv.length + key.length);
  
  iv.copy(target);
  key.copy(target, iv.length);
  
  var cipher    = crypto.createDecipher('aes256', target.toString('binary')),
      plaintext = cipher.update(payload, 'binary', 'utf8');
  
  plaintext += cipher.final('utf8');
  
  var h        = Vault.createHash,
      expected = mac.toString('utf8'),
      actual   = h(keys[1], message.toString('binary'));
  
  if (h(Vault.UUID, expected) !== h(Vault.UUID, actual))
    throw new Error('DecipherError: Your .vault file has been tampered with');
  
  return plaintext;
};

module.exports = AES;

