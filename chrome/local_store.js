LocalStore = {
  clear: function(callback, context) {
    delete localStorage.vaultSettings;
    callback.call(context, null);
  },
  
  load: function(callback, context) {
    var json = localStorage.vaultSettings;
    if (json) {
      callback.call(context, null, JSON.parse(json));
    } else {
      callback.call(context, null, {global: {}, services: {}});
    }
  },
  
  dump: function(config, callback, context) {
    localStorage.vaultSettings = JSON.stringify(config);
    callback.call(context, null);
  }
};

