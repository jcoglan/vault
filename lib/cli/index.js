var fs             = require('fs'),
    path           = require('path'),
    storeroom      = require('storeroom'),
    Promise        = storeroom.Promise,
    CompositeStore = require('../composite_store'),
    editor         = require('./editor'),
    OptParser      = require('./optparser'),
    Store          = require('../store'),
    util           = require('../util'),
    Vault          = require('../vault');

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
                'help':           Boolean,

                'add-source':     String,
                'browser':        String,
                'text-browser':   String,
                'master-key':     String,
                'cert':           String,
                'delete-source':  String,
                'list-sources':   Boolean,
                'show-source':    String,
                'set-source':     String,
                'source':         String
              },

    SHORTS  = { 'a': '--add-source',
                'c': '--config',
                'd': '--delete-source',
                'e': '--export',
                'G': '--delete-globals',
                'h': '--help',
                'i': '--import',
                'k': '--key',
                'l': '--length',
                'm': '--master-key',
                'n': '--notes',
                'p': '--phrase',
                'r': '--repeat',
                's': '--source',
                'S': '--set-source',
                'x': '--delete',
                'X': '--clear'
              };

var exists = fs.existsSync || path.existsSync;

var CLI = function(options) {
  var pathname = options.config.path,
      adapter  = storeroom.createFileAdapter(pathname),
      key      = options.config.key;

  this._local  = new Store(adapter, key);
  this._store  = new CompositeStore(this._local);
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

  var self = this, source;

  if (source = params['add-source'])    return this.addSource(source, params);
  if (source = params['delete-source']) return this._store.deleteSource(source);
  if (source = params['set-source'])    return this._store.setDefaultSource(source);
  if (source = params['show-source'])   return this.showSource(source);

  if (params['list-sources']) return this.listSources();

  if (source = params.source) this._store.setSource(source);
  delete params.source;

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

  return Promise.all([
    this._store.listServices(word), this._store.listSources()

  ]).then(function(results) {
    var services = results[0],
        sources  = results[1].map(function(s) { return s.address }),
        all      = services.concat(sources);

    all = all.filter(function(s) { return s.indexOf(word) === 0 });
    self._out.write(all.sort().join('\n'));
  });
};

CLI.prototype.addSource = function(source, params) {
  if (params.cert && !exists(params.cert))
    return Promise.reject(new Error('File "' + params.cert + '" does not exist'));

  var options = {
    browser: params.browser || params['text-browser'] || null,
    inline:  params['text-browser'] !== undefined,
    ca:      params.cert && fs.readFileSync(params.cert).toString('utf8'),
    key:     params['master-key']
  };

  if (!options.key)
    return Promise.reject(new Error('No encryption key given; run again with `--master-key`'));

  var self = this;

  return this._store.addSource(source, options).then(function() {
    self._out.write('Source "' + source + '" was successfully added.\n');
    return self._confirmAction('Do you want to set "' + source + '" as your default source?');

  }).then(function() {
    return self._store.setDefaultSource(source);
  });
};

CLI.prototype.showSource = function(source) {
  var self = this;

  return this._store.getSource(source).then(function(settings) {
    var session = settings.session;

    self._out.write('curl -siH "Authorization: Bearer ' + session.authorization.access_token +
                    '" ' + session.webfinger.storageRoot + '/' + session.scope + '/\n\n');

    self._out.write('Address:       ' + session.address + '\n');
    self._out.write('Type:          ' + settings.type + ', version ' + session.webfinger.version + '\n');
    self._out.write('OAuth URL:     ' + session.webfinger.authDialog + '\n');
    self._out.write('Storage URL:   ' + session.webfinger.storageRoot + '\n');
    self._out.write('Token:         ' + session.authorization.access_token + '\n');

    if (settings.options.ca)
      self._out.write('\n' + settings.options.ca + '\n');
  });
};

CLI.prototype.listSources = function() {
  var self = this;

  return this._store.listSources().then(function(sources) {
    var output = '';
    for (var i = 0, n = sources.length; i < n; i++) {
      output += sources[i].current ? '->' : '  ';
      output += ' ' + sources[i].address + '\n';
    }
    self._out.write(output);
  });
};

CLI.prototype._withNotes = function(service, params) {
  if (!params.notes) return Promise.resolve();

  if (!service)
    return Promise.reject(new Error('No service name given'));

  var self = this, name;

  return this._store.currentStore().then(function(store) {
    name = store.getName();
    return store.serviceSettings(service, false);
      
  }).then(function(settings) {
    var notes = (settings || {}).notes ||
                '# Notes for service "' + service + '" in store "' + name + '"\n' +
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

  return this._store.export().then(function(result) {
    var store = result[0], config = result[1];

    config = config || {global: {}, services: {}};
    var json = JSON.stringify(config, true, 2);

    fs.writeFileSync(path, json);
    self._out.write('Exported settings from "' + store + '" to ' + path + '\n');
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

  return this._store.import(config).then(function(result) {
    self._out.write('Imported settings from ' + path + ' to "' + result[0] + '"\n');
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
      return self._store.saveService(service, settings).then(function(result) {
        self._out.write('Settings for service "' + service + '" saved to "' + result[0] + '"\n');
      });
    else
      return self._store.saveGlobals(settings).then(function(result) {
        self._out.write('Global settings saved to "' + result[0] + '"\n');
      });
  });
};

CLI.prototype.deleteGlobals = function() {
  var message = 'This will delete your global settings. Are you sure?',
      store   = this._store;

  return this._confirmAction(message).then(function() {
    return store.deleteGlobals();
  });
};

CLI.prototype.deleteService = function(service) {
  if (!service) return Promise.reject(new Error('No service name given'));

  var message = 'This will delete your "' + service + '" settings. Are you sure?',
      store   = this._store;

  return this._confirmAction(message).then(function() {
    return store.deleteService(service);
  });
};

CLI.prototype.deleteAll = function() {
  var message = 'This will delete ALL your settings. Are you sure?',
      store   = this._store;

  return this._confirmAction(message).then(function() {
    return store.clear();
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

    var vault    = new Vault(params),
        password = vault.generate(service);

    self._out.write(password);
    if (self._tty) self._out.write('\n');

    if (settings.notes !== undefined)
      self._err.write('\n' + settings.notes.replace(/^\s*|\s*$/g, '') + '\n\n');
  });
};

module.exports = CLI;
