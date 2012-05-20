var nopt   = require('nopt'),
    Vault  = require('../lib/vault'),
    Config = require('./config'),
    
    options = { 'config': Boolean,
                'phrase': Boolean,
                'length': Number,
                
                'lower':  Number,
                'upper':  Number,
                'alpha':  Number,
                'number': Number,
                'space':  Number,
                'dash':   Number,
                'symbol': Number,
                
                'export': String,
                'import': String
              },
    
    shorts  = { 'c': '--config',
                'p': '--phrase',
                'l': '--length',
                'e': '--export',
                'i': '--import'
              };

var CLI = function(options) {
  this._config  = new Config(options.config);
  this._out     = options.output;
  this._tty     = options.tty;
  
  this._requestPassword = options.password;
};

CLI.prototype.run = function(argv, callback, context) {
  var params  = nopt(options, shorts, argv),
      service = params.argv.remain[0];
  
  this.withPhrase(params, function() {
    if      (params.export) this._config.export(params.export, callback, context);
    else if (params.import) this._config.import(params.import, callback, context);
    else if (params.config) this.configure(service, params, callback, context);
    else                    this.generate(service, params, callback, context);
  });
};

CLI.prototype.withPhrase = function(params, callback) {
  if (!params.phrase) return callback.call(this);
  var self = this;
  
  this._requestPassword(function(password) {
    params.phrase = password;
    callback.call(self);
  });
};

CLI.prototype.configure = function(service, params, callback, context) {
  delete params.config;
  
  this._config.edit(function(settings) {
    if (service) {
      settings.services[service] = settings.services[service] || {};
      settings = settings.services[service];
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
    
    if (params.phrase === undefined)
      return callback.call(context, new Error('No passphrase given; pass `-p` or run `vault -cp`'));
    
    var vault    = new Vault(params),
        password = vault.generate(service);
    
    this._out.write(password);
    if (this._tty) this._out.write('\n');
    
    callback.call(context, null);
  }, this);
};

module.exports = CLI;

