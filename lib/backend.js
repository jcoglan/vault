(function(factory) {
  var isNode = (typeof require === 'function'),

      Vault   = isNode ? require('./vault') : Vault,
      Store   = isNode ? require('./store') : Vault.Store,
      Helium  = isNode ? require('./backends/helium/backend') : Vault.Backends.Helium,
      Lithium = Store,

      Backend = factory(Vault, Store, [Lithium, Helium]);

  if (isNode)
    module.exports = Backend;
  else
    Vault.Backend = Backend;

})(function(Vault, Store, versions) {

var Backend = function(adapter, key, options) {
  this._adapter = adapter;
  this._local   = new Store(adapter, key, options);
};

Backend.prototype._determineStore = function(callback, context) {
  return callback.call(context, this._local);
};

for (var method in Store.prototype) (function(method) {
  Backend.prototype[method] = function() {
    var args = arguments;

    this._determineStore(function(store) {
      store[method].apply(store, args);
    });
  };
})(method);

return Backend;
});

