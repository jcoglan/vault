var nopt   = require('nopt'),
    Vault  = require('../vault'),
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

CLI.prototype.run = function(argv) {
  var params  = nopt(options, shorts, argv),
      service = params.argv.remain[0];
  
  this.withPhrase(params, function() {
    try {
      if      (params.export) this._config.export(params.export);
      else if (params.import) this._config.import(params.import);
      else if (params.config) this.configure(service, params);
      else                    this.generate(service, params);
    } catch (e) {
      this.die(e.message);
    }
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

CLI.prototype.die = function(message) {
  console.error(message);
  process.exit(1);
};

CLI.prototype.configure = function(service, params) {
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
  });
};

CLI.prototype.generate = function(service, params) {
  var serviceConfig = this._config.read(service),
      vault, password;
  
  Vault.extend(params, serviceConfig);
  
  if (params.phrase === undefined)
    this.die('No passphrase given; pass `-p` or run `vault -cp`');

  if (service === undefined)
    this.die('No service name given');

  vault    = new Vault(params);
  password = vault.generate(service);
  
  this._out.write(password);
  if (this._tty) this._out.write('\n');
};

module.exports = CLI;

