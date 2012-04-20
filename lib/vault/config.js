var fs    = require('fs'),
    AES   = require('./aes'),
    Vault = require('../vault');

var Config = function(options) {
  this._path = options.path;
  this._aes  = new AES(options.key);
};

Config.prototype.edit = function(transform) {
  var config = this._readFile();
  transform(config);
  var json = JSON.stringify(config);
  fs.writeFileSync(this._path, this._aes.encrypt(json));
};

Config.prototype.read = function(service) {
  var config   = this._readFile(),
      settings = {};
  
  Vault.extend(settings, config.services[service] || {});
  Vault.extend(settings, config, function(value) { return typeof value !== 'object' });
  return settings;
};

Config.prototype.export = function(path) {
  var config = this._readFile();
  fs.writeFileSync(path, JSON.stringify(config, true, 2));
};

Config.prototype.import = function(path) {
  var content = fs.readFileSync(path).toString();
  fs.writeFileSync(this._path, this._aes.encrypt(content));
};

Config.prototype._readFile = function() {
  try {
    var content = fs.readFileSync(this._path).toString();
    return JSON.parse(this._aes.decrypt(content));
  } catch (e) {
    if (e instanceof SyntaxError || /^DecipherFinal/.test(e.message))
      throw new Error('Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings');
    else
      return {services: {}};
  }
};

module.exports = Config;

