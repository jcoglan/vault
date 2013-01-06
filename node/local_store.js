var fs     = require('fs'),
    Cipher = require('vault-cipher'),
    Vault  = require('../lib/vault');

var LocalStore = function(options) {
  this._path   = options.path;
  this._cipher = new Cipher(options.key, {format: 'base64', work: 100, salt: Vault.UUID});
};

LocalStore.prototype.clear = function(callback, context) {
  fs.unlink(this._path, function() {
    callback.apply(context, arguments);
  });
};

LocalStore.prototype.load = function(callback, context) {
  var self = this;
  fs.readFile(this._path, function(error, content) {
    if (error) return callback.call(context, null, null);

    self._cipher.decrypt(content.toString(), function(error, plaintext) {
      var err = new Error('Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings');
      if (error) return callback.call(context, err);
      var config;
      try { config = JSON.parse(plaintext); }
      catch (e) {
        return callback.call(context, err);
      }
      callback.call(context, null, config);
    });
  });
};

LocalStore.prototype.dump = function(config, callback, context) {
  this.import(JSON.stringify(config, true, 2), callback, context);
};

LocalStore.prototype.import = function(string, callback, context) {
  this._cipher.encrypt(string, function(error, ciphertext) {
    fs.writeFile(this._path, ciphertext, function() {
      callback.apply(context, arguments);
    });
  }, this);
};

LocalStore.prototype.export = function(callback, context) {
  this.load(function(error, config) {
    if (error) callback.call(context, error);
    else callback.call(context, null, config && JSON.stringify(config, true, 2));
  });
};

module.exports = LocalStore;

