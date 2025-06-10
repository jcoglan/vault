var fs        = require('fs'),
    path      = require('path'),
    storeroom = require('storeroom'),
    editor    = require('./editor'),
    OptParser = require('./optparser'),
    Store     = require('../store'),
    util      = require('../util'),
    Vault     = require('../vault');

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
                'G': '--delete-globals',
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
  var pathname = options.config.path,
      adapter  = storeroom.createFileAdapter(pathname),
      key      = options.config.key;

  this._store  = new Store(adapter, key);
  this._parser = new OptParser(OPTIONS, SHORTS, ['service']);

  this._out = options.stdout;
  this._err = options.stderr;
  this._tty = options.tty;

  this._requestPassword = options.password;
  this._confirmAction   = options.confirm;
  this._selectKey       = options.selectKey;
  this._signData        = options.sign;
};

CLI.prototype.run = function(argv) {
  var self = this;

  return this._parser.parse(argv).then(function(params) {
    return self.execute(params);
  });
};

CLI.prototype.execute = function(params) {
  var service = params.service;
  delete params.service; // TODO whitelist generator config params

  if (params.help)
    return this._out.write(fs.readFileSync(path.resolve(__dirname, 'usage.txt')));

  if (params.initpath)
    return this._out.write(path.resolve(__dirname, 'scripts', 'init'));

  if (params.cmplt !== undefined)
    return this.complete(params.cmplt);

  var self = this;

  if (params['delete-globals']) return this.deleteGlobals();

  if (params.delete) return this.deleteService(params.delete);
  if (params.clear)  return this.deleteAll();
  if (params.export) return this.export(params.export);
  if (params.import) return this.import(params.import);

  return this._withPhrase(params).then(function() {
    if (params.config) {
      delete params.config;
      return self.configure(service, params);
    } else {
      return self.generate(service, params);
    }
  });
};

CLI.prototype.complete = function(word) {
  if (word === 'true') word = '--';

  if (/^-/.test(word)) {
    var names = Object.keys(OPTIONS).map(function(o) { return '--' + o });
    names = names.filter(function(n) { return n.indexOf(word) === 0 });
    this._out.write(names.sort().join('\n'));
    return Promise.resolve();
  }

  var self = this;

  return this._store.listServices(word).then(function(services) {
    services = services.filter(function(s) { return s.indexOf(word) === 0 });
    self._out.write(services.sort().join('\n'));
  });
};

CLI.prototype._withNotes = function(service, params) {
  if (!params.notes) return Promise.resolve();

  if (!service)
    return Promise.reject(new Error('No service name given'));

  return this._store.serviceSettings(service, false).then(function(settings) {
    var notes = (settings || {}).notes ||
                '# Notes for service "' + service + '"\n' +
                '# Save this file and quit your editor to save your notes\n';

    return editor.editTempfile(notes);
    
  }).then(function(notes) {
    params.notes = /^\s*$/.test(notes) ? undefined : notes;
  });
};

CLI.prototype._withPhrase = function(params) {
  var self = this;

  params.input = {key: !!params.key, phrase: !!params.phrase};

  if (params.key)
    return this._selectKey().then(function(key) { params.key = key });

  if (params.phrase)
    return this._requestPassword().then(function(pw) { params.phrase = pw });

  return Promise.resolve();
};

CLI.prototype.export = function(path) {
  var self = this;

  return this._store.export().then(function(config) {
    config = config || {global: {}, services: {}};
    var json = JSON.stringify(config, true, 2);

    fs.writeFileSync(path, json);
    self._out.write('Exported settings to ' + path + '\n');
  });
};

CLI.prototype.import = function(path) {
  var content = fs.readFileSync(path, 'utf8'),
      config  = null,
      self    = this;

  try {
    config = JSON.parse(content);
  } catch (error) {
    throw new Error('The file "' + path + '" does not contain valid JSON');
  }

  return this._store.import(config).then(function() {
    self._out.write('Imported settings from ' + path + '\n');
  });
};

CLI.prototype.configure = function(service, params) {
  var self = this;

  return this._withNotes(service, params).then(function() {
    var settings = {};
    for (var key in params) {
      if (typeof params[key] !== 'object') settings[key] = params[key];
    }

    if (service)
      return self._store.saveService(service, settings);
    else
      return self._store.saveGlobals(settings);
  });
};

CLI.prototype.deleteGlobals = function() {
  var message = 'This will delete your global settings. Are you sure?',
      store   = this._store,
      self    = this;

  return this._confirmAction(message).then(function() {
    return store.deleteGlobals();
  });
};

CLI.prototype.deleteService = function(service) {
  if (!service) return Promise.reject(new Error('No service name given'));

  var message = 'This will delete your "' + service + '" settings. Are you sure?',
      store   = this._store,
      self    = this;

  return this._confirmAction(message).then(function() {
    return store.deleteService(service);
  });
};

CLI.prototype.deleteAll = function() {
  var message = 'This will delete ALL your settings. Are you sure?',
      store   = this._store,
      self    = this;

  return this._confirmAction(message).then(function() {
    return store.clear();
  }).then(function() {
    return null;
  });
};

CLI.prototype.generate = function(service, params) {
  if (service === undefined)
    return Promise.reject(new Error('No service name given'));

  var self = this;

  return this._store.serviceSettings(service, true).then(function(settings) {
    params = util.assign({}, settings, params);
    var next;

    if (params.key && !params.input.phrase)
      next = self._signData(params.key, Vault.UUID).then(function(sig) { params.phrase = sig });
    else
      next = Promise.resolve();

    return next.then(function() { return settings });

  }).then(function(settings) {
    if (params.phrase === undefined)
      throw new Error('No passphrase given; pass `-p` or run `vault -cp`');

    var vault = new Vault(params);
    return Promise.all([settings, vault.generate(service)]);

  }).then(function([settings, password]) {
    self._out.write(password);
    if (self._tty) self._out.write('\n');

    if (settings.notes !== undefined)
      self._err.write('\n' + settings.notes.replace(/^\s*|\s*$/g, '') + '\n\n');
  });
};

module.exports = CLI;
