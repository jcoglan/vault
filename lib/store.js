(function(factory) {
  var isNode      = (typeof require === 'function'),
      Vault       = isNode ? require('./vault') : window.Vault,
      crypto      = isNode ? require('crypto') : window.crypto_shim,
      async       = isNode ? require('async') : window.async,
      RemoteStore = isNode ? require('./remote_store') : window.RemoteStore;

  var Store = factory(Vault, crypto, async, RemoteStore);

  if (isNode)
    module.exports = Store;
  else
    window.Store = Store;

})(function(Vault, crypto, async, RemoteStore) {

var Store = function(adapter, cipher, options) {
  this._adapter = adapter;
  this._cipher  = cipher;
  this._cache   = options.cache !== false ? {} : null;
};

Store.BUCKETS = '0123456789abcdef'.split('');
Store.LOCAL   = 'local';

//==============================================================================
// Multi-store methods

Store.prototype.addSource = function(address, options, callback, context) {
  var remote = new RemoteStore(address, options);
  remote.connect(function(error, response) {
    if (error) return callback.call(context, error);

    this.load('sources', function(error, config) {
      if (error) return callback.call(context, error);

      response.type = remote.getType();
      Vault.extend(response, options);
      config[address] = response;

      this.dump('sources', config, callback, context);
    }, this);
  }, this);
};

Store.prototype.deleteSource = function(address, callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    this.isSource(address, function(error) {
      if (error) return callback.call(context, error);
      delete config[address];
      this.dump('sources', config, callback, context);
    }, this);
  }, this);
};

Store.prototype.isSource = function(address, callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var ok = address !== Store.LOCAL &&
             !/^__.+__$/.test(address) &&
             config[address];

    callback.call(context, ok ? null : new Error('Source "' + address + '" does not exist'));
  });
};

Store.prototype.listSources = function(callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var sourceNames = Object.keys(config)
                      .filter(function(s) { return !/^__.+__$/.test(s) });

    var current = this._source || config.__current__;
    if (!current || !config[current]) current = Store.LOCAL;

    callback.call(context, null, sourceNames.concat(Store.LOCAL), current);
  }, this);
};

Store.prototype.setDefaultSource = function(address, callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    this.isSource(address, function(error) {
      if (error) return callback.call(context, error);
      config.__current__ = address;
      this.dump('sources', config, callback, context);
    }, this);
  }, this);
};

Store.prototype.setSource = function(source) {
  this._source = source;
};

Store.prototype.showSource = function(address, callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    this.isSource(address, function(error) {
      if (error) return callback.call(context, error);
      callback.call(context, null, config[address]);
    }, this);
  }, this);
};

Store.prototype.currentStore = function(callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var current = this._source || config.__current__;
    this.getStore(current, callback, context);
  }, this);
};

Store.prototype.getName = function() {
  return Store.LOCAL;
};

Store.prototype.getStore = function(source, callback, context) {
  this.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var store = (!source || source === Store.LOCAL)
              ? this
              : new RemoteStore(source, config[source]);

    callback.call(context, null, store);
  }, this);
};

//==============================================================================

Store.prototype.listServices = function(callback, context) {
  var self = this;
  async.map(Store.BUCKETS, function(name, done) {
    self.load('services/' + name, function(error, config) {
      done(error, config && Object.keys(config));
    });
  }, function(error, services) {
    if (error) return callback.call(context, error);
    services = services.reduce(function(a, b) { return a.concat(b) });
    callback.call(context, error, services.sort());
  });
};

Store.prototype.saveGlobals = function(settings, callback, context) {
  var pathname = 'global';
  this.load(pathname, function(error, config) {
    if (error) return callback.call(context, error);

    var updated = {};
    Vault.extend(updated, settings);
    Vault.extend(updated, config);

    this.dump(pathname, updated, callback, context);
  }, this);
};

Store.prototype.deleteGlobals = function(callback, context) {
  this._adapter.remove('global', callback, context);
};

Store.prototype.saveService = function(service, settings, override, callback, context) {
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

Store.prototype.deleteService = function(service, callback, context) {
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

Store.prototype.serviceSettings = function(service, includeGlobal, callback, context) {
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

Store.prototype.import = function(settings, callback, context) {
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

Store.prototype.export = function(callback, context) {
  var exported = {services: {}},
      self     = this;

  this.load('global', function(error, config) {
    if (error) return callback.call(context, error);
    exported.global = config;
    async.forEach(Store.BUCKETS, function(name, done) {
      self.load('services/' + name, function(error, config) {
        if (!error) Vault.extend(exported.services, config);
        done(error);
      });
    }, function(error) {
      callback.call(context, error, exported);
    });
  });
};

Store.prototype.clear = function(callback, context) {
  var self = this;

  async.forEach(['global', 'services'], function(path, done) {
    self._adapter.remove(path, done);
  }, function(error) {
    callback.call(context, error);
  });
};

Store.prototype._pathForService = function(service, callback, context) {
  if (!service)
    return callback.call(context, new Error('No service name given'));

  this._cipher.deriveKeys(function(encryptionKey, signingKey) {
    var hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(new Buffer(service, 'utf8').toString('hex'));

    callback.call(context, null, 'services/' + hmac.digest('hex')[0]);
  }, this);
};

Store.prototype.load = function(pathname, callback, context) {
  if (this._cache && this._cache[pathname])
    return callback.call(context, null, this._cache[pathname]);

  this._adapter.load(pathname, function(error, content) {
    if (error) return callback.call(context, error);
    if (!content) return callback.call(context, null, {});

    this._cipher.decrypt(content, function(error, plaintext) {
      var err = new Error('Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings');
      if (error) return callback.call(context, err);

      var config;
      try {
        config = JSON.parse(plaintext);
      } catch (e) {
        return callback.call(context, err);
      }
      if (this._cache) this._cache[pathname] = config;
      callback.call(context, null, config);
    }, this);
  }, this);
};

Store.prototype.dump = function(pathname, config, callback, context) {
  config = sort(config);
  if (this._cache) this._cache[pathname] = config;

  var json = JSON.stringify(config, true, 2);

  this._cipher.encrypt(json, function(error, ciphertext) {
    this._adapter.dump(pathname, ciphertext, callback, context);
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

return Store;
});

