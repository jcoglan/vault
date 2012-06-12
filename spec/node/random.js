function rand(n) {
  return String(Math.random() * Math.pow(2,48));
}

var Vault = require('../../lib/vault'),
    vault = new Vault({phrase: rand()});

var res = {},
    N   = 10000,
    pass, chars, i, n, j;

while (N--) {
  pass  = vault.generate(rand());
  chars = pass.split('');
  for (i = 0, n = chars.length; i < n; i++) {
    j = Vault.ALL.indexOf(chars[i]);
    res[j] = res[j] || 0;
    res[j] += 1;
  }
}

console.log(res);

var sum    = 0,
    square = 0,
    n      = Vault.ALL.length;

while (n--) {
  sum    += res[n];
  square += Math.pow(res[n], 2);
}

var mean   = sum / Vault.ALL.length,
    stddev = Math.sqrt(square / Vault.ALL.length - Math.pow(mean, 2));

console.log('Mean:     ' + mean);
console.log('Expected: ' + (10000*20/94));
console.log('Std.dev.: ' + stddev);

