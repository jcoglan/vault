(function(factory) {
  var isNode = (typeof require === 'function'),

      async  = isNode ? require('async')        : window.async,
      crypto = isNode ? require('crypto')       : window.crypto_shim,
      Cipher = isNode ? require('vault-cipher') : window.Cipher,
      Vault  = isNode ? require('./vault')      : window.Vault,

      Loader = factory(async, crypto, Cipher, Vault);

  if (isNode)
    module.exports = Loader;
  else
    Vault.Loader = Loader;

})(function(async, crypto, Cipher, Vault) {

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

var Loader = function(adapter, key, options) {
  this._adapter = adapter;
  this._cipher  = new Cipher(key, {format: 'binary', input: 'binary', salt: Vault.UUID, work: 100});
  this._cache   = (options.cache !== false) ? {} : null;
  this._queues  = {};
};

Loader.BUCKETS = '0123456789abcdef'.split('');
Loader.LOCAL   = 'local';

Loader.prototype.getName = function() {
  return this._adapter.getName();
};

Loader.prototype.pathForService = function(service, callback, context) {
  if (!service)
    return callback.call(context, new Error('No service name given'));

  this._cipher.deriveKeys(function(encryptionKey, signingKey) {
    var hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(service);
    callback.call(context, null, 'services/' + hmac.digest('hex')[0]);
  }, this);
};

Loader.prototype.load = function(pathname, callback, context) {
  if (this._cache && this._cache[pathname])
    return callback.call(context, null, this._cache[pathname]);

  this._adapter.load(pathname, function(error, content) {
    if (error) return callback.call(context, error);
    if (!content) return callback.call(context, null, {});

    content = new Buffer(content, 'base64');

    var err      = new Error('Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings'),
        size     = Cipher.KEY_SIZE,
        encSize  = Cipher.ENCRYPTED_KEYPAIR_SIZE;

    if (content.length < encSize) return callback.call(context, err);

    var keyBlock = content.slice(0, encSize),
        payload  = content.slice(encSize, content.length);

    this._cipher.decrypt(keyBlock, function(error, keyBlock) {
      if (error) return callback.call(context, err);

      keyBlock = new Buffer(keyBlock, 'binary');

      var keys   = [keyBlock.slice(0, size), keyBlock.slice(size, 2 * size)];
          cipher = new Cipher(keys, {format: 'binary'});

      cipher.decrypt(payload, function(error, plaintext) {
        if (error) return callback.call(context, err);

        try { config = JSON.parse(plaintext) }
        catch (e) { return callback.call(context, err) }

        if (this._cache) this._cache[pathname] = config;
        callback.call(context, null, config);
      }, this);
    }, this);
  }, this);
};

Loader.prototype.dump = function(pathname, config, callback, context) {
  config = sort(config);
  if (this._cache) this._cache[pathname] = config;

  var json     = JSON.stringify(config, true, 2),
      keys     = Cipher.randomKeys(),
      keyBlock = Cipher.concatBuffer(keys),
      cipher   = new Cipher(keys, {format: 'binary'});

  this._enqueue(pathname, function(done) {
    cipher.encrypt(json, function(error, ciphertext) {
      this._cipher.encrypt(keyBlock, function(error, keyBlock) {
        ciphertext = new Buffer(ciphertext, 'binary');
        keyBlock   = new Buffer(keyBlock, 'binary');

        var wrapper = Cipher.concatBuffer([keyBlock, ciphertext]);

        this._adapter.dump(pathname, wrapper.toString('base64'), function(error) {
          callback.call(context, error);
          done(error);
        });
      }, this);
    }, this);
  });
};

Loader.prototype.remove = function(pathname, callback, context) {
  this._enqueue(pathname, function(done) {
    this._adapter.remove(pathname, function(error) {
      callback.call(context, error);
      done(error);
    });
  });
};

Loader.prototype._enqueue = function(pathname, task) {
  var q    = this._queues,
      self = this;

  q[pathname] = q[pathname] || async.queue(function(task, cb) { task.call(self, cb) }, 1);
  q[pathname].push(task);
};

Loader.sort = sort;
return Loader;
});

