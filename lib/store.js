'use strict';

var escodb = require('./escodb'),
    Vault  = require('./vault'),
    util   = require('./util');

var GLOBAL_ITEM    = '/global',
    SERVICE_DIR    = '/services/';

var Store = function(esco) {
  this._esco = esco;
  this._task = esco.task();
};

Store.open = function(adapter, password) {
  let store = escodb.createStore({adapter: adapter, password: password});

  return store.then(function(store) {
    return new Store(store);
  });
};

Store.prototype.listServices = function(prefix) {
  var parts = prefix.split('/'),
      last  = parts.pop(),
      base  = ['', 'services'].concat(parts).concat(['']).join('/');

  return this._task.list(base).then(function(entries) {
    return entries.map(function(name) { return parts.concat([name]).join('/') });
  });
};

Store.prototype.saveGlobals = function(settings) {
  return this._task.update(GLOBAL_ITEM, function(saved) {
    return util.assign({}, saved, settings);
  });
};

Store.prototype.deleteGlobals = function() {
  return this._task.remove(GLOBAL_ITEM);
};

Store.prototype.saveService = function(service, settings) {
  var pathname = SERVICE_DIR + service;

  return this._task.update(pathname, function(saved) {
    return util.assign({}, saved, settings);
  });
};

Store.prototype.deleteService = function(service) {
  var task     = this._task,
      pathname = SERVICE_DIR + service;

  return task.get(pathname).then(function(settings) {
    if (!settings)
      throw new Error('Service "' + service + '" is not configured');

    return task.remove(pathname);
  });
};

Store.prototype.globalSettings = function() {
  return this._task.get(GLOBAL_ITEM).then(function(v) { return v || {} });
};

Store.prototype.serviceSettings = function(service, includeGlobal) {
  var global  = includeGlobal ? this.globalSettings() : null,
      service = this._task.get(SERVICE_DIR + service);

  return Promise.all([global, service]).then(function(configs) {
    return configs.reduce(function(acc, value) {
      return (acc || value) && util.assign({}, acc, value);
    }, null);
  });
};

Store.prototype.import = function(settings) {
  var task = this._task;

  var global = settings.global
             ? task.update(GLOBAL_ITEM, function() { return settings.global })
             : Promise.resolve(null);

  var services = Object.keys(settings.services || {}).map(function(service) {
    return task.update(SERVICE_DIR + service, function() {
      return settings.services[service];
    });
  });

  return Promise.all([global].concat(services));
};

Store.prototype.export = function() {
  var exported = {services: {}},
      task     = this._task;

  return task.get(GLOBAL_ITEM).then(function(global) {
    if (global) exported.global = global;
    return streamToArray(task.find(SERVICE_DIR));

  }).then(function(services) {
    var configs = services.map(function(service) {
      return task.get(SERVICE_DIR + service);
    });

    return Promise.all([services, Promise.all(configs)]);

  }).then(function(configs) {
    configs[0].forEach(function(service, i) {
      exported.services[service] = configs[1][i];
    });

    return util.sortObject(exported);
  });
};

async function streamToArray(stream) {
  let items = []
  for await (let item of stream) {
    items.push(item)
  }
  return items
}

Store.prototype.clear = function() {
  return Promise.all([
    this._task.remove(GLOBAL_ITEM),
    this._task.prune(SERVICE_DIR)
  ]);
};

module.exports = Store;
