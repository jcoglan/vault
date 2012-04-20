var crypto = require('crypto');

if (!crypto.randomBytes) // Node < 0.6
  crypto.randomBytes = function(size) {
    var buffer = new Buffer(size);
    while (size--) buffer[size] = Math.floor(Math.random() * 256);
    return buffer;
  };

var AES = function(key) {
  this._key = key;
};

AES.prototype.IV_SIZE = 16;

AES.prototype.encrypt = function(plaintext) {
  var key    = new Buffer(this._key, 'utf8'),
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
  
  return result.toString('binary');
};

AES.prototype.decrypt = function(ciphertext) {
  var buffer  = new Buffer(ciphertext, 'binary'),
      message = buffer.slice(this.IV_SIZE).toString('binary'),
      key     = new Buffer(this._key, 'utf8'),
      iv      = buffer.slice(0, this.IV_SIZE),
      target  = new Buffer(iv.length + key.length);
  
  iv.copy(target);
  key.copy(target, iv.length);
  
  var cipher    = crypto.createDecipher('aes256', target.toString('binary')),
      plaintext = cipher.update(message, 'binary', 'utf8');
  
  plaintext += cipher.final('utf8');
  return plaintext;
};

module.exports = AES;

