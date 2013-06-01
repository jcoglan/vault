(function(factory) {
  var isNode = (typeof module !== 'undefined'),
      keys   = Object.keys || this.keys,
      Vault  = isNode ? require('./vault') : this.Vault,

      remoteStorage = isNode ? require('./remotestorage') : this.remoteStorage;

  var RemoteStore = factory(keys, Vault, remoteStorage);
  if (isNode)
    module.exports = RemoteStore;
  else
    this.RemoteStore = RemoteStore;

})(function(keys, Vault, remoteStorage) {

var RemoteStore = function(address, options) {
  this._path    = '/vault';
  this._client  = new remoteStorage('Vault', {vault: ['r', 'w']});
  this._address = address;
  this._conn    = this._client.connect(this._address, options);
};

RemoteStore.prototype.getName = function() {
  return this._address;
};

RemoteStore.prototype.getType = function() {
  return 'remotestorage';
};

RemoteStore.prototype.decode = function(string) {
  return string.replace(/%(..)/g, function(m, a) {
    return String.fromCharCode(parseInt(a, 16));
  });
};

RemoteStore.prototype.encode = function(string) {
  return string.replace(/[^a-z0-9\%\.\-\_]/ig, function(m) {
    return '%' + m.charCodeAt(0).toString(16).toUpperCase();
  });
};

RemoteStore.prototype.connect = function(callback, context) {
  this._conn.authorize(callback, context);
};

RemoteStore.prototype.clear = function(callback, context) {
  this._recursiveDelete(this._path + '/', callback, context);
};

RemoteStore.prototype._recursiveDelete = function(dirname, callback, context) {
  this._conn.get(dirname, function(error, listing) {
    if (error) return callback.call(context, error);
    if (!listing) return callback.call(context);

    var entries  = keys(JSON.parse(listing.content.toString('utf8'))),
        length   = entries.length,
        complete = 0,
        called   = false;

    if (length === 0) return callback.call(context);

    var ping = function(error) {
      complete += 1;
      if (complete === length || error) {
        if (!called) callback.call(context, error);
        called = true;
      }
    };

    for (var i = 0; i < length; i++) {
      if (/\/$/.test(entries[i]))
        this._recursiveDelete(dirname + entries[i], ping, this);
      else
        this._conn.delete(dirname + entries[i], ping, this);
    }
  }, this);
};

RemoteStore.prototype.import = function(settings, callback, context) {
  var size = Object.keys(settings.services).length;

  this.saveGlobals(settings.global, function(error) {
    if (error || size === 0) return callback.call(context, error);

    for (var key in settings.services)
      this.saveService(key, settings.services[key], function(err) {
        error = error || err;
        size -= 1;
        if (size === 0) callback.call(context, error);
      }, this);
  }, this);
};

RemoteStore.prototype.export = function(callback, context) {
  var config = {global: {}, services: {}};

  this._conn.get(this._path + '/global', function(error, item) {
    if (error) return callback.call(context, error);
    if (item) config.global = JSON.parse(item.content.toString('utf8'));

    this.listServices(function(error, services) {
      if (error) return callback.call(context, error);
      var size = services.length;
      if (size === 0) return callback.call(context, null, config);

      for (var i = 0, n = size; i < n; i++) (function(i) {
        this._conn.get(this._path + '/services/' + this.encode(services[i]), function(err, item) {
          if (err)
            error = err;
          else
            config.services[services[i]] = JSON.parse(item.content.toString('utf8'));

          size -= 1;
          if (size === 0) callback.call(context, null, config);
        });
      }).call(this, i);
    }, this);
  }, this);
};

RemoteStore.prototype.listServices = function(callback, context) {
  this._conn.get(this._path + '/services/', function(error, listing) {
    if (error) return callback.call(context, error);

    var json     = listing ? listing.content.toString('utf8') : '{}',
        services = keys(JSON.parse(json));

    for (var i = 0, n = services.length; i < n; i++)
      services[i] = this.decode(services[i]);

    callback.call(context, null, services.sort());
  }, this);
};

RemoteStore.prototype.saveGlobals = function(settings, callback, context) {
  this._save(this._path + '/global', settings, callback, context);
};

RemoteStore.prototype.saveService = function(service, settings, callback, context) {
  this._save(this._path + '/services/' + this.encode(service), settings, callback, context);
};

RemoteStore.prototype.deleteService = function(service, callback, context) {
  this._conn.delete(this._path + '/services/' + this.encode(service), callback, context);
};

RemoteStore.prototype.serviceSettings = function(service, includeGlobal, callback, context) {
  this._read(this._path + '/services/' + this.encode(service), function(error, local) {
    if (error) return callback.call(context, error);

    if (!includeGlobal && !local)
      return callback.call(context, null, null);

    this._read(this._path + '/global', function(error, global) {
      var merged = local || {};
      Vault.extend(merged, global || {});
      callback.call(context, null, merged);
    }, this);
  }, this);
};

RemoteStore.prototype._save = function(path, settings, callback, context) {
  this._read(path, function(error, saved) {
    if (error) return callback.call(context, error);

    var updated = {};
    Vault.extend(updated, settings);
    Vault.extend(updated, saved || {});

    var payload = JSON.stringify(updated, true, 2);

    this._conn.put(path, 'application/json', payload, callback, context);
  }, this);
};

RemoteStore.prototype._read = function(path, callback, context) {
  this._conn.get(path, function(error, item) {
    if (error) return callback.call(context, error);

    var payload = item
                ? JSON.parse(item.content.toString('utf8'))
                : null;

    callback.call(context, null, payload);
  });
};
 
return RemoteStore;
});

