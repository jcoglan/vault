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

