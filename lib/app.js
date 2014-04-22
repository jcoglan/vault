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

var togglePassword = function(id) {
  var field    = $(id),
      text     = $(id + '-text'),
      checkbox = $('show-' + id);

  if (text) text.style.display = 'none';

  on(checkbox, 'click', function() {
    if (checkbox.checked) {
      field.style.display = 'none';
      text.style.display  = '';
    } else {
      field.style.display = '';
      text.style.display  = 'none';
    }
  });

  on(field, 'keyup', function() { text.value = field.value });
  on(text, 'keyup', function() { field.value = text.value });
};
togglePassword('passphrase');

(function() {
  var message  = $('message'),
      service  = $('service'),
      phrase   = $('passphrase'),
      required = $('required'),
      length   = $('vlength'),
      repeat   = $('repeat'),
      word     = $('word'),
      wordText = $('word-text'),
      TYPES    = 'lower upper number dash space symbol'.split(' ');

  if (service) service.focus();

  var getSettings = function() {
    if (!length) return null;

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
  var defaultSettings = getSettings();

  var update = function() {
    var settings = getSettings();
    if (!settings) return;
    try {
      if (service.value && phrase.value) {
        word.value = new Vault(settings).generate(service.value);
      } else {
        word.value = '';
      }
    } catch (e) {
      word.value = '!! ' + e.message;
    }
  };

  var inputs = document.getElementsByTagName('input');
  for (var i = 0, n = inputs.length; i < n; i++) {
    if (inputs[i].id === 'word' || inputs[i].type === 'checkbox') continue;
    on(inputs[i], 'keyup', update);
    on(inputs[i], 'change', update);
  }

  var fetchSettings = function() {
    if (!store) return;

    message.innerHTML = 'Loading&hellip;';
    message.className = 'active';

    store.serviceSettings(service.value, true, function(error, settings) {
      if (error)
        return message.innerHTML = 'Error';

      phrase.value = settings.phrase || defaultSettings.phrase;
      length.value = settings.length || defaultSettings.length;
      repeat.value = settings.repeat || defaultSettings.repeat || '';

      var value, req, i, n = TYPES.length;

      for (i = 0; i < n; i++) {
        value = settings[TYPES[i]];
        req = req || value;
        setRadio(TYPES[i], value);
      }
      required.value = (req === undefined) ? 2 : req;
      update();
      message.innerHTML = store.getName();
      message.className = '';
    });
  };
  on(service, 'blur', fetchSettings);

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
})();

(function() {
  var connectForm   = $('connectForm'),
      connectResult = $('connectResult'),
      address       = $('address'),
      key           = $('key'),
      feedback      = $('feedback'),
      userDisplay   = $('userId'),
      bookmarkLink  = $('bookmark');

  // TODO check that storage will work in this browser

  var hash      = location.hash.replace(/^#/, ''),
      query     = location.search.replace(/^\?/, ''),
      payload   = hash || query,
      params    = queryparse(payload),
      token     = params.access_token,
      error     = params.error,
      state     = params.state || '',
      keyPair   = localStorage.keyPair,
      size      = Cipher.KEY_SIZE,
      userId    = params.address || state.split(':').slice(1).join(':'),
      masterKey = params.key,
      cipher,
      keys;

  localStorage.clear();

  if (token) {
    if (masterKey) {
      window.store = new Vault.Store(new Vault.RSAdapter(userId, {token: token}), masterKey, {});
      $('message').innerHTML = userId;
    } else {
      masterKey = state.split(':')[0];
      keyPair   = new Buffer(keyPair, 'base64');
      keys      = [keyPair.slice(0, size), keyPair.slice(size, 2 * size)];
      cipher    = new Cipher(keys, {format: 'hex'});

      cipher.decrypt(masterKey, function(error, masterKey) {
        if (error) return feedback.innerHTML = error.message;

        var params   = {access_token: token, address: userId, key: masterKey},
            bookmark = location.protocol + '//' + location.host + '/#' + querystring(params);

        if (!connectForm) return;
        connectForm.style.display = 'none';
        userDisplay.innerHTML = userId;
        bookmarkLink.href = bookmark;
      });
    }
  } else {
    if (error && connectForm) {
      address.value = userId;
      feedback.innerHTML = 'Could not make a connection to ' + userId;
    }
    if (connectResult)
      connectResult.style.display = 'none';
  }

  var connect = function(userId, masterKey) {
    var keys   = Cipher.randomKeys(),
        cipher = new Cipher(keys, {format: 'hex'});

    localStorage.keyPair = Buffer.concat(keys).toString('base64');

    cipher.encrypt(masterKey, function(error, keys) {
      var remote = new Vault.RSAdapter(userId, {state: keys + ':' + userId});
      feedback.innerHTML = 'Connecting&hellip;';
      remote.authorize(function(error) { feedback.innerHTML = error.message });
    });
  };

  on(connectForm, 'submit', function(e) {
    if (e.preventDefault) e.preventDefault();
    else e.returnValue = false;
    connect(address.value, key.value); // TODO error is key is blank
  });
})();

var wordFocused = false;
on(word, 'focus', function(e) {
  wordFocused = true;
});
on(word, 'blur', function(e) {
  wordFocused = false;
});
on(word, 'mouseup', function(e) {
  if (wordFocused) word.setSelectionRange(0, word.value.length);
});
