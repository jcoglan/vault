(function(factory) {
  var isNode = (typeof require === 'function'),

      async     = isNode ? require('async')        : window.async,
      Vault     = isNode ? require('./vault')      : window.Vault,
      Loader    = isNode ? require('./loader')     : Vault.Loader,
      RSAdapter = isNode ? require('./rs_adapter') : Vault.RSAdapter,

      Store = factory(async, Vault, Loader, RSAdapter);

  if (isNode)
    module.exports = Store;
  else
    Vault.Store = Store;

})(function(async, Vault, Loader, RSAdapter) {

var Store = function(adapter, key, options) {
  this._loader  = new Loader(adapter, key, options);
  this._remotes = {};
};

//==============================================================================
// Multi-store methods

Store.prototype.addSource = function(address, options, callback, context) {
  var remote = new RSAdapter(address, options);

  remote.authorize(function(error, response) {
    if (error) return callback.call(context, error);

    this._loader.load('sources', function(error, config) {
      if (error) return callback.call(context, error);

      response.address = address;
      response.type    = remote.getType();

      Vault.extend(response, options);
      config[address] = response;

      this._loader.dump('sources', config, callback, context);
    }, this);
  }, this);
};

Store.prototype.deleteSource = function(address, callback, context) {
  this._loader.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    this.isSource(address, function(error) {
      if (error) return callback.call(context, error);
      delete config[address];
      this._loader.dump('sources', config, callback, context);
    }, this);
  }, this);
};

Store.prototype.isSource = function(address, callback, context) {
  this._loader.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var ok = address !== Loader.LOCAL &&
             !/^__.+__$/.test(address) &&
             config[address];

    callback.call(context, ok ? null : new Error('Source "' + address + '" does not exist'));
  });
};

Store.prototype.listSources = function(callback, context) {
  this._loader.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var sourceNames = Object.keys(config)
                      .filter(function(s) { return !/^__.+__$/.test(s) });

    var current = this._source || config.__current__;
    if (!current || !config[current]) current = Loader.LOCAL;

    callback.call(context, null, sourceNames.concat(Loader.LOCAL), current);
  }, this);
};

Store.prototype.setDefaultSource = function(address, callback, context) {
  this._loader.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    this.isSource(address, function(error) {
      if (error) return callback.call(context, error);
      config.__current__ = address;
      this._loader.dump('sources', config, callback, context);
    }, this);
  }, this);
};

Store.prototype.setSource = function(source) {
  this._source = source;
};

Store.prototype.showSource = function(address, callback, context) {
  this._loader.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    this.isSource(address, function(error) {
      if (error) return callback.call(context, error);
      callback.call(context, null, config[address]);
    }, this);
  }, this);
};

Store.prototype.currentStore = function(callback, context) {
  this._loader.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var current = this._source || config.__current__;
    this.getStore(current, callback, context);
  }, this);
};

Store.prototype.getName = function() {
  return this._loader.getName();
};

Store.prototype.getStore = function(source, callback, context) {
  this._loader.load('sources', function(error, config) {
    if (error) return callback.call(context, error);

    var store = (!source || source === Loader.LOCAL)
              ? this
              : this._getRemote(source, config[source]);

    callback.call(context, null, store);
  }, this);
};

Store.prototype._getRemote = function(address, options) {
  if (this._remotes[address]) return this._remotes[address];

  var remote = new RSAdapter(address, options),
      store  = new Store(remote, options.key, {});

  return this._remotes[address] = store;
};

//==============================================================================

Store.prototype.listServices = function(callback, context) {
  var self = this;
  async.map(Loader.BUCKETS, function(name, done) {
    self._loader.load('services/' + name, function(error, config) {
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
  this._loader.load(pathname, function(error, config) {
    if (error) return callback.call(context, error);

    var updated = {};
    Vault.extend(updated, settings);
    Vault.extend(updated, config);

    this._loader.dump(pathname, updated, callback, context);
  }, this);
};

Store.prototype.deleteGlobals = function(callback, context) {
  this._loader.remove('global', callback, context);
};

Store.prototype.saveService = function(service, settings, override, callback, context) {
  this._loader.pathForService(service, function(error, pathname) {
    if (error) return callback.call(error);

    this._loader.load(pathname, function(error, config) {
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

      this._loader.dump(pathname, config, callback, context);
    }, this);
  }, this);
};

Store.prototype.deleteService = function(service, callback, context) {
  this._loader.pathForService(service, function(error, pathname) {
    if (error) return callback.call(context, error);

    this._loader.load(pathname, function(error, config) {
      if (error) return callback.call(context, error);

      if (!config.hasOwnProperty(service))
        return callback.call(context, new Error('Service "' + service + '" is not configured'));

      delete config[service];
      this._loader.dump(pathname, config, callback, context);
    }, this);
  }, this);
};

Store.prototype.serviceSettings = function(service, includeGlobal, callback, context) {
  var self = this;

  this._loader.pathForService(service, function(error, pathname) {
    if (error) return callback.call(context, error);

    async.parallel({
      global: function(done) {
        if (!includeGlobal) return done(null, {});
        self._loader.load('global', done);
      },
      service: function(done) {
        self._loader.load(pathname, done);
      }
    }, function(error, stored) {
      if (error) return callback.call(context, error);
      if (!includeGlobal) return callback.call(context, null, stored.service[service] || null);

      var settings = {};
      Vault.extend(settings, stored.service[service] || {});
      Vault.extend(settings, stored.global);

      callback.call(context, null, settings);
    });
  });
};

Store.prototype.import = function(settings, callback, context) {
  var self = this;

  this._loader.dump('global', settings.global || {}, function(error) {
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

  this._loader.load('global', function(error, config) {
    if (error) return callback.call(context, error);
    exported.global = config;
    async.forEach(Loader.BUCKETS, function(name, done) {
      self._loader.load('services/' + name, function(error, config) {
        if (!error) Vault.extend(exported.services, config);
        done(error);
      });
    }, function(error) {
      callback.call(context, error, Loader.sort(exported));
    });
  });
};

Store.prototype.clear = function(callback, context) {
  var self = this;

  async.forEach(['global', 'services/'], function(path, done) {
    self._loader.remove(path, done);
  }, function(error) {
    callback.call(context, error);
  });
};

return Store;
});

