var Vault = require('../lib/vault');

var Config = function(storage) {
  this._storage = storage;
};

Config.prototype.edit = function(transform, callback, context) {
  this._storage.load(function(error, config) {
    if (error) return callback.call(context, error);
    transform(config);
    this._storage.dump(config, callback, context);
  }, this);
};

Config.prototype.read = function(service, callback, context) {
  this._storage.load(function(error, config) {
    if (error) return callback.call(context, error);
    var settings = {};
    Vault.extend(settings, config.services[service] || {});
    Vault.extend(settings, config.global);
    callback.call(context, null, settings);
  }, this);
};

module.exports = Config;

