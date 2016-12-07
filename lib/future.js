'use strict';

var Promise = require('storeroom').Promise;

// TODO: turn these into bulk operations that cache bucket reads

var IS_DIR = /\/$/;

var future = {
  findRecursive: function(storeroom, dirname, prefix) {
    prefix = prefix || '';

    return storeroom.entries(dirname).then(function(entries) {
      var lists = entries.map(function(entry) {
        var fullPath = prefix + entry;

        return IS_DIR.test(entry)
             ? future.findRecursive(storeroom, dirname + entry, fullPath)
             : [fullPath];
      });
      return Promise.all(lists);

    }).then(function(lists) {
      return lists.reduce(function(a, b) { return a.concat(b) }, []);
    });
  },

  // TODO: maybe we can optimise this by deletion directories immediately rather
  // than incrementally as items are removed
  removeRecursive: function(storeroom, dirname) {
    return this.findRecursive(storeroom, dirname).then(function(items) {
      var deletions = items.map(function(item) { return storeroom.remove(dirname + item) });
      return Promise.all(deletions);
    });
  }
};

module.exports = future;
