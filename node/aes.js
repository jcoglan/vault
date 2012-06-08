var crypto = require('crypto'),
    Vault  = require('../lib/vault');

var randomBytes = function(size) {
  if (crypto.randomBytes) return crypto.randomBytes(size);
  var buffer = new Buffer(size);
  while (size--) buffer[size] = Math.floor(Math.random() * 256);
  return buffer;
};

var AES = function(key) {
  this._key = key;
};

AES.prototype.IV_SIZE  = 16;
AES.prototype.KEY_SIZE = 16;
AES.prototype.MAC_SIZE = 64;

AES.prototype.deriveKeys = function(callback, context) {
  var self = this;
  Vault.pbkdf2(self._key, Vault.UUID, 1, self.KEY_SIZE, function(error, key1) {
    Vault.pbkdf2(self._key, Vault.UUID, 2, self.KEY_SIZE, function(error, key2) {
      callback.call(context, key1, key2);
    });
  });
};

AES.prototype.encrypt = function(plaintext, callback, context) {
  this.deriveKeys(function(key1, key2) {
    var key    = new Buffer(key1, 'utf8'),
        iv     = randomBytes(this.IV_SIZE),
        target = new Buffer(iv.length + key.length);
    
    iv.copy(target);
    key.copy(target, iv.length);
    
    var cipher     = crypto.createCipher('aes256', target.toString('base64')),
        ciphertext = cipher.update(plaintext, 'utf8', 'base64') + cipher.final('base64');
    
    ciphertext = new Buffer(ciphertext, 'utf8');
    
    var result = new Buffer(iv.length + ciphertext.length);
    iv.copy(result);
    ciphertext.copy(result, iv.length);
    
    var hmac = crypto.createHmac('sha256', key2);
    hmac.update(result.toString('base64'));

    var mac = new Buffer(hmac.digest('hex'), 'utf8'),
        out = new Buffer(result.length + mac.length);
    
    result.copy(out);
    mac.copy(out, result.length);
    
    callback.call(context, null, out.toString('base64'));
  }, this);
};

AES.prototype.decrypt = function(ciphertext, callback, context) {
  this.deriveKeys(function(key1, key2) {
    var key     = new Buffer(key1, 'utf8'),
        buffer  = new Buffer(ciphertext, 'base64'),
        message = buffer.slice(0, buffer.length - this.MAC_SIZE),
        iv      = message.slice(0, this.IV_SIZE),
        payload = message.slice(this.IV_SIZE),
        mac     = buffer.slice(buffer.length - this.MAC_SIZE),
        target  = new Buffer(iv.length + key.length),
        cipher, plaintext;
    
    iv.copy(target);
    key.copy(target, iv.length);
    
    try {
      cipher    = crypto.createDecipher('aes256', target.toString('base64'));
      plaintext = cipher.update(payload, 'base64', 'utf8') + cipher.final('utf8');
    } catch (e) {
      plaintext = null;
    }
    
    var hmac = crypto.createHmac('sha256', key2);
    hmac.update(message.toString('base64'));

    var expected = hmac.digest('hex'),
        actual   = mac.toString('utf8'),
        h        = Vault.createHash;
    
    if (h(Vault.UUID, expected) !== h(Vault.UUID, actual))
      callback.call(context, new Error('DecryptError'));
    else if (plaintext === null)
      callback.call(context, new Error('DecryptError'));
    else
      callback.call(context, null, plaintext);
  }, this);
};

module.exports = AES;

