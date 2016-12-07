'use strict';

var forEach = Array.prototype.forEach,
    hasOwn  = Object.prototype.hasOwnProperty;

var assign = function(target) {
  forEach.call(arguments, function(source, i) {
    if (i === 0) return;

    for (var key in source) {
      if (hasOwn.call(source, key)) target[key] = source[key];
    }
  });

  return target;
};

var sortObject = function(object) {
  if (!object) return object;
  if (typeof object !== 'object') return object;
  if (Array.isArray(object)) return object;

  var copy = {};

  Object.keys(object).sort().forEach(function(key) {
    copy[key] = sortObject(object[key]);
  });

  return copy;
};

var unique = function(array) {
  var set = {};
  array.forEach(function(item) { set[item] = true });
  return Object.keys(set).sort();
};

module.exports = {
  assign:     assign,
  sortObject: sortObject,
  unique:     unique
};
