var fs    = require('fs'),
    AES   = require('./aes'),
    Vault = require('../lib/vault');

var Config = function(options) {
  this._path = options.path;
  this._aes  = new AES(options.key);
};

Config.prototype.edit = function(transform, callback, context) {
  this._readFile(function(error, config) {
    if (error) return callback.call(context, error);
    transform(config);
    var json = JSON.stringify(config);
    fs.writeFile(this._path, this._aes.encrypt(json), function() {
      callback.apply(context, arguments);
    });
  }, this);
};

Config.prototype.read = function(service, callback, context) {
  this._readFile(function(error, config) {
    if (error) return callback.call(context, error);
    var settings = {};
    Vault.extend(settings, config.services[service] || {});
    Vault.extend(settings, config.global);
    callback.call(context, null, settings);
  }, this);
};

Config.prototype.export = function(path, callback, context) {
  this._readFile(function(error, config) {
    if (error) return callback.call(context, error);
    fs.writeFile(path, JSON.stringify(config, true, 2), function() {
      callback.apply(context, arguments);
    });
  }, this);
};

Config.prototype.import = function(path, callback, context) {
  var self = this;
  fs.readFile(path, function(error, content) {
    if (error) return callback.call(context, error);
    fs.writeFile(self._path, self._aes.encrypt(content.toString()), function() {
      callback.apply(context, arguments);
    });
  });
};

Config.prototype._readFile = function(callback, context) {
  var self = this;
  fs.readFile(this._path, function(error, content) {
    if (error)
      return callback.call(context, null, {global: {}, services: {}});
    
    var config;
    try { config = JSON.parse(self._aes.decrypt(content.toString())) }
    catch (e) {
      error = new Error('Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings');
      return callback.call(context, error);
    }
    callback.call(context, null, config);
  });
};

module.exports = Config;

