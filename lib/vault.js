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

Vault.TYPES = 'LOWER UPPER NUMBER SPACE DASH SYMBOL'.split(' ');

Vault.extend = function(target, source) {
  for (var key in source) {
    if (!target.hasOwnProperty(key))
      target[key] = source[key];
  }
  return target;
};

Vault.createHash = function(key, message, entropy) {
  var CJS   = (typeof CryptoJS !== 'undefined') ? CryptoJS : require('vault-cipher/lib/crypto-js'),
      bytes = (entropy || 256) / 8;

  return CJS.PBKDF2(key, message, {keySize: Math.ceil(bytes / 4), iterations: 8}).toString();
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
      stream   = new Vault.Stream(this._phrase, service, this.entropy()),
      result   = '',
      index, charset, previous, i, same;

  while (result.length < this._length) {
    index    = stream.generate(required.length);
    charset  = required.splice(index, 1)[0];
    previous = result.charAt(result.length - 1);
    i        = this._repeat - 1;
    same     = previous && (i >= 0);

    while (same && i--)
      same = same && result.charAt(result.length + i - this._repeat) === previous;
    if (same)
      charset = this.subtract([previous], charset.slice());

    index   = stream.generate(charset.length);
    result += charset[index];
  }

  return result;
};


// Generate uniformly distributed output in any base from a bit stream
// http://checkmyworking.com/2012/06/converting-a-stream-of-binary-digits-to-a-stream-of-base-n-digits/

Vault.Stream = function(phrase, service, entropy) {
  this._phrase  = phrase;
  this._service = service;

  var hash = Vault.createHash(phrase, service + Vault.UUID, 2 * entropy),
      bits = Vault.map(hash.split(''), Vault.toBits).join('').split('');

  this._bases = {
    '2': Vault.map(bits, function(s) { return parseInt(s, 2) })
  };
};

Vault.Stream.prototype.generate = function(n, base, inner) {
  base = base || 2;

  var value = n,
      k = Math.ceil(Math.log(n) / Math.log(base)),
      r = Math.pow(base, k) - n,
      chunk;

  loop: while (value >= n) {
    chunk = this._shift(base, k);
    if (!chunk) return inner ? n : null;

    value = this._evaluate(chunk, base);

    if (value >= n) {
      if (r === 1) continue loop;
      this._push(r, value - n);
      value = this.generate(n, r, true);
    }
  }
  return value;
};

Vault.Stream.prototype._evaluate = function(chunk, base) {
  var sum = 0,
      i   = chunk.length;

  while (i--) sum += chunk[i] * Math.pow(base, chunk.length - (i+1));
  return sum;
};

Vault.Stream.prototype._push = function(base, value) {
  this._bases[base] = this._bases[base] || [];
  this._bases[base].push(value);
};

Vault.Stream.prototype._shift = function(base, k) {
  var list = this._bases[base];
  if (!list || list.length < k) return null;
  else return list.splice(0,k);
};


if (typeof module === 'object')
  module.exports = Vault;

