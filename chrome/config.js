Config = {
  clear: function() {
    delete localStorage.vaultSettings;
  },
  
  edit: function(transform) {
    var config = this._readFile();
    transform(config);
    var json = JSON.stringify(config);
    localStorage.vaultSettings = json;
  },
  
  read: function(service) {
    var config   = this._readFile(),
        settings = {};
    
    Vault.extend(settings, config.services[service] || {});
    Vault.extend(settings, config, function(value) { return typeof value !== 'object' });
    return settings;
  },
  
  _readFile: function() {
    if (localStorage.vaultSettings) {
      return JSON.parse(localStorage.vaultSettings);
    } else {
      return {services: {}};
    }
  }
};
