'use strict';

var Promise = require('storeroom').Promise,
    SSH     = require('ssh-agent');

module.exports = function(sshKey, message) {
  var client = new SSH();

  return new Promise(function(resolve, reject) {
    client.requestIdentities(function(error, keys) {
      var key = keys.filter(function(k) { return k.ssh_key === sshKey })[0];
      if (!key) return reject(new Error('Private key not found'));

      client.sign(key, Buffer.from(message), function(error, signature) {
        if (signature)
          resolve(signature.signature);
        else
          reject(new Error('Private key signing failed'));
      });
    });
  });
};
