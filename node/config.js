var fs    = require('fs'),
    AES   = require('./aes'),
    Vault = require('../lib/vault');

var Config = function(options) {
  this._path = options.path;
  this._aes  = new AES(options.key);
};

Config.prototype.edit = function(transform, callback, context) {
  var config = this._readFile();
  transform(config);
  var json = JSON.stringify(config);
  fs.writeFileSync(this._path, this._aes.encrypt(json));
  callback.call(context, null);
};

Config.prototype.read = function(service, callback, scope) {
  var config   = this._readFile(),
      settings = {};
  
  Vault.extend(settings, config.services[service] || {});
  Vault.extend(settings, config, function(value) { return typeof value !== 'object' });
  
  callback.call(scope, null, settings);
};

Config.prototype.export = function(path, callback, context) {
  var config = this._readFile();
  fs.writeFileSync(path, JSON.stringify(config, true, 2));
  callback.call(context, null);
};

Config.prototype.import = function(path, callback, context) {
  var content = fs.readFileSync(path).toString();
  fs.writeFileSync(this._path, this._aes.encrypt(content));
  callback.call(context, null);
};

Config.prototype._readFile = function() {
  try {
    var content = fs.readFileSync(this._path).toString();
    return JSON.parse(this._aes.decrypt(content));
  } catch (e) {
    if (e instanceof SyntaxError || /^Decipher/.test(e.message))
      throw new Error('Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings');
    else
      return {services: {}};
  }
};

module.exports = Config;

