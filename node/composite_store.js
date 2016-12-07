'use strict';

var Promise = require('storeroom').Promise,
    util    = require('../lib/util');

var slice = Array.prototype.slice;

var CompositeStore = function(local) {
  this._local = local;
};

var local = function(method) {
  CompositeStore.prototype[method] = function() {
    return this._local[method].apply(this._local, arguments);
  };
};

local('addSource');
local('deleteSource');
local('listSources');
local('setDefaultSource');
local('getSource');
local('currentStore');

CompositeStore.prototype.setSource = function(address) {
  this._address = address;
  this._local.setSource(address);
};

var single = function(method) {
  CompositeStore.prototype[method] = function() {
    var args = slice.call(arguments);

    return this._local.currentStore().then(function(store) {
      var result = store[method].apply(store, args);
      return Promise.all([store.getName(), result]);
    });
  };
};

single('saveGlobals');
single('deleteGlobals');
single('saveService');
single('deleteService');
single('import');
single('export');
single('clear');

CompositeStore.prototype.listServices = function() {
  var local   = this._local,
      sources = this._address ? [this._address] : local.listSources();

  return Promise.resolve(sources).then(function(sources) {
    var stores = sources.map(function(source) { return local.getStore(source.address) });
    return Promise.all(stores);

  }).then(function(stores) {
    var services = stores.map(function(store) { return store.listServices() });
    return Promise.all(services);

  }).then(function(services) {
    services = services.reduce(function(a, b) { return a.concat(b) });
    return util.unique(services);
  });
};

CompositeStore.prototype.serviceSettings = function(service, includeGlobal) {
  if (this._address)
    return this._local.currentStore().then(function(store) {
      return store.serviceSettings(service, includeGlobal);
    });

  var local   = this._local,
      stores  = {},
      results = {},
      addresses,
      current,
      selected;

  return local.listSources().then(function(sources) {
    addresses = sources.map(function(source) { return source.address });
    current   = sources.filter(function(source) { return source.current })[0].address;

    var _stores = addresses.map(function(address) { return local.getStore(address) });
    return Promise.all(_stores);

  }).then(function(_stores) {
    addresses.forEach(function(address, i) { stores[address] = _stores[i] });

    var settings = _stores.map(function(store) { return store.serviceSettings(service, false) });
    return Promise.all(settings);

  }).then(function(settings) {
    addresses.forEach(function(address, i) {
      var setting = settings[i];
      if (setting) results[address] = setting;
    });

    var available = Object.keys(results);
    selected = (available.length === 1) ? available[0] : current;

    return includeGlobal ? stores[selected].globalSettings() : null;
      
  }).then(function(global) {
    return util.assign({}, global, results[selected]);
  });
};

module.exports = CompositeStore;
