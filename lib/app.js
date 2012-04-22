var $ = function(id) { return document.getElementById(id) };

var on = function(element, event, listener) {
  if (element.addEventListener)
    element.addEventListener(event, listener, false);
  else
    element.attachEvent('on' + event, listener);
};

var radio = function(name) {
  var inputs = document.getElementsByTagName('input'), input;
  for (var i = 0, n = inputs.length; i < n; i++) {
    input = inputs[i];
    if (input.type === 'radio' && input.name === name && input.checked)
      return input.value;
  }
};

var phrase   = $('passphrase'),
    service  = $('service'),
    required = $('required'),
    length   = $('length'),
    word     = $('word'),
    TYPES    = 'lower upper number dash space symbol'.split(' ');

var update = function() {
  var plength   = parseInt(length.value, 10),
      rlength   = parseInt(required.value, 10),
      settings  = {phrase: phrase.value, length: plength},
      value, vault;
  
  for (var i = 0, n = TYPES.length; i < n; i++) {
    value = radio(TYPES[i]);
    if (value === 'forbidden')
      settings[TYPES[i]] = 0;
    else if (value === 'required')
      settings[TYPES[i]] = rlength;
  }
  
  try {
    vault      = new Vault(settings);
    word.value = vault.generate(service.value);
  } catch (e) {
    word.value = '!! ' + e.message;
  }
};

var inputs = document.getElementsByTagName('input');
for (var i = 0, n = inputs.length; i < n; i++) {
  if (inputs[i].id === 'word') continue;
  on(inputs[i], 'keyup', update);
  on(inputs[i], 'change', update);
}
