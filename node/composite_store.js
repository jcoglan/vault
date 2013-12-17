var CompositeStore = function(local) {
  this._local = local;
};

var single = function(name) {
  CompositeStore.prototype[name] = function() {
    var args     = Array.prototype.slice.call(arguments),
        arity    = this._local[name].length,
        params   = args.slice(0, arity - 2),
        callback = args[arity - 2],
        context  = args[arity - 1];

    this._local.currentStore(function(error, store) {
      if (error) return callback.call(context, error);

      params.push(function(error) {
        var result = [error, store.getName()].concat(Array.prototype.slice.call(arguments, 1));
        callback.apply(context, result);
      });
      var method = store[name];
      method.apply(store, params);
    }, this);
  };
};

var resolveConcat = function(results, callback, context) {
  output = Object.keys(results)
             .map(function(s) { return results[s] })
             .reduce(function(a, b) { return a.concat(b) });

  callback.call(context, null, output);
};

var resolveChoice = function(results, backends, current, name, params, callback, context) {
  var candidates = Object.keys(results);
      selected   = (candidates.length === 1) ? candidates[0] : current,
      method     = backends[selected][name];

  params.push(function(error, result) {
    callback.call(context, null, result);
  });
  method.apply(backends[selected], params);
};

var multi = function(name, concat) {
  CompositeStore.prototype[name] = function() {
    var args     = Array.prototype.slice.call(arguments),
        arity    = this._local[name].length,
        params   = args.slice(0, arity - 2),
        callback = args[arity - 2],
        context  = args[arity - 1];

    if (this._source)
      return this._local.getStore(this._source, function(error, store) {
        if (error) return callback.call(context, error);
        store[name].apply(store, args);
      });

    this._local.listSources(function(error, stores, current) {
      if (error) return callback.call(context, error);

      var backends = {},
          results  = {},
          length   = stores.length,
          complete = 0,
          called   = false;

      var collect = function(storeName, error, result) {
        if (called) return;
        if (concat || result !== null) results[storeName] = result;
        complete += 1;
        if (error) {
          callback.call(context, error);
          called = true;
        } else if (complete === length) {
          if (concat)
            resolveConcat(results, callback, context);
          else
            resolveChoice(results, backends, current, name, params, callback, context);

          called = true;
        }
      };

      stores.forEach(function(source) {
        this._local.getStore(source, function(error, store) {
          backends[source] = store;

          var method  = store[name],
              message = params.slice();

          message.push(function(error, result) {
            collect(store.getName(), error, result);
          });
          message[arity - 3] = false;
          method.apply(store, message);
        });
      }, this);
    }, this);
  };
};

var local = function(name) {
  CompositeStore.prototype[name] = function() {
    var method = this._local[name];
    return method.apply(this._local, arguments);
  };
};

CompositeStore.prototype.setSource = function(source) {
  this._source = source;
  return this._local.setSource(source);
};

local('addSource');
local('currentStore');
local('deleteSource');
local('listSources');
local('setDefaultSource');
local('showSource');

single('clear');
single('deleteGlobals');
single('deleteService');
single('export');
single('import');
single('saveGlobals');
single('saveService');

multi('listServices', true);
multi('serviceSettings', false);

module.exports = CompositeStore;

