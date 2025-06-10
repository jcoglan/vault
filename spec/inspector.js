'use strict';

var path   = require('path'),
    escodb = require('../lib/escodb');

async function streamToArray(stream) {
  let items = []
  for await (let item of stream) {
    items.push(item)
  }
  return items
}

function list(name, store) {
  return streamToArray(store.find('/')).then(function(entries) {
    return Promise.all([
      entries,
      Promise.all(entries.map((e) => store.get('/' + e)))
    ]);

  }).then(function(results) {
    console.log('\n---- ' + name + ' ----\n');

    results[0].forEach(function(entry, i) {
      console.log('/' + entry, results[1][i])
    });
  });
}

var local = escodb.createStore({
  password: process.env.VAULT_KEY,
  adapter:  escodb.createFileAdapter(path.resolve(process.env.VAULT_PATH))
});

local.then(function(store) {
  list('LOCAL', store);
});
