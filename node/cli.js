var fs         = require('fs'),
    path       = require('path'),
    OptParser  = require('./optparser'),
    editor     = require('./editor'),
    Vault      = require('../lib/vault'),
    LocalStore = require('./local_store'),

    OPTIONS = { 'phrase':         Boolean,
                'key':            Boolean,
                'length':         Number,
                'repeat':         Number,

                'lower':          Number,
                'upper':          Number,
                'number':         Number,
                'space':          Number,
                'dash':           Number,
                'symbol':         Number,
                'notes':          Boolean,

                'config':         Boolean,
                'delete':         String,
                'delete-globals': Boolean,
                'clear':          Boolean,

                'export':         String,
                'import':         String,

                'initpath':       Boolean,
                'cmplt':          String,
                'help':           Boolean
              },

    SHORTS  = { 'c': '--config',
                'e': '--export',
                'h': '--help',
                'i': '--import',
                'k': '--key',
                'l': '--length',
                'n': '--notes',
                'p': '--phrase',
                'r': '--repeat',
                'x': '--delete',
                'X': '--clear'
              };

var exists = fs.existsSync || path.existsSync;

var CLI = function(options) {
  this._parser = new OptParser(OPTIONS, SHORTS, ['service']);
  this._store  = new LocalStore(options.config).composite();
  this._out    = options.stdout;
  this._err    = options.stderr;
  this._tty    = options.tty;

  this._requestPassword = options.password;
  this._confirmAction = options.confirm;
  this._selectKey = options.selectKey;
  this._signData = options.sign;
};

CLI.prototype.run = function(argv, callback, context) {
  this._parser.parse(argv, function(error, params) {
    if (error) return callback.call(context, error);

    var service = params.service, self = this;
    delete params.service;

    if (params.help)
      return fs.readFile(__dirname + '/usage.txt', function(error, content) {
        self._out.write(content);
        callback.call(context, null);
      });

    if (params.initpath) {
      this._out.write(path.resolve(__dirname + '/scripts/init'));
      return callback.call(context, null);
    }

    if (params.cmplt !== undefined)
      return this.complete(params.cmplt, callback, context);

    if (params['delete-globals']) return this.deleteGlobals(callback, context);
    if (params.delete) return this.delete(params.delete, callback, context);
    if (params.clear)  return this.deleteAll(callback, context);
    if (params.export) return this.export(params.export, callback, context);
    if (params.import) return this.import(params.import, callback, context);

    this.withPhrase(params, function() {
      if (params.config) {
        delete params.config;
        this.configure(service, params, callback, context);
      } else {
        this.generate(service, params, callback, context);
      }
    });
  }, this);
};

CLI.prototype.complete = function(word, callback, context) {
  if (word === 'true') word = '--';
  if (/^-/.test(word)) {
    var names = Object.keys(OPTIONS).map(function(o) { return '--' + o });
    names = names.filter(function(n) { return n.indexOf(word) === 0 });
    this._out.write(names.sort().join('\n'));
    callback.call(context, null);
  } else {
    this._store.listSources(function(error, sources) {
      sources = []; // temporary measure until remote sources are added
      this._store.listServices(function(error, services) {
        if (error) return callback.call(context, new Error('\n' + error.message));
        var all = services.concat(sources);
        all = all.filter(function(s) { return s.indexOf(word) === 0 });
        this._out.write(all.sort().join('\n'));
        callback.call(context, error);
      }, this);
    }, this);
  }
};

CLI.prototype.withNotes = function(service, params, callback) {
  if (!params.notes) return callback.call(this);

  if (!service)
    return callback.call(this, new Error('No service name given'));

  this._store.currentStore(function(error, store) {
    if (error) return callback.call(this, error);

    store.serviceSettings(service, false, function(error, settings) {
      var notes = (settings || {}).notes ||
                  '# Notes for "' + service + '" in "' + store.getName() + '"\n' +
                  '# Save this file and quit your editor to save your notes\n';

      editor.editTempfile(notes, function(error, text) {
        if (error) return callback.call(this, error);
        params.notes = /^\s*$/.test(text) ? undefined : text;
        callback.call(this);
      }, this);
    }, this);
  }, this);
};

CLI.prototype.withPhrase = function(params, callback) {
  var self = this;

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
  var self = this;
  this._store.export(function(error, store, config) {
    if (error) return callback.call(context, error);
    config = config || {global: {}, services: {}};
    var json = JSON.stringify(config, true, 2);
    fs.writeFile(path, json, function() {
      self._out.write('Exported settings from "' + store + '" to ' + path + '\n');
      callback.apply(context, arguments);
    });
  });
};

CLI.prototype.import = function(path, callback, context) {
  var self = this;
  fs.readFile(path, function(error, content) {
    if (error) return callback.call(context, error);
    var config = JSON.parse(content.toString());
    self._store.import(config, function(error, store) {
      if (error) return callback.call(context, error);
      self._out.write('Imported settings from ' + path + ' to "' + store + '"\n');
      callback.call(context, null);
    });
  });
};

CLI.prototype.configure = function(service, params, callback, context) {
  this.withNotes(service, params, function(error) {
    if (error) return callback.call(context, error);

    var settings = {};
    for (var key in params) {
      if (typeof params[key] !== 'object') settings[key] = params[key];
    }

    if (service)
      this._store.saveService(service, settings, function(error, store) {
        if (error) return callback.call(context, error);
        this._out.write('Settings for service "' + service + '" saved to "' + store + '"\n');
        callback.call(context, null);
      }, this);
    else
      this._store.saveGlobals(settings, function(error, store) {
        if (error) return callback.call(context, error);
        this._out.write('Global settings saved to "' + store + '"\n');
        callback.call(context, null);
      }, this);
  });
};

CLI.prototype.deleteGlobals = function(callback, context) {
  var store = this._store;
  this._confirmAction('This will delete your global settings. Are you sure?', function(confirm) {
    if (confirm)
      store.deleteGlobals(callback, context);
    else
      callback.call(context, null);
  });
};

CLI.prototype.delete = function(service, callback, context) {
  if (!service) return callback.call(context, new Error('No service name given'));
  var store = this._store;
  this._confirmAction('This will delete your "' + service + '" settings. Are you sure?', function(confirm) {
    if (confirm)
      store.deleteService(service, callback, context);
    else
      callback.call(context, null);
  });
};

CLI.prototype.deleteAll = function(callback, context) {
  var store = this._store;
  this._confirmAction('This will delete ALL your settings. Are you sure?', function(confirm) {
    if (confirm)
      store.clear(callback, context);
    else
      callback.call(context, null);
  });
};

CLI.prototype.generate = function(service, params, callback, context) {
  this._store.serviceSettings(service, true, function(error, settings) {
    if (error) return callback.call(context, error);
    Vault.extend(params, settings);

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

      if (settings.notes !== undefined)
        this._err.write('\n' + settings.notes.replace(/^\s*|\s*$/g, '') + '\n\n');

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

