var fs    = require('fs'),
    AES   = require('./aes'),
    Vault = require('../lib/vault');

var LocalStore = function(options) {
  this._path = options.path;
  this._aes  = new AES(options.key);
};

LocalStore.prototype.clear = function(callback, context) {
  fs.unlink(this._path, function() {
    callback.apply(context, arguments);
  });
};

LocalStore.prototype.load = function(callback, context) {
  var self = this;
  fs.readFile(this._path, function(error, content) {
    if (error) return callback.call(context, null, {global: {}, services: {}});
    
    var config;
    try { config = JSON.parse(self._aes.decrypt(content.toString())); }
    catch (e) {
      error = new Error('Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings');
      return callback.call(context, error);
    }
    callback.call(context, null, config);
  });
};

LocalStore.prototype.dump = function(config, callback, context) {
  this.import(JSON.stringify(config, true, 2), callback, context);
};

LocalStore.prototype.import = function(string, callback, context) {
  fs.writeFile(this._path, this._aes.encrypt(string), function() {
    callback.apply(context, arguments);
  });
};

LocalStore.prototype.export = function(callback, context) {
  this.load(function(error, config) {
    if (error) callback.call(context, error);
    else callback.call(context, null, JSON.stringify(config, true, 2));
  });
};

module.exports = LocalStore;

