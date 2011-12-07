var Vault = function(settings) {
  this._phrase   = settings.phrase || '';
  this._length   = settings.length || Vault.DEFAULT_LENGTH;
  this._charset  = Vault.ALL.slice();
  this._charbits = Math.log(this._charset.length) / Math.log(2);
};

Vault.UUID = '05c704ed-d4b9-4b40-b282-ba6a1c78183f';
Vault.DEFAULT_LENGTH = 20;

Vault.LOWER     = 'abcdefghijklmnopqrstuvwxyz'.split('');
Vault.UPPER     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
Vault.ALPHA     = Vault.LOWER.concat(Vault.UPPER);
Vault.NUMBER    = '0123456789'.split('');
Vault.ALPHANUM  = Vault.ALPHA.concat(Vault.NUMBER);
Vault.SPACE     = [' '];
Vault.DASH      = ['-', '_'];
Vault.SYMBOL    = '!@£$%^&*()=+[{]};:\'"|,<.>?~'.split('').concat(Vault.DASH);
Vault.ALL       = Vault.ALPHANUM.concat(Vault.SPACE).concat(Vault.SYMBOL);

Vault.sha256 = function(string) {
  if (typeof Crypto !== 'undefined') return Crypto.SHA256(string);
  
  var sha256 = require('crypto').createHash('sha256');
  sha256.update(string);
  return sha256.digest('hex');
};

Vault.toBits = function(digit) {
  var string = parseInt(digit, 16).toString(2);
  while (string.length < 4) string = '0' + string;
  return string;
};

Vault.prototype.generate = function(password) {
  var string = this._phrase + Vault.UUID + password,
      hex    = Vault.sha256(string),
      bits   = hex.split('').map(Vault.toBits).join(''),
      result = '',
      index  = 0,
      charbits, offset;
  
  while (result.length < this._length) {
    charbits = this.generateCharBits(bits, index);
    index   += charbits.length;
    offset   = parseInt(charbits.replace(/^0*(.+)$/, '$1'), 2);
    result  += this._charset[offset];
  }
  
  return result;
};

Vault.prototype.generateCharBits = function(bits, index) {
  var size  = Math.ceil(this._charbits),
      chunk = bits.substr(index, size);
  
  if (chunk.charAt(0) === '0') return chunk;
  
  var value = parseInt(chunk, 2);
  if (value >= this._charset.length) size -= 1;
  return bits.substr(index, size);
};

if (typeof module === 'object')
  module.exports = Vault;

