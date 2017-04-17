'use strict';

var pap     = require('posix-argv-parser'),
    Promise = require('storeroom').Promise,
    util    = require('../util');
 
var OptParser = function(options, shorts, args) {
  this._options = util.assign({}, options);
  this._shorts  = util.assign({}, shorts);
  this._args    = args;

  this._parser = pap.create();
  var key, option, signature, profile;

  options = this._options;
  for (key in options) options[key] = [options[key]];

  for (key in this._shorts)
    options[this._shorts[key].replace(/^--/, '')].push(key);

  for (key in options) {
    signature = ['--' + key];
    option    = options[key];
    profile   = {hasValue: option[0] !== Boolean};

    if (option[0] === Number)
      profile.transform = function(s) { return parseInt(s, 10) };
    if (option[1])
      signature.push('-' + option[1]);

    this._parser.createOption(signature, profile);
  }
  for (var i = 0, n = args.length; i < n; i++)
    this._parser.createOperand(args[i]);
};

OptParser.prototype.parse = function(argv) {
  var self = this;

  return new Promise(function(resolve, reject) {
    self._parser.parse(argv.slice(2), function(error, opt) {
      if (error) return reject(new Error(error[0]));

      var processed = {}, name, type;

      for (var key in opt) {
        if (!/^-[a-z]/i.test(key) && opt[key].isSet) {
          name = key.replace(/^--/, '');
          type = (self._options[name] || [])[0];
          processed[name] = (type === Boolean) ? true : opt[key].value;
        }
      }
      resolve(processed);
    });
  });
};

module.exports = OptParser;
