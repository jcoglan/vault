'use strict';

var pw      = require('pw'),
    Promise = require('storeroom').Promise;

module.exports = function() {
  return new Promise(function(resolve, reject) {
    process.stderr.write('Passphrase: ');
    pw('*', process.stdin, process.stderr, function(password) {
      password = new Buffer(password, 'binary').toString('utf8');
      resolve(password);
    });
  });
};
