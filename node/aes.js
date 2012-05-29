var crypto   = require('crypto'),
    CryptoJS = require('../lib/crypto-js-3.0.2'),
    Vault    = require('../lib/vault');

var randomBytes = function(size) {
  if (crypto.randomBytes) return crypto.randomBytes(size);
  var buffer = new Buffer(size);
  while (size--) buffer[size] = Math.floor(Math.random() * 256);
  return buffer;
};

var pbkdf2 = function(password, salt, keylen, iterations, callback) {
  if (crypto.pbkdf2)
    return crypto.pbkdf2(password, salt, iterations, 4 * keylen, function(error, key) {
      callback(error, new Buffer(key, 'binary').toString('hex'));
    });
  
  var key = CryptoJS.PBKDF2(password, salt, {keySize: keylen, iterations: iterations});
  callback(null, key.toString());
};

var AES = function(key) {
  this._key = key;
};

AES.prototype.IV_SIZE  = 16;
AES.prototype.MAC_SIZE = 64;

AES.prototype.deriveKeys = function(callback, context) {
  var self = this;
  pbkdf2(self._key, Vault.UUID, 1, 16, function(error, key1) {
    pbkdf2(self._key, Vault.UUID, 2, 16, function(error, key2) {
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
        ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    
    ciphertext += cipher.final('base64');
    ciphertext = new Buffer(ciphertext, 'utf8');
    
    var result = new Buffer(iv.length + ciphertext.length);
    iv.copy(result);
    ciphertext.copy(result, iv.length);
    
    var mac = new Buffer(Vault.createHash(key2, result.toString('base64')), 'utf8'),
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
        target  = new Buffer(iv.length + key.length);
    
    iv.copy(target);
    key.copy(target, iv.length);
    
    var cipher    = crypto.createDecipher('aes256', target.toString('base64')),
        plaintext = cipher.update(payload, 'base64', 'utf8');
    
    plaintext += cipher.final('utf8');
    
    var h        = Vault.createHash,
        expected = mac.toString('utf8'),
        actual   = h(key2, message.toString('base64'));
    
    if (h(Vault.UUID, expected) !== h(Vault.UUID, actual))
      callback.call(context, Error('DecipherError: Your .vault file has been tampered with'));
    else
      callback.call(context, null, plaintext);
  }, this);
};

module.exports = AES;

