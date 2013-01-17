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
  var service  = $('service'),
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
      feedback      = $('feedback'),
      userDisplay   = $('userId'),
      bookmarkLink  = $('bookmark'),

      storage = new remoteStorage('getvau.lt', {vault: ['r', 'w']}),
      hash    = window.location.hash.replace(/^#/, ''),
      query   = window.location.search.replace(/^\?/, ''),
      payload = hash || query,
      params  = queryparse(payload),
      token   = params.access_token,
      error   = params.error,
      url     = window.location,
      local   = window.localStorage,
      userId  = params.state || (local && local.userId) || '',
      bookmark;

  if (local) delete local.userId;

  if (error && connectForm) {
    address.value = userId;
    feedback.innerHTML = 'Could not make a connection to ' + userId;
  }
  else if (token) {
    if (connectForm) {
      connectForm.style.display = 'none';
      userDisplay.innerHTML = userId;
      bookmarkLink.href = bookmark;
    }
  }
  else {
    if (connectResult)
      connectResult.style.display = 'none';
  }

  var connect = function(id) {
    var conn = storage.connect(id);
    if (local) local.userId = id;
    feedback.innerHTML = 'Connecting&hellip;';
    conn.authorize(function(error) {
      feedback.innerHTML = error;
    });
  };

  on(connectForm, 'submit', function(e) {
    if (e.preventDefault) e.preventDefault();
    else e.returnValue = false;
    connect(address.value);
  });
})();

