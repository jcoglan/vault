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

AES.prototype.encrypt = function(data) {
  var key    = new Buffer(this._key, 'utf8'),
      iv     = crypto.randomBytes(this.IV_SIZE),
      target = new Buffer(iv.length + key.length);
  
  iv.copy(target);
  key.copy(target, iv.length);
  
  var cipher    = crypto.createCipher('aes256', target.toString('binary')),
      encrypted = cipher.update(data, 'utf8', 'binary');
  
  encrypted += cipher.final('binary');
  encrypted = new Buffer(encrypted, 'binary');
  
  var result = new Buffer(iv.length + encrypted.length);
  iv.copy(result);
  encrypted.copy(result, iv.length);
  
  return result.toString('binary');
};

AES.prototype.decrypt = function(encrypted) {
  var buffer  = new Buffer(encrypted, 'binary'),
      message = buffer.slice(this.IV_SIZE).toString('binary'),
      key     = new Buffer(this._key, 'utf8'),
      iv      = buffer.slice(0, this.IV_SIZE),
      target  = new Buffer(iv.length + key.length);
  
  iv.copy(target);
  key.copy(target, iv.length);
  
  var cipher = crypto.createDecipher('aes256', target.toString('binary')),
      data   = cipher.update(message, 'binary', 'utf8');
  
  data += cipher.final('utf8');
  return data;
};

module.exports = AES;

