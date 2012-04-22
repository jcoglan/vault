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

var phrase   = $('passphrase'),
    service  = $('service'),
    required = $('required'),
    length   = $('length'),
    word     = $('word'),
    TYPES    = 'lower upper number dash space symbol'.split(' ');

var getSettings = function() {
  var plength   = parseInt(length.value, 10),
      rlength   = parseInt(required.value, 10),
      settings  = {phrase: phrase.value, length: plength},
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
};
var insertPassword = $('insert-password');
on(insertPassword, 'click', function(e) {
  e.preventDefault();
  insert();
});
on(service, 'keydown', function(e) {
  if (e.keyCode === 13) {
    insert();
    window.close();
  }
});

var saveSettings = $('save-settings');
on(saveSettings, 'click', function(e) {
  e.preventDefault();
  var settings = getSettings();
  
  Config.edit(function(config) {
    config.phrase = settings.phrase;
    delete settings.phrase;
    config.services[service.value] = settings;
  });
});

var clearSettings = $('clear-settings');
on(clearSettings, 'click', function(e) {
  e.preventDefault();
  Config.clear();
});

if (typeof Config === 'object') {
  var settings = Config.read(''), value;
  phrase.value = settings.phrase || '';
  
  on(service, 'keyup', function() {
    var settings = Config.read(service.value),
        reqValue = 2;
    
    if (settings.length) length.value = settings.length;
    for (var i = 0, n = TYPES.length; i < n; i++) {
      value = settings[TYPES[i]];
      setRadio(TYPES[i], value);
      if (value && value > 0) reqValue = value;
    }
    required.value = reqValue;
    update();
  });
}
