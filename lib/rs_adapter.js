(function(factory) {

  var isNode = (typeof require === 'function'),

      async         = isNode ? require('async')           : window.async,
      RemoteStorage = isNode ? require('./remotestorage') : window.RemoteStorage,

      RSAdapter = factory(async, RemoteStorage);

  if (isNode)
    module.exports = RSAdapter;
  else
    Vault.RSAdapter = RSAdapter;

})(function(async, RemoteStorage) {

var RSAdapter = function(address, options) {
  this._address = address;
  this._client  = new RemoteStorage('Vault', {vault: ['r', 'w']});
  this._conn    = this._client.connect(this._address, options);
  this._path    = RSAdapter.ROOT_PATH;
};

RSAdapter.CONTENT_TYPE = 'application/vnd.vault.keychain';
RSAdapter.ROOT_PATH    = '/vault';

RSAdapter.prototype.getName = function() {
  return this._address;
};

RSAdapter.prototype.getType = function() {
  return 'remotestorage';
};

RSAdapter.prototype.authorize = function(callback, context) {
  return this._conn.authorize(callback, context);
};

RSAdapter.prototype.load = function(pathname, callback, context) {
  this._conn.get(this._path + '/' + pathname, function(error, content) {
    if (error) return callback.call(context, error);
    if (!content) return callback.call(context, null, null);
    callback.call(context, null, content.data.toString('utf8'));
  }, this);
};

RSAdapter.prototype.dump = function(pathname, content, callback, context) {
  this._conn.put(this._path + '/' + pathname, RSAdapter.CONTENT_TYPE, content, callback, context);
};

RSAdapter.prototype.remove = function(pathname, callback, context) {
  var root = this._path + '/' + pathname,
      self = this;

  if (!/\/$/.test(pathname)) return this._conn.delete(root, callback, context);

  this._conn.get(root, function(error, content) {
    if (error) return callback.call(context, error);
    if (!content || !content.data) return callback.call(context);

    var listing = JSON.parse(content.data.toString('utf8'));

    async.forEach(Object.keys(listing), function(name, done) {
      self.remove(pathname + name, done);
    }, function(error) {
      callback.call(context, error);
    });
  });
};

return RSAdapter;
});

