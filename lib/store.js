'use strict';

var storeroom = require('storeroom'),
    Promise   = storeroom.Promise,
    Vault     = require('./vault'),
    util      = require('./util');

var LOCAL_ADDRESS  = 'local';

var GLOBAL_ITEM    = '/global',
    SERVICE_DIR    = '/services/',
    SESSION_DIR    = '/sources/sessions/',
    DEFAULT_SOURCE = '/sources/default';

var REMOTE_STORAGE_CLIENT = 'Vault',
    REMOTE_STORAGE_SCOPE  = 'getvau.lt',
    REMOTE_STORAGE_TYPE   = 'remotestorage';

var Store = function(adapter, password, name) {
  this._name      = name || LOCAL_ADDRESS;
  this._password  = password;
  this._storeroom = storeroom.createStore({adapter: adapter, password: password});
  this._remotes   = {};
};

//==============================================================================
// Multi-store methods

Store.prototype.addSource = function(address, options) {
  var self = this;

  return storeroom.connectRemoteStorage({
    address: address,
    client:  REMOTE_STORAGE_CLIENT,
    scope:   REMOTE_STORAGE_SCOPE,
    options: options

  }).then(function(session) {
    return self._storeroom.put(SESSION_DIR + address, {
      type:    REMOTE_STORAGE_TYPE,
      options: options,
      session: session
    });
  });
};

Store.prototype.deleteSource = function(address) {
  var storeroom = this._storeroom;

  return this.getSource(address).then(function() {
    return storeroom.remove(SESSION_DIR + address);

  }).then(function() {
    return storeroom.get(DEFAULT_SOURCE);

  }).then(function(current) {
    if (current === address)
      return storeroom.remove(DEFAULT_SOURCE);
  });
};

Store.prototype.listSources = function() {
  return Promise.all([
    this._storeroom.entries(SESSION_DIR),
    this._storeroom.get(DEFAULT_SOURCE)

  ]).then(function(results) {
    var sources = results[0].map(function(address) {
      return {address: address, current: address === results[1]};
    });

    var currentSources = sources.filter(function(s) { return s.current });

    return sources.concat({
      address: LOCAL_ADDRESS,
      current: currentSources.length === 0
    });
  });
};

Store.prototype.setDefaultSource = function(address) {
  var storeroom = this._storeroom;

  return this.getSource(address).then(function() {
    return storeroom.put(DEFAULT_SOURCE, address);
  });
};

Store.prototype.getSource = function(address) {
  if (address === LOCAL_ADDRESS) return Promise.resolve({});

  return this._storeroom.get(SESSION_DIR + address).then(function(source) {
    if (!source)
      throw new Error('Source "' + address + '" does not exist');

    return source;
  });
};

Store.prototype.setSource = function(address) {
  this._storeAddress = address;
};

Store.prototype.currentStore = function() {
  var address = this._storeAddress || this._storeroom.get(DEFAULT_SOURCE),
      self    = this;

  return Promise.resolve(address).then(function(address) {
    return address ? self.getStore(address) : self;
  });
};

Store.prototype.getName = function() {
  return this._name;
};

Store.prototype.getStore = function(address) {
  if (address === LOCAL_ADDRESS) return Promise.resolve(this);

  return this.getSource(address).then(function(source) {
    var adapter  = storeroom.createRemoteStorageAdapter(source.session),
        password = source.options.key;

    return new Store(adapter, password, address);
  });
};

//==============================================================================

Store.prototype.listServices = function() {
  return this._storeroom.findRecursive(SERVICE_DIR);
};

Store.prototype.saveGlobals = function(settings) {
  // TODO: merge get() and put() somehow to produce edits that can retry in case of conflict

  var storeroom = this._storeroom;

  return storeroom.get(GLOBAL_ITEM).then(function(saved) {
    return storeroom.put(GLOBAL_ITEM, util.assign({}, saved, settings));
  });
};

Store.prototype.deleteGlobals = function() {
  return this._storeroom.remove(GLOBAL_ITEM);
};

Store.prototype.saveService = function(service, settings) {
  // TODO: merge get() and put() somehow to produce edits that can retry in case of conflict

  var storeroom = this._storeroom,
      pathname  = SERVICE_DIR + service;

  return storeroom.get(pathname).then(function(saved) {
    var updated = util.assign({}, saved, settings);
    return storeroom.put(pathname, updated);
  });
};

Store.prototype.deleteService = function(service) {
  var storeroom = this._storeroom,
      pathname  = SERVICE_DIR + service;

  return storeroom.get(pathname).then(function(settings) {
    if (!settings)
      throw new Error('Service "' + service + '" is not configured');

    return storeroom.remove(pathname);
  });
};

Store.prototype.globalSettings = function() {
  return this._storeroom.get(GLOBAL_ITEM).then(function(v) { return v || {} });
};

Store.prototype.serviceSettings = function(service, includeGlobal) {
  // TODO: wrap this whole method in a bulk load to cache store buckets

  var global  = includeGlobal ? this.globalSettings() : null,
      service = this._storeroom.get(SERVICE_DIR + service);

  return Promise.all([global, service]).then(function(configs) {
    return configs.reduce(function(acc, value) {
      return (acc || value) && util.assign({}, acc, value);
    }, null);
  });
};

Store.prototype.import = function(settings) {
  var storeroom = this._storeroom;

  // TODO: wrap this whole method in a bulk load to cache store buckets

  var services = Object.keys(settings.services || {}).map(function(service) {
    return storeroom.put(SERVICE_DIR + service, settings.services[service]);
  });

  return Promise.all([
    storeroom.put(GLOBAL_ITEM, settings.global || {}),
    Promise.all(services)
  ]);
};

Store.prototype.export = function() {
  var exported  = {services: {}},
      storeroom = this._storeroom;

  // TODO: wrap this whole method in a bulk load to cache store buckets

  return storeroom.get(GLOBAL_ITEM).then(function(global) {
    if (global) exported.global = global;
    return storeroom.findRecursive(SERVICE_DIR);

  }).then(function(services) {
    var configs = services.map(function(service) {
      return storeroom.get(SERVICE_DIR + service);
    });

    return Promise.all([services, Promise.all(configs)]);

  }).then(function(configs) {
    configs[0].forEach(function(service, i) {
      exported.services[service] = configs[1][i];
    });

    return util.sortObject(exported);
  });
};

Store.prototype.clear = function() {
  // TODO: wrap this whole method in a bulk load to cache store buckets

  return Promise.all([
    this._storeroom.remove(GLOBAL_ITEM),
    this._storeroom.removeRecursive(SERVICE_DIR)
  ]);
};

module.exports = Store;
