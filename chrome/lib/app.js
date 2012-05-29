var $ = function(id) { return document.getElementById(id) };

var on = function(element, event, listener) {
  if (!element) return;
  if (element.addEventListener)
    element.addEventListener(event, listener, false);
  else
    element.attachEvent('on' + event, listener);
};

var getRadio = function(name) {
  var inputs = document.getElementsByTagName('input'), input;
  for (var i = 0, n = inputs.length; i < n; i++) {
    input = inputs[i];
    if (input.type === 'radio' && input.name === name && input.checked)
      return input.value;
  }
};

var setRadio = function(name, value) {
  var inputs = document.getElementsByTagName('input'), input;
  for (var i = 0, n = inputs.length; i < n; i++) {
    input = inputs[i];
    if (input.type === 'radio' && input.name === name) {
      switch (input.value) {
        case 'required':
          input.checked = (value && value > 0);
          break;
        case 'allowed':
          input.checked = (value === undefined);
          break;
        case 'forbidden':
          input.checked = (value === 0);
          break;
      }
    }
  }
};

var service  = $('service'),
    phrase   = $('passphrase'),
    required = $('required'),
    length   = $('length'),
    repeat   = $('repeat'),
    word     = $('word'),
    TYPES    = 'lower upper number dash space symbol'.split(' ');

var getSettings = function() {
  var plength   = parseInt(length.value, 10),
      prepeat   = parseInt(repeat.value, 10),
      rlength   = parseInt(required.value, 10),
      settings  = {phrase: phrase.value, length: plength, repeat: prepeat},
      value;
  
  for (var i = 0, n = TYPES.length; i < n; i++) {
    value = getRadio(TYPES[i]);
    if (value === 'forbidden')
      settings[TYPES[i]] = 0;
    else if (value === 'required')
      settings[TYPES[i]] = rlength;
  }
  
  return settings;
};

var update = function() {
  var settings = getSettings(), vault;
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

var insert = function() {
  var password = word.value.replace(/'/g, '\\\'');
  chrome.tabs.executeScript(null, {
    code: "(document.activeElement||{}).value = '" + password + "';"
  });
  window.close();
};
var insertPassword = $('insert-password');
on(insertPassword, 'click', function(e) {
  e.preventDefault();
  insert();
});
on(service, 'keydown', function(e) {
  if (e.keyCode === 13) insert();
});
on(phrase, 'keydown', function(e) {
  if (e.keyCode === 13) insert();
});

var saveSettings = $('save-settings');
on(saveSettings, 'click', function(e) {
  e.preventDefault();
  var settings = getSettings();
  
  Config.edit(function(config) {
    config.global.phrase = settings.phrase;
    delete settings.phrase;
    config.services[service.value] = settings;
  }, function() {});
});

var clearSettings = $('clear-settings');
on(clearSettings, 'click', function(e) {
  e.preventDefault();
  Config.clear();
});

if (typeof LocalStore === 'object') {
  Config = new Vault.Config(LocalStore);
  
  Config.read('', function(error, settings) {
    var value;
    phrase.value = settings.phrase || '';
    
    on(service, 'keyup', function() {
      Config.read(service.value, function(error, settings) {
        var reqValue = 2;
        
        if (settings.length) length.value = settings.length;
        for (var i = 0, n = TYPES.length; i < n; i++) {
          value = settings[TYPES[i]];
          setRadio(TYPES[i], value);
          if (value && value > 0) reqValue = value;
        }
        required.value = reqValue;
        length.value = settings.length || Vault.DEFAULT_LENGTH;
        repeat.value = settings.repeat || Vault.DEFAULT_REPEAT;
        update();
      });
    });
  });
}

