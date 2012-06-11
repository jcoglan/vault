var Vault = function(settings) {
  this._phrase   = settings.phrase || '';
  this._length   = settings.length || Vault.DEFAULT_LENGTH;
  this._repeat   = settings.repeat || Vault.DEFAULT_REPEAT;
  this._allowed  = Vault.ALL.slice();
  this._required = [];
  
  var types = Vault.TYPES, value;
  for (var i = 0, n = types.length; i < n; i++) {
    value = settings[types[i].toLowerCase()];
    if (value === 0) {
      this.subtract(Vault[types[i]]);
    } else if (typeof value === 'number') {
      this.require(Vault[types[i]], value);
    }
  }
  
  var n = this._length - this._required.length;
  while (n >= 0 && n--) this._required.push(this._allowed);
};

Vault.UUID = 'e87eb0f4-34cb-46b9-93ad-766c5ab063e7';
Vault.DEFAULT_LENGTH = 20;
Vault.DEFAULT_REPEAT = 0;

Vault.LOWER     = 'abcdefghijklmnopqrstuvwxyz'.split('');
Vault.UPPER     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
Vault.ALPHA     = Vault.LOWER.concat(Vault.UPPER);
Vault.NUMBER    = '0123456789'.split('');
Vault.ALPHANUM  = Vault.ALPHA.concat(Vault.NUMBER);
Vault.SPACE     = [' '];
Vault.DASH      = ['-', '_'];
Vault.SYMBOL    = '!"#$%&\'()*+,./:;<=>?@[\\]^{|}~'.split('').concat(Vault.DASH);
Vault.ALL       = Vault.ALPHANUM.concat(Vault.SPACE).concat(Vault.SYMBOL);

Vault.TYPES = 'LOWER UPPER ALPHA NUMBER ALPHANUM SPACE DASH SYMBOL'.split(' ');

Vault.extend = function(target, source) {
  for (var key in source) {
    if (!target.hasOwnProperty(key))
      target[key] = source[key];
  }
  return target;
};

Vault.createHash = function(key, message, entropy) {
  var CJS    = (typeof CryptoJS !== 'undefined') ? CryptoJS : require('./crypto-js-3.0.2'),
      digits = (entropy || 256) / 4;
  
  return CJS.PBKDF2(key, message, {keySize: Math.ceil(digits / 8), iterations: 16}).toString();
};

Vault.indexOf = function(list, item) {
  if (list.indexOf) return list.indexOf(item);
  for (var i = 0, n = list.length; i < n; i++) {
    if (list[i] === item) return i;
  }
  return -1;
};

Vault.map = function(list, callback, context) {
  if (list.map) return list.map(callback, context);
  var result = [];
  for (var i = 0, n = list.length; i < n; i++)
    result.push(callback.call(context, list[i]));
  return result;
};

Vault.pbkdf2 = function(password, salt, keylen, iterations, callback) {
  if (typeof require === 'function' && require('crypto').pbkdf2)
    return require('crypto').pbkdf2(password, salt, iterations, 4 * keylen, function(error, key) {
      callback(error, new Buffer(key, 'binary').toString('hex'));
    });
  
  var CJS = (typeof CryptoJS !== 'undefined') ? CryptoJS : require('./crypto-js-3.0.2'),
      key = CJS.PBKDF2(password, salt, {keySize: keylen, iterations: iterations});
  
  callback(null, key.toString());
};

Vault.toBits = function(digit) {
  var string = parseInt(digit, 16).toString(2);
  while (string.length < 4) string = '0' + string;
  return string;
};

Vault.prototype.subtract = function(charset, allowed) {
  if (!charset) return;
  allowed = allowed || this._allowed;
  for (var i = 0, n = charset.length; i < n; i++) {
    var index = Vault.indexOf(allowed, charset[i]);
    if (index >= 0) allowed.splice(index, 1);
  }
  return allowed;
};

Vault.prototype.require = function(charset, n) {
  if (!charset) return;
  while (n--) this._required.push(charset);
};

Vault.prototype.entropy = function() {
  var entropy = 0;
  for (var i = 0, n = this._required.length; i < n; i++) {
    entropy += Math.ceil(Math.log(i+1) / Math.log(2));
    entropy += Math.ceil(Math.log(this._required[i].length) / Math.log(2));
  }
  return entropy;
};

Vault.prototype.generate = function(service) {
  if (this._required.length > this._length)
    throw new Error('Length too small to fit all required characters');
  
  if (this._allowed.length === 0)
    throw new Error('No characters available to create a password');
  
  var required = this._required.slice(),
      hex      = Vault.createHash(this._phrase, service + Vault.UUID, this.entropy()),
      bits     = Vault.map(hex.split(''), Vault.toBits).join(''),
      result   = '',
      offset   = 0,
      index, charset, previous, i, same, charbits, code;
  
  while (result.length < this._length) {
    index    = this.generateCharBits(required.length, bits, offset);
    offset  += index.length;
    charset  = required.splice(parseInt(index, 2), 1)[0];
    previous = result.charAt(result.length - 1);
    i        = this._repeat - 1;
    same     = previous && (i >= 0);
    
    while (same && i--)
      same = same && result.charAt(result.length + i - this._repeat) === previous;
    if (same)
      charset = this.subtract([previous], charset.slice());
    
    charbits  = this.generateCharBits(charset.length, bits, offset);
    offset   += charbits.length;
    code      = parseInt(charbits, 2) || 0;
    result   += charset[code];
  }
  
  return result;
};

Vault.prototype.generateCharBits = function(base, bits, offset) {
  if (base === 1) return '';
  
  var size  = Math.ceil(Math.log(base) / Math.log(2)),
      chunk = bits.substr(offset, size);
  
  if (chunk.charAt(0) === '0') return chunk;
  
  var value = parseInt(chunk, 2);
  if (value >= base) size -= 1;
  return bits.substr(offset, size);
};

if (typeof module === 'object')
  module.exports = Vault;

