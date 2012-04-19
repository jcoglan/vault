var Vault = function(settings) {
  this._phrase   = settings.phrase || '';
  this._length   = settings.length || Vault.DEFAULT_LENGTH;
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
Vault.DEFAULT_LENGTH = 16;

Vault.LOWER     = 'abcdefghijklmnopqrstuvwxyz'.split('');
Vault.UPPER     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
Vault.ALPHA     = Vault.LOWER.concat(Vault.UPPER);
Vault.NUMBER    = '0123456789'.split('');
Vault.ALPHANUM  = Vault.ALPHA.concat(Vault.NUMBER);
Vault.SPACE     = [' '];
Vault.DASH      = ['-', '_'];
Vault.SYMBOL    = '!@£$%^&*()=+[{]};:\'"|,<.>?~'.split('').concat(Vault.DASH);
Vault.ALL       = Vault.ALPHANUM.concat(Vault.SPACE).concat(Vault.SYMBOL);

Vault.TYPES = 'LOWER UPPER ALPHA NUMBER ALPHANUM SPACE DASH SYMBOL'.split(' ');

Vault.extend = function(target, source, predicate) {
  for (var key in source) {
    if (!predicate || predicate(source[key]))
      target[key] = source[key];
  }
  return target;
};

Vault.createHash = function(key, message) {
  if (typeof Crypto !== 'undefined')
    return Crypto.HMAC(Crypto.SHA256, message, key);
  
  var hmac = require('crypto').createHmac('sha256', key);
  hmac.update(message);
  return hmac.digest('hex');
};

Vault.toBits = function(digit) {
  var string = parseInt(digit, 16).toString(2);
  while (string.length < 4) string = '0' + string;
  return string;
};

Vault.prototype.subtract = function(charset) {
  if (!charset) return;
  for (var i = 0, n = charset.length; i < n; i++) {
    var index = this._allowed.indexOf(charset[i]);
    if (index >= 0) this._allowed.splice(index, 1);
  }
};

Vault.prototype.require = function(charset, n) {
  if (!charset) return;
  while (n--) this._required.push(charset);
};

Vault.prototype.generate = function(service) {
  if (this._required.length > this._length)
    throw new Error('Length too small to fit all required characters');
  
  var hex    = Vault.createHash(this._phrase, service + Vault.UUID),
      bits   = hex.split('').map(Vault.toBits).join(''),
      result = '',
      offset = 0,
      index, charset, charbits, code;
  
  while (result.length < this._length) {
    index    = this.generateCharBits(this._required.length, bits, offset);
    offset  += index.length;
    
    if (offset >= bits.length)
      throw new Error('Cannot generate a ' + this._length + '-character password');
    
    charset  = this._required.splice(parseInt(index, 2), 1)[0];
    charbits = this.generateCharBits(charset.length, bits, offset);
    offset  += charbits.length;
    
    code     = parseInt(charbits, 2) || 0;
    result  += charset[code];
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

