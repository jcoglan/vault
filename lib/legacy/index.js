'use strict';

var fs       = require('fs'),
    Promise  = require('storeroom').Promise,
    Migrator = require('./v03_migrator'),
    confirm  = require('../cli/confirm');

var SEP = '========================================================================';

var formatMessage = function(text) {
  if (!process.stderr.getWindowSize) return message;

  var width = process.stderr.getWindowSize()[0] - 4,
      words = text.split(/\s+/),
      lines = [''],
      last, word;

  while (words.length > 0) {
    last = lines[lines.length - 1];
    word = words.shift();

    if (last.length + word.length + 1 > width)
      lines.push('');

    last = lines[lines.length - 1];
    lines[lines.length - 1] = (last === '') ? word : last + ' ' + word;
  }
  return lines.join('\n');
};

var message = function(text) {
  console.error('\n' + formatMessage(text) + '\n');
};

var migrate = function(pathname, password) {
  var migrator = new Migrator(pathname, password);

  migrator.on('message', function(message) {
    console.error('[INFO] ' + message);
  });

  return migrator.run();
};

module.exports = {
  migrateConfig: function(pathname, password) {
    var stat;
    try {
      stat = fs.statSync(pathname);
    } catch (error) {
      return Promise.resolve();
    }

    if (!stat.isFile()) return Promise.resolve();

    message(
      'It looks as though your config file (' + pathname + ') was created' +
      ' with an old version of Vault. In order to continue, it needs to be' +
      ' converted to a new format.');

    return confirm('Would you like Vault to perform this conversion now?').then(function() {
      console.error('\n' + SEP);
      return migrate(pathname, password);

    }).then(function(backupPath) {
      console.error(SEP);

      message(
        'Your original config file has been backed up at ' + backupPath +
        '. If you are happy with how Vault is working, you should delete' +
        ' that file as soon as possible.');
    });
  }
};
