var crypto         = require('crypto'),
    fs             = require('fs'),
    path           = require('path'),
    mkdirp         = require('mkdirp'),
    rmrf           = require('rimraf'),
    async          = require('async'),
    Cipher         = require('vault-cipher'),
    Vault          = require('../lib/vault'),
    CompositeStore = require('./composite_store');

var LocalStore = function(options) {
  this._path   = options.path;
  this._cipher = new Cipher(options.key, {format: 'base64', work: 100, salt: Vault.UUID});
  this._cache  = options.cache !== false ? {} : null;
};

LocalStore.BUCKETS = '0123456789abcdef'.split('');

LocalStore.prototype.composite = function() {
  return new CompositeStore(this);
};

//==============================================================================
// Multi-store methods

LocalStore.LOCAL = 'local';

LocalStore.prototype.getName = function() {
  return LocalStore.LOCAL;
};

LocalStore.prototype.listSources = function(callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var sourceNames = Object.keys(config)
                      .filter(function(s) { return !/^__.+__$/.test(s) });

    var current = this._source || config.__current__;
    if (!current || !config[current]) current = LocalStore.LOCAL;

    callback.call(context, null, sourceNames.concat(LocalStore.LOCAL), current);
  }, this);
};

LocalStore.prototype.currentStore = function(callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var current = this._source || config.__current__;
    this.getStore(current, callback, context);
  }, this);
};

LocalStore.prototype.getStore = function(source, callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var store = (!source || source === LocalStore.LOCAL)
              ? this
              : new RemoteStore(source, config.sources[source]);

    callback.call(context, null, store);
  }, this);
};

//==============================================================================

LocalStore.prototype.listServices = function(callback, context) {
  var self = this;
  async.map(LocalStore.BUCKETS, function(name, done) {
    self.load(path.join('services', name), function(error, config) {
      done(error, config && Object.keys(config));
    });
  }, function(error, services) {
    if (error) return callback.call(context, error);
    services = services.reduce(function(a, b) { return a.concat(b) });
    callback.call(context, error, services.sort());
  });
};

LocalStore.prototype.saveGlobals = function(settings, callback, context) {
  var pathname = 'global';
  this.load(pathname, function(error, config) {
    if (error) return callback.call(context, error);

    var updated = {};
    Vault.extend(updated, settings);
    Vault.extend(updated, config);

    this.dump(pathname, updated, callback, context);
  }, this);
};

LocalStore.prototype.deleteGlobals = function(callback, context) {
  rmrf(path.join(this._path, 'global'), function(error) {
    callback.call(context, error);
  });
};

LocalStore.prototype.saveService = function(service, settings, override, callback, context) {
  this._pathForService(service, function(error, pathname) {
    if (error) return callback.call(error);

    this.load(pathname, function(error, config) {
      if (error) return callback.call(context, error);

      var saved   = config[service] || {},
          updated = {};

      if (override) {
        updated = settings;
      } else {
        Vault.extend(updated, settings);
        Vault.extend(updated, saved);
      }
      config[service] = updated;

      this.dump(pathname, config, callback, context);
    }, this);
  }, this);
};

LocalStore.prototype.deleteService = function(service, callback, context) {
  this._pathForService(service, function(error, pathname) {
    if (error) return callback.call(context, error);

    this.load(pathname, function(error, config) {
      if (error) return callback.call(context, error);

      if (!config.hasOwnProperty(service))
        return callback.call(context, new Error('Service "' + service + '" is not configured'));

      delete config[service];
      this.dump(pathname, config, callback, context);
    }, this);
  }, this);
};

LocalStore.prototype.serviceSettings = function(service, includeGlobal, callback, context) {
  var self = this;

  this._pathForService(service, function(error, pathname) {
    if (error) return callback.call(context, error);

    async.parallel({
      global: function(done) {
        if (!includeGlobal) return done(null, {});
        self.load('global', done);
      },
      service: function(done) {
        self.load(pathname, done);
      }
    }, function(error, stored) {
      if (error) return callback.call(context, error);

      var settings = {};
      Vault.extend(settings, stored.service[service] || {});
      Vault.extend(settings, stored.global);

      callback.call(context, null, settings);
    });
  });
};

LocalStore.prototype.import = function(settings, callback, context) {
  var self = this;

  this.dump('global', settings.global || {}, function(error) {
    if (error) return callback.call(context, error);

    var services = Object.keys(settings.services || {});

    async.forEachSeries(services, function(service, done) {
      self.saveService(service, settings.services[service], true, done);
    }, function(error){
      callback.call(context, error);
    });
  }, this);
};

LocalStore.prototype.export = function(callback, context) {
  var exported = {services: {}},
      self     = this;

  this.load('global', function(error, config) {
    if (error) return callback.call(context, error);
    exported.global = config;
    async.forEach(LocalStore.BUCKETS, function(name, done) {
      self.load(path.join('services', name), function(error, config) {
        if (!error) Vault.extend(exported.services, config);
        done(error);
      });
    }, function(error) {
      callback.call(context, error, exported);
    });
  });
};

LocalStore.prototype.clear = function(callback, context) {
  var servicesPath = path.join(this._path, 'services'),
      globalPath   = path.join(this._path, 'global');

  async.forEach([servicesPath, globalPath], rmrf, function(error) {
    callback.call(context, error);
  });
};

LocalStore.prototype._pathForService = function(service, callback, context) {
  if (!service)
    return callback.call(context, new Error('No service name given'));

  this._cipher.deriveKeys(function(encryptionKey, signingKey) {
    var hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(new Buffer(service, 'utf8').toString('hex'));

    callback.call(context, null, path.join('services', hmac.digest('hex')[0]));
  }, this);
};

LocalStore.prototype.load = function(pathname, callback, context) {
  if (this._cache && this._cache[pathname])
    return callback.call(context, null, this._cache[pathname]);

  var fullPath = path.join(this._path, pathname),
      self     = this;

  fs.readFile(fullPath, function(error, content) {
    if (error) return callback.call(context, null, {});

    self._cipher.decrypt(content.toString(), function(error, plaintext) {
      var err = new Error('Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings');
      if (error) return callback.call(context, err);

      var config;
      try {
        config = JSON.parse(plaintext);
      } catch (e) {
        return callback.call(context, err);
      }
      if (self._cache) self._cache[pathname] = config;
      callback.call(context, null, config);
    });
  });
};

LocalStore.prototype.dump = function(pathname, config, callback, context) {
  config = sort(config);
  if (this._cache) this._cache[pathname] = config;

  var fullPath = path.join(this._path, pathname),
      json     = JSON.stringify(config, true, 2);

  this._cipher.encrypt(json, function(error, ciphertext) {
    mkdirp(path.dirname(fullPath), function() {
      fs.writeFile(fullPath, ciphertext, function() {
        if (callback) callback.apply(context, arguments);
      });
    });
  }, this);
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

