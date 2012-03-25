var crypto = require('crypto'),
    Vault  = require('../vault');

var AES = {
  KEY: process.env.VAULT_KEY ||
       process.env.LOGNAME   ||
       process.env.USER,
  
  IV_SIZE: 16,
  
  encrypt: function(data) {
    var key    = new Buffer(this.KEY, 'utf8'),
        iv     = new Buffer(this.IV_SIZE),
        target = new Buffer(iv.length + key.length);
    
    for (var i = 0; i < iv.length; i++) {
      iv[i] = Math.floor(Math.random() * 256);
    }
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
  },
  
  decrypt: function(encrypted) {
    var buffer  = new Buffer(encrypted, 'binary'),
        message = buffer.slice(this.IV_SIZE).toString('binary'),
        key     = new Buffer(this.KEY, 'utf8'),
        iv      = buffer.slice(0, this.IV_SIZE),
        target  = new Buffer(iv.length + key.length);
    
    iv.copy(target);
    key.copy(target, iv.length);
    
    var cipher = crypto.createDecipher('aes256', target.toString('binary')),
        data   = cipher.update(message, 'binary', 'utf8');
    
    data += cipher.final('utf8');
    return data;
  }
};

module.exports = AES;

