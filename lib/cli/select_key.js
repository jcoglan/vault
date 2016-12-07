'use strict';

var Promise  = require('storeroom').Promise,
    SSH      = require('ssh-agent'),
    readline = require('./readline');

var SNIP = 12;

module.exports = function() {
  var client = new SSH();

  return new Promise(function(resolve, reject) {
    client.requestIdentities(function(error, keys) {
      keys = keys.filter(function(k) { return k.type === 'ssh-rsa' });

      if (keys.length === 0)
        return reject(new Error('No usable RSA keys were found'));

      if (keys.length === 1) return resolve(keys[0].ssh_key);

      console.error('\nWhich key would you like to use?\n');

      keys.forEach(function(key, i) {
        var abbrev = key.ssh_key.substr(0, SNIP) + '...' + key.ssh_key.substr(key.ssh_key.length - SNIP);
        console.error((i+1) + ': ' + key.comment + ', ' + abbrev);
      });

      readline().question('\nEnter a number (1-' + keys.length + '): ', function(index) {
        index = parseInt(index, 10);
        if (index >= 1 && index <= keys.length)
          resolve(keys[index - 1].ssh_key);
        else
          reject(new Error('Selected key must be between 1 and ' + keys.length));
      });
    });
  });
};
