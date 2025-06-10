'use strict';

var storeroom = require('storeroom'),
    Vault     = require('./vault'),
    util      = require('./util');

var GLOBAL_ITEM    = '/global',
    SERVICE_DIR    = '/services/';

var Store = function(adapter, password) {
  this._password  = password;
  this._storeroom = storeroom.createStore({adapter: adapter, password: password});
};

Store.prototype.listServices = function(prefix) {
  var parts = prefix.split('/'),
      last  = parts.pop(),
      base  = ['', 'services'].concat(parts).concat(['']).join('/');

  return this._storeroom.entries(base).then(function(entries) {
    return entries.map(function(name) { return parts.concat([name]).join('/') });
  });
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

  var global = settings.global
             ? storeroom.put(GLOBAL_ITEM, settings.global)
             : Promise.resolve(null);

  var services = Object.keys(settings.services || {}).map(function(service) {
    return storeroom.put(SERVICE_DIR + service, settings.services[service]);
  });

  return Promise.all([global].concat(services));
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
