'use strict';

var path      = require('path'),
    storeroom = require('storeroom'),
    Promise   = storeroom.Promise;

var local = storeroom.createStore({
  password: process.env.VAULT_KEY,
  adapter:  storeroom.createFileAdapter(path.resolve(process.env.VAULT_PATH))
});

function list(name, store) {
  return store.findRecursive('/').then(function(entries) {
    return Promise.all([
      entries,
      Promise.all(entries.map(store.get, store))
    ]);

  }).then(function(results) {
    console.log('\n---- ' + name + ' ----\n');

    results[0].forEach(function(entry, i) {
      console.log('/' + entry, results[1][i])
    });
  });
}

list('LOCAL', local);

var DIR = '/sources/sessions/';

local.entries(DIR).then(function(sources) {
  return Promise.all(sources.map(function(s) { return local.get(DIR + s) }));

}).then(function(sessions) {
  sessions.forEach(function(source) {
    var store = storeroom.createStore({
      password: source.options.key,
      adapter:  storeroom.createRemoteStorageAdapter(source.session)
    });
    list(source.session.address, store);
  });
});
