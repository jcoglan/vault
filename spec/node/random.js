function rand(n) {
  return String(Math.random() * Math.pow(2,48));
}

function test(generator) {
  var res = {},
      N   = 2000,
      pass, chars, i, n, j;
  
  while (N--) {
    pass  = generator.generate(rand());
    chars = pass.split('');
    for (i = 0, n = chars.length; i < n; i++) {
      j = Vault.ALL.indexOf(chars[i]);
      res[j] = res[j] || 0;
      res[j] += 1;
    }
  }
  
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
  console.log('Std.dev.: ' + stddev);
}

var Vault = require('../../lib/vault'),
    vault = new Vault({phrase: rand()});

var random = {
  generate: function() {
    var string = '';
    while (string.length < Vault.DEFAULT_LENGTH)
      string += Vault.ALL[Math.floor(Math.random() * Vault.ALL.length)];
    return string;
  }
};

console.log('Random generator:')
test(random);

console.log('\nVault:')
test(vault);
