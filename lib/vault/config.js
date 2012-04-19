var fs    = require('fs'),
    AES   = require('./aes'),
    Vault = require('../vault');

var Config = {
  PATH: process.env.HOME + '/' +
        (process.env.VAULT_PATH || '.vault'),
  
  edit: function(transform) {
    var config = this._readFile();
    transform(config);
    var json = JSON.stringify(config);
    fs.writeFileSync(this.PATH, AES.encrypt(json));
  },
  
  read: function(service) {
    var config   = this._readFile(),
        settings = {};
    
    Vault.extend(settings, config, function(value) { return typeof value !== 'object' });
    Vault.extend(settings, config.services[service] || {});
    return settings;
  },
  
  export: function(path) {
    var config = this._readFile();
    fs.writeFileSync(path, JSON.stringify(config, true, 2));
  },
  
  import: function(path) {
    var content = fs.readFileSync(path).toString();
    fs.writeFileSync(this.PATH, AES.encrypt(content));
  },
  
  _readFile: function() {
    try {
      var content = fs.readFileSync(this.PATH).toString();
      return JSON.parse(AES.decrypt(content));
    } catch (e) {
      if (e instanceof SyntaxError)
        throw new Error('Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings');
      else
        return {services: {}};
    }
  }
};

module.exports = Config;

