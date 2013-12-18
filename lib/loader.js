(function(factory) {
  var isNode = (typeof require === 'function'),

      crypto = isNode ? require('crypto')       : window.crypto_shim,
      Cipher = isNode ? require('vault-cipher') : window.Cipher,
      Vault  = isNode ? require('./vault')      : window.Vault,

      Loader = factory(crypto, Cipher, Vault);

  if (isNode)
    module.exports = Loader;
  else
    window.Store = Loader;

})(function(crypto, Cipher, Vault) {

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
  this._cipher  = new Cipher(key, {format: 'base64', input: 'binary', salt: Vault.UUID, work: 100});
  this._cache   = (options.cache !== false) ? {} : null;
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

    var err = new Error('Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings'),
        config;

    this._cipher.decrypt(content, function(error, result) {
      if (error) return callback.call(context, err);

      var buffer     = new Buffer(result, 'binary'),
          size       = Cipher.KEY_SIZE,
          keys       = [buffer.slice(0, size), buffer.slice(size, 2 * size)],
          ciphertext = buffer.slice(2 * size, buffer.length),
          cipher     = new Cipher(keys, {format: null});

      cipher.decrypt(ciphertext, function(error, plaintext) {
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

  var json   = JSON.stringify(config, true, 2),
      keys   = Cipher.randomKeys(),
      cipher = new Cipher(keys, {format: null});

  cipher.encrypt(json, function(error, ciphertext) {
    var buffer = new Buffer(keys[0].length + keys[1].length + ciphertext.length);

    keys[0].copy(buffer);
    keys[1].copy(buffer, keys[0].length);
    ciphertext.copy(buffer, keys[0].length + keys[1].length);

    this._cipher.encrypt(buffer, function(error, wrapper) {
      this._adapter.dump(pathname, wrapper, callback, context);
    }, this);
  }, this);
};

Loader.prototype.remove = function(pathname, callback, context) {
  return this._adapter.remove(pathname, callback, context);
};

return Loader;
});

