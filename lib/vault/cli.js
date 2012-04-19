var nopt   = require('nopt'),
    pw     = require('pw'),
    tty    = require('tty'),
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
              },
    
    params  = nopt(options, shorts),
    service = params.argv.remain[0];


Config = new Config({
  path: process.env.HOME + '/' + (process.env.VAULT_PATH || '.vault'),
  key:  process.env.VAULT_KEY || process.env.LOGNAME || process.env.USER
});


function die(message) {
  console.error(message);
  process.exit(1);
}


function configure() {
  delete params.config;
  
  Config.edit(function(settings) {
    if (service) {
      settings.services[service] = settings.services[service] || {};
      settings = settings.services[service];
    }
    
    for (var key in params) {
      if (typeof params[key] !== 'object')
        settings[key] = params[key];
    }
  });
}


function generate() {
  var serviceConfig = Config.read(service),
      vault, password;
  
  Vault.extend(params, serviceConfig);
  
  if (params.phrase === undefined)
    die('No passphrase given; pass `-p` or run `vault -cp`');

  if (service === undefined)
    die('No service name given');

  vault    = new Vault(params);
  password = vault.generate(service);
  
  process.stdout.write(password);
  if (tty.isatty(1)) process.stdout.write('\n');
  process.exit(0);
}


function run() {
  try {
    if      (params.export) Config.export(params.export);
    else if (params.import) Config.import(params.import);
    else if (params.config) configure();
    else                    generate();
  } catch (e) {
    die(e.message);
  }
}


if (params.phrase) {
  process.stderr.write('Passphrase: ');
  pw('*', process.stdin, process.stderr, function(password) {
    params.phrase = password;
    run();
  });
} else {
  run();
}

