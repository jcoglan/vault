var Vault = require('../lib/vault'),
    remoteStorage = require('./remotestorage');

var RemoteStore = function() {
  this._client = new remoteStorage('getvau.lt', ['vault:rw']);
  this._user   = 'me@local.dev';
  this._conn   = this._client.connect(this._user, {browser: 'elinks', inline: true});
};

RemoteStore.prototype.export = function(callback, context) {
  // TODO
};

RemoteStore.prototype.import = function(json, callback, context) {
  // TODO
};

RemoteStore.prototype.listServices = function(callback, context) {
  this._conn.get('/vault/services/', function(error, listing) {
    if (error) return callback.call(context, error);
    var services = Object.keys(JSON.parse(listing.content.toString('utf8')));
    callback.call(context, null, services);
  });
};

RemoteStore.prototype.saveGlobals = function(settings, callback, context) {
  this._save('/vault/global', settings, callback, context);
};

RemoteStore.prototype.saveService = function(service, settings, callback, context) {
  this._save('/vault/services/' + service, settings, callback, context);
};

RemoteStore.prototype.serviceSettings = function(service, callback, context) {
  this._read('/vault/global', function(error, global) {
    this._read('/vault/services/' + service, function(error, local) {
      Vault.extend(local, global);
      callback.call(context, null, local);
    }, this);
  }, this);
};

RemoteStore.prototype._save = function(path, settings, callback, context) {
  this._read(path, function(error, saved) {
    if (error) return callback.call(context, error);

    var updated = {};
    Vault.extend(updated, settings);
    Vault.extend(updated, saved);

    var payload = JSON.stringify(updated, true, 2);

    this._conn.put(path, 'application/json', payload, callback, context);
  }, this);
};

RemoteStore.prototype._read = function(path, callback, context) {
  this._conn.get(path, function(error, item) {
    if (error) return callback.call(context, error);

    var payload = item
                ? JSON.parse(item.content.toString('utf8'))
                : {};

    callback.call(context, null, payload);
  });
};
 
module.exports = RemoteStore;

