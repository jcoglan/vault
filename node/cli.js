var fs             = require('fs'),
    path           = require('path'),
    Vault          = require('../lib/vault'),
    Store          = require('../lib/store'),
    OptParser      = require('./optparser'),
    editor         = require('./editor'),
    CompositeStore = require('./composite_store'),
    FileAdapter    = require('./file_adapter'),

    OPTIONS = { 'phrase':         Boolean,
                'key':            Boolean,
                'length':         Number,
                'repeat':         Number,
                'iteration':      Number,

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

                'source':         String,
                'cert':           String,
                'add-source':     String,
                'delete-source':  String,
                'set-source':     String,
                'show-source':    String,
                'list-sources':   Boolean,
                'browser':        String,
                'text-browser':   String,
                'master-key':     String,

                'export':         String,
                'import':         String,

                'initpath':       Boolean,
                'cmplt':          String,
                'help':           Boolean
              },

    SHORTS  = { 'a': '--add-source',
                'c': '--config',
                'd': '--delete-source',
                'e': '--export',
                'h': '--help',
                'i': '--import',
                'k': '--key',
                'l': '--length',
                'm': '--master-key',
                'n': '--notes',
                'p': '--phrase',
                'r': '--repeat',
                't': '--iteration',
                'x': '--delete',
                'X': '--clear'
              };

var exists = fs.existsSync || path.existsSync;

var CLI = function(options) {
  var pathname = options.config.path, key = options.config.key;

  this._local  = new Store(new FileAdapter(pathname), key, {cache: options.config.cache});
  this._store  = new CompositeStore(this._local);
  this._parser = new OptParser(OPTIONS, SHORTS, ['service']);

  this._out = options.stdout;
  this._err = options.stderr;
  this._tty = options.tty;

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

    if (params.cert && !exists(params.cert))
      return callback.call(context, new Error('File "' + params.cert + '" does not exist'));

    var opts = {
          browser: params.browser || params['text-browser'] || null,
          inline:  params['text-browser'] !== undefined,
          ca:      params.cert && fs.readFileSync(params.cert).toString('utf8'),
          key:     params['master-key']
        },
        source;

    if (source = params['add-source'])
      return this.addSource(source, opts, callback, context);
    if (source = params['delete-source'])
      return this._store.deleteSource(source, callback, context);
    if (source = params['set-source'])
      return this._store.setDefaultSource(source, callback, context);
    if (source = params['show-source'])
      return this.showSource(source, callback, context);

    if (params['list-sources']) return this.listSources(callback, context);

    if (source = params.source) this._store.setSource(source);
    delete params.source;

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

CLI.prototype.addSource = function(source, options, callback, context) {
  if (!options.key)
    return callback.call(context, new Error('No encryption key given; run again with `--master-key`'));

  this._store.addSource(source, options, function(error) {
    if (error) return callback.call(context, error);

    this._out.write('Source "' + source + '" was successfully added.\n');
    var self = this;

    this._confirmAction('Do you want to set "' + source + '" as your default source?', function(confirm) {
      if (confirm)
        self._store.setDefaultSource(source, callback, context);
      else
        callback.call(context, null);
    });
  }, this);
};

CLI.prototype.showSource = function(source, callback, context) {
  this._store.showSource(source, function(error, settings) {
    if (error) return callback.call(context, error);
    this._out.write('Address:       ' + settings.address + '\n');
    this._out.write('Type:          ' + settings.type + ', version ' + settings.version + '\n');
    this._out.write('OAuth URL:     ' + settings.oauth + '\n');
    this._out.write('Storage URL:   ' + settings.storage + '\n');
    this._out.write('Token:         ' + settings.token + '\n');

    if (settings.ca)
      this._out.write('\n' + settings.ca + '\n');

    callback.call(context, null);
  }, this);
};

CLI.prototype.listSources = function(callback, context) {
  this._store.listSources(function(error, sources, current) {
    if (error) return callback.call(context, error);
    sources = sources.sort();
    var output = '';
    for (var i = 0, n = sources.length; i < n; i++) {
      output += (sources[i] === current) ? '*' : ' ';
      output += ' ' + sources[i] + '\n';
    }
    this._out.write(output);
    callback.call(context, null);
  }, this);
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
      this._store.saveService(service, settings, false, function(error, store) {
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

