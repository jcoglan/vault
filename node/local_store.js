var fs          = require('fs'),
    Cipher      = require('vault-cipher'),
    Vault       = require('../lib/vault'),
    RemoteStore = require('./remote_store');

var LocalStore = function(options) {
  this._path   = options.path;
  this._cipher = new Cipher(options.key, {format: 'base64', work: 100, salt: Vault.UUID});
};

LocalStore.LOCAL = 'local';

LocalStore.prototype.clear = function(callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);

    fs.unlink(this._path, function() {
      callback.apply(context, arguments);
    });
  }, this);
};

LocalStore.prototype.addSource = function(address, options, callback, context) {
  var remote = new RemoteStore(address, options);
  remote.connect(function(error, response) {
    if (error) return callback.call(context, error);

    this.load(function(error, config) {
      if (error) return callback.call(context, error);

      response.type = remote.getType();
      Vault.extend(response, options);

      config.sources = config.sources || {};
      config.sources[address] = response;

      this.dump(config, callback, context);
    }, this);
  }, this);
};

LocalStore.prototype.deleteSource = function(address, callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);

    if (!config.sources || !config.sources[address])
      return callback.call(context, new Error('Source "' + address + '" does not exist'));

    delete config.sources[address];
    this.dump(config, callback, context);
  }, this);
};

LocalStore.prototype.setSource = function(address, callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);

    if (address !== LocalStore.LOCAL && (!config.sources || !config.sources[address]))
      return callback.call(context, new Error('Source "' + address + '" does not exist'));

    config.sources = config.sources || {};
    config.sources.__default__ = address;
    this.dump(config, callback, context);
  }, this);
};

LocalStore.prototype.listSources = function(callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);

    var sources     = config.sources || {},
        sourceNames = Object.keys(sources)
                        .filter(function(s) { return !/^__[a-z]+__$/.test(s) });

    var current = sources.__default__;
    if (!current || !sources[current]) current = LocalStore.LOCAL;

    callback.call(context, null, sourceNames.concat(LocalStore.LOCAL), current);
  });
};

LocalStore.prototype.listServices = function(callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);
    callback.call(context, null, Object.keys(config.services || {}).sort());
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

    config.services = config.services || {};

    var saved   = config.services[service] || {},
        updated = {};

    Vault.extend(updated, settings);
    Vault.extend(updated, saved);
    config.services[service] = updated;

    this.dump(config, callback, context);
  }, this);
};

LocalStore.prototype.deleteService = function(service, callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);

    if (!config.services || !config.services[service])
      return callback.call(context, new Error('Service "' + service + '" is not configured'));

    delete config.services[service];
    this.dump(config, callback, context);
  }, this);
};

LocalStore.prototype.serviceSettings = function(service, callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);

    var settings = {};
    Vault.extend(settings, (config.services || {})[service] || {});
    Vault.extend(settings, config.global || {});

    callback.call(context, null, settings);
  });
};

LocalStore.prototype.load = function(callback, context) {
  if (this._configCache) return callback.call(context, null, this._configCache);

  var self = this;
  fs.readFile(this._path, function(error, content) {
    if (error)
      return callback.call(context, null, {global: {}, services: {}, sources: {}});

    self._cipher.decrypt(content.toString(), function(error, plaintext) {
      var err = new Error('Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings');
      if (error) return callback.call(context, err);

      var config;
      try {
        config = JSON.parse(plaintext);
      } catch (e) {
        return callback.call(context, err);
      }
      self._configCache = config;
      callback.call(context, null, config);
    });
  });
};

LocalStore.prototype.dump = function(config, callback, context) {
  config = sort(config);
  this.import(config, callback, context);
};

LocalStore.prototype.import = function(config, callback, context) {
  var json = JSON.stringify(config, true, 2);
  this._cipher.encrypt(json, function(error, ciphertext) {
    fs.writeFile(this._path, ciphertext, function() {
      if (callback) callback.apply(context, arguments);
    });
  }, this);
};

LocalStore.prototype.export = function(callback, context) {
  this.load(function(error, config) {
    if (error) return callback.call(context, error);
    var exported = {global: config.global, services: config.services};
    callback.call(context, null, exported);
  });
};

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

module.exports = LocalStore;

