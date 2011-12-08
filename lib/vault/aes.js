var crypto = require('crypto'),
    Vault  = require('../vault');

var AES = {
  KEY: process.env.VAULT_KEY ||
       process.env.LOGNAME   ||
       process.env.USER,
  
  encrypt: function(data) {
    var cipher    = crypto.createCipher('aes256', this.KEY),
        encrypted = cipher.update(data, 'utf8', 'binary');
    
    encrypted += cipher.final('binary');
    return encrypted;
  },
  
  decrypt: function(encrypted) {
    var cipher = crypto.createDecipher('aes256', this.KEY),
        data   = cipher.update(encrypted, 'binary', 'utf8');
    
    data += cipher.final('utf8');
    return data;
  }
};

module.exports = AES;

