var fs         = require('fs'),
    path       = require('path'),
    nopt       = require('nopt'),
    Vault      = require('../lib/vault'),
    LocalStore = require('./local_store'),
    Config     = require('../lib/config'),

    options = { 'config':   Boolean,
                'phrase':   Boolean,
                'key':      Boolean,
                'length':   Number,
                'repeat':   Number,

                'lower':    Number,
                'upper':    Number,
                'number':   Number,
                'space':    Number,
                'dash':     Number,
                'symbol':   Number,

                'export':   String,
                'import':   String,

                'initpath': Boolean,
                'cmplt':    String
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
  this._selectKey = options.selectKey;
  this._signData = options.sign;
};

CLI.prototype.run = function(argv, callback, context) {
  var params  = nopt(options, shorts, argv),
      service = params.argv.remain[0];

  if (params.initpath) {
    this._out.write(path.resolve(__dirname + '/scripts/init'));
    return callback.call(context);
  }

  if (params.cmplt !== undefined)
    return this.complete(params.cmplt, callback, context);

  this.withPhrase(params, function() {
    if      (params.export) this.export(params.export, callback, context);
    else if (params.import) this.import(params.import, callback, context);
    else if (params.config) this.configure(service, params, callback, context);
    else                    this.generate(service, params, callback, context);
  });
};

CLI.prototype.complete = function(word, callback, context) {
  if (word === 'true') word = '--';
  if (/^-/.test(word)) {
    var names = Object.keys(options).map(function(o) { return '--' + o });
    names = names.filter(function(n) { return n.indexOf(word) === 0 });
    this._out.write(names.sort().join('\n'));
    callback.call(context);
  } else {
    this._config.list(function(error, services) {
      if (error) return callback.call(context, new Error('\n' + error.message));
      services = services.filter(function(s) { return s.indexOf(word) === 0 });
      this._out.write(services.sort().join('\n'));
      callback.call(context, error);
    }, this);
  }
};

CLI.prototype.withPhrase = function(params, callback) {
  var self    = this,
      message = params.config ? null : Vault.UUID;

  params.input = {key: !!params.key, phrase: !!params.phrase};

  if (params.key)
    return this._selectKey(function(error, key) {
      params.key = key;
      callback.call(self, error);
    });

  if (params.phrase)
    return this._requestPassword(function(password) {
      params.phrase = password;
      callback.call(self);
    });

  return callback.call(this);
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

    if (params.key && !params.input.phrase)
      this._signData(params.key, Vault.UUID, function(error, signature) {
        params.phrase = signature;
        complete.call(self);
      });
    else
      complete.call(self);
  }, this);
};

module.exports = CLI;

