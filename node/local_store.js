var fs     = require('fs'),
    Cipher = require('vault-cipher'),
    Vault  = require('../lib/vault');

var sort = function(object) {
  if (typeof object !== 'object') return object;
  if (object === null) return null;

  if (object instanceof Array)
    return object.map(function(o) { return sort(o) })

  var copy = {}, keys = Object.keys(object).sort();
  for (var i = 0, n = keys.length; i < n; i++)
    copy[keys[i]] = sort(object[keys[i]]);

  return copy;
};

var LocalStore = function(options) {
  this._path   = options.path;
  this._cipher = new Cipher(options.key, {format: 'base64', work: 100, salt: Vault.UUID});
};

LocalStore.prototype.clear = function(callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);

    fs.unlink(this._path, function() {
      callback.apply(context, arguments);
    });
  }, this);
};

LocalStore.prototype.listServices = function(callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);
    callback.call(context, null, Object.keys(config.services).sort());
  });
};

LocalStore.prototype.saveGlobals = function(settings, callback, context) {
  this.load(function(error, config) {
    if (error) return callback.cal(context, error);

    var saved   = config.global || {},
        updated = {};

    Vault.extend(updated, settings);
    Vault.extend(updated, saved);
    config.global = updated;

    this.dump(config, callback, context);
  }, this);
};

LocalStore.prototype.saveService = function(service, settings, callback, context) {
  this.load(function(error, config) {
    if (error) return callback.cal(context, error);

    var saved   = config.services[service] || {},
        updated = {};

    Vault.extend(updated, settings);
    Vault.extend(updated, saved);
    config.services[service] = updated;

    this.dump(config, callback, context);
  }, this);
};

LocalStore.prototype.deleteGlobals = function(callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);
    config.global = {};
    this.dump(config, callback, context);
  }, this);
};

LocalStore.prototype.deleteService = function(service, callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);

    if (!config.services[service])
      return callback.call(context, new Error('Service "' + service + '" is not configured'));

    delete config.services[service];
    this.dump(config, callback, context);
  }, this);
};

LocalStore.prototype.serviceSettings = function(service, callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);

    var settings = {};
    Vault.extend(settings, config.services[service] || {});
    Vault.extend(settings, config.global || {});

    callback.call(context, null, settings);
  });
};

LocalStore.prototype.load = function(callback, context) {
  var self = this;
  fs.readFile(this._path, function(error, content) {
    if (error)
      return callback.call(context, null, {global: {}, services: {}});

    self._cipher.decrypt(content.toString(), function(error, plaintext) {
      var err = new Error('Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings');
      if (error) return callback.call(context, err);

      var config;
      try {
        config = JSON.parse(plaintext);
      } catch (e) {
        return callback.call(context, err);
      }
      callback.call(context, null, config);
    });
  });
};

LocalStore.prototype.dump = function(config, callback, context) {
  config = sort(config);
  this.import(JSON.stringify(config, true, 2), callback, context);
};

LocalStore.prototype.import = function(string, callback, context) {
  this._cipher.encrypt(string, function(error, ciphertext) {
    fs.writeFile(this._path, ciphertext, function() {
      if (callback) callback.apply(context, arguments);
    });
  }, this);
};

LocalStore.prototype.export = function(callback, context) {
  this.load(function(error, config) {
    if (error) callback.call(context, error);
    else callback.call(context, null, config && JSON.stringify(config, true, 2));
  });
};

module.exports = LocalStore;

