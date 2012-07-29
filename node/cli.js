var fs         = require('fs'),
    nopt       = require('nopt'),
    Vault      = require('../lib/vault'),
    LocalStore = require('./local_store'),
    Config     = require('../lib/config'),
    
    options = { 'config': Boolean,
                'phrase': Boolean,
                'key':    Boolean,
                'length': Number,
                'repeat': Number,
                
                'lower':  Number,
                'upper':  Number,
                'number': Number,
                'space':  Number,
                'dash':   Number,
                'symbol': Number,
                
                'export': String,
                'import': String
              },
    
    shorts  = { 'c': '--config',
                'p': '--phrase',
                'k': '--key',
                'l': '--length',
                'r': '--repeat',
                'e': '--export',
                'i': '--import'
              };

var CLI = function(options) {
  this._storage = new LocalStore(options.config);
  this._config  = new Config(this._storage);
  this._out     = options.output;
  this._tty     = options.tty;
  
  this._requestPassword = options.password;
  this._signData = options.sshSign;
};

CLI.prototype.run = function(argv, callback, context) {
  var params  = nopt(options, shorts, argv),
      service = params.argv.remain[0];
  
  if (params.export) return this.export(params.export, callback, context);
  if (params.import) return this.import(params.import, callback, context);
  
  this.withPhrase(params, function(error) {
    if (error) return callback.call(context, error);
    
    if (params.config) this.configure(service, params, callback, context);
    else               this.generate(service, params, callback, context);
  });
};

CLI.prototype.withPhrase = function(params, callback) {
  var self    = this,
      message = params.config ? null : Vault.UUID;
  
  if (params.key)
    return this._signData(params.key, message, function(error, result) {
      if (result) {
        params.phrase = result.signature;
        params.key    = result.key;
        params.signed = true;
      }
      callback.call(self, error);
    });
    
  if (!params.phrase) return callback.call(this);
  
  this._requestPassword(function(password) {
    params.phrase = password;
    callback.call(self);
  });
};

CLI.prototype.export = function(path, callback, context) {
  this._storage.export(function(error, json) {
    if (error) return callback.call(context, error);
    json = json || JSON.stringify({global: {}, services: {}}, true, 2);
    fs.writeFile(path, json, function() {
      callback.apply(context, arguments);
    });
  });
};

CLI.prototype.import = function(path, callback, context) {
  var self = this;
  fs.readFile(path, function(error, content) {
    if (error) return callback.call(context, error);
    self._storage.import(content.toString(), callback, context);
  });
};

CLI.prototype.configure = function(service, params, callback, context) {
  delete params.config;
  delete params.signed;
  if (params.key) delete params.phrase;
  
  this._config.edit(function(settings) {
    if (service) {
      settings.services[service] = settings.services[service] || {};
      settings = settings.services[service];
    } else {
      settings = settings.global;
    }
    
    for (var key in params) {
      if (typeof params[key] !== 'object')
        settings[key] = params[key];
    }
  }, callback, context);
};

CLI.prototype.generate = function(service, params, callback, context) {
  this._config.read(service, function(error, serviceConfig) {
    if (error) return callback.call(context, error);
    Vault.extend(params, serviceConfig);
    
    if (service === undefined)
      return callback.call(context, new Error('No service name given'));
    
    var complete = function() {
      if (params.phrase === undefined)
        return callback.call(context, new Error('No passphrase given; pass `-p` or run `vault -cp`'));
      
      var vault = new Vault(params), password;
      try {
        password = vault.generate(service);
      } catch (e) {
        return callback.call(context, e);
      }
      
      this._out.write(password);
      if (this._tty) this._out.write('\n');
      
      callback.call(context, null);
    };
    
    var self = this;
    
    if (params.key && !params.signed)
      this._signData(params.key, Vault.UUID, function(error, result) {
        params.phrase = result.signature;
        complete.call(self);
      });
    else
      complete.call(self);
  }, this);
};

module.exports = CLI;

