'use strict';

var readline = require('./readline');

module.exports = function(message) {
  return new Promise(function(resolve, reject) {
    var rl = readline();
    rl.question(message + ' (y/n): ', function(input) {
      rl.close();
      if (input.toLowerCase() === 'y')
        resolve();
      else
        reject();
    });
  });
};
