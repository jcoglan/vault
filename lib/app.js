var $ = function(id) { return document.getElementById(id); };

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

  text.style.display = 'none';

  on(checkbox, 'click', function() {
    if (checkbox.checked) {
      field.style.display = 'none';
      text.style.display  = '';
    } else {
      field.style.display = '';
      text.style.display  = 'none';
    }
  });

  on(field, 'keyup', function() { text.value = field.value; });
  on(text, 'keyup', function() { field.value = text.value; });
};
togglePassword('passphrase');

var service  = $('service'),
    phrase   = $('passphrase'),
    required = $('required'),
    length   = $('vlength'),
    repeat   = $('repeat'),
    word     = $('word'),
    wordText = $('word-text'),
    TYPES    = 'lower upper number dash space symbol'.split(' ');

service.focus();

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
  var settings = getSettings();
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

// autoselect password on click into input field
on(word, 'click', function(e) {
    this.select();
});

/**
 * Read query parameters from URL and allow repopulation
 * of those values in the input fields of the vault form.
 */
var Repopulate = (function(window, document, undefined) {

  var query = window.location.search || '';
  var pairs = [];
  var params = {};
  query = query.substr(1);

  if (query.length) {
    pairs = query.split('&');
    for (var p in pairs) {
      var key = pairs[p].split('=')[0];

      if (!key.length) {
        continue;
      }

      if (typeof params[key] === 'undefined') {
        params[key] = [];
      }

      params[key].push(
        decodeURIComponent(pairs[p].split('=')[1])
      );
    }
  }

  has = function(name) {
    return !!(params[name] && params[name][0]);
  };

  get = function(name) {
    return params[name];
  };

  getFirst = function(name) {
    if (params[name] && params[name][0]) {
      return params[name][0];
    } else {
      return undefined;
    }
  };

  return {

    updatePageTitle: function() {
      if (has('service')) {
        var title_elem = $('title');
        if (title_elem) {
          title_elem.textContent = get('service') + ' :: Vault';
        }
      }
    },

    fromQueryParams: function() {
      var strings = [
        'service'
      ];

      var nums = [
        'vlength',
        'repeat',
        'required'
      ];

      var elem, value, i;

      for (i = 0; i < strings.length; i++) {
        elem = document.querySelector("input[name=" + strings[i] + "]");
        value = getFirst(strings[i]);
        if (elem && value) {
          elem.value = value;
        }
      }

      for (i = 0; i < nums.length; i++) {
        elem = document.querySelector("input[name=" + nums[i] + "]");
        value = +getFirst(nums[i]);
        if (elem && value) {
          elem.value = value;
        }
      }

      // global TYPES from the above javascript code
      for (i = 0; i < TYPES.length; i++) {
        value = getFirst(TYPES[i]);
        if (value) {
          elem = document.querySelector("input[name=" + TYPES[i] + "][value=" + value + "]");
          if (elem) {
            elem.checked = true;
          }
        }
      }
    }

  };
}
)(window, document);

Repopulate.fromQueryParams();
Repopulate.updatePageTitle();

