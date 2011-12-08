var fs    = require('fs'),
    path  = require('path'),
    AES   = require('./aes'),
    Vault = require('../vault');

var Config = {
  PATH: process.env.HOME + '/.vault',
  
  edit: function(transform, callback) {
    var configPath = this.PATH;
    fs.readFile(configPath, function(error, data) {
      
      var config = error ? {services: {}} : JSON.parse(AES.decrypt(data.toString()));
      transform(config);
      var json = JSON.stringify(config, true, 2);
      
      fs.writeFile(configPath, AES.encrypt(json), callback);
    });
  },
  
  read: function(service) {
    var settings = {};
    try {
      var content = fs.readFileSync(this.PATH).toString(),
          data    = JSON.parse(AES.decrypt(content));
      
      Vault.extend(settings, data.services[service] || {});
      Vault.extend(settings, data, function(value) { return typeof value !== 'object' });
    } catch (e) {}
    
    return settings;
  }
};

module.exports = Config;

