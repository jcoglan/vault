var crypto = require('crypto'),
    Vault  = require('../lib/vault');

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

AES.prototype.deriveKeys = function(callback, context) {
  var self = this;
  crypto.pbkdf2(self._key, Vault.UUID, 1, 16, function(error, key1) {
    crypto.pbkdf2(self._key, Vault.UUID, 2, 16, function(error, key2) {
      callback.call(context, key1, key2);
    });
  });
};

AES.prototype.encrypt = function(plaintext, callback, context) {
  this.deriveKeys(function(key1, key2) {
    var key    = new Buffer(key1, 'utf8'),
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
    
    var mac = new Buffer(Vault.createHash(key2, result.toString('binary')), 'utf8'),
        out = new Buffer(result.length + mac.length);
    
    result.copy(out);
    mac.copy(out, result.length);
    
    callback.call(context, null, out.toString('binary'));
  }, this);
};

AES.prototype.decrypt = function(ciphertext, callback, context) {
  this.deriveKeys(function(key1, key2) {
    var key     = new Buffer(key1, 'utf8'),
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
        actual   = h(key2, message.toString('binary'));
    
    if (h(Vault.UUID, expected) !== h(Vault.UUID, actual))
      callback.call(context, Error('DecipherError: Your .vault file has been tampered with'));
    else
      callback.call(context, null, plaintext);
  }, this);
};

module.exports = AES;

