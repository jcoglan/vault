var fs     = require('fs'),
    path   = require('path'),
    mkdirp = require('mkdirp'),
    rmrf   = require('rimraf');

var FileAdapter = function(pathname) {
  this._path = pathname;
};

FileAdapter.prototype.getName = function() {
  return 'local';
};

FileAdapter.prototype.getType = function() {
  return 'filesystem';
};

FileAdapter.prototype.load = function(pathname, callback, context) {
  var fullPath = path.join(this._path, pathname);

  fs.readFile(fullPath, function(error, content) {
    if (error) return callback.call(context, null, null);
    callback.call(context, null, content.toString('utf8'));
  });
};

FileAdapter.prototype.dump = function(pathname, content, callback, context) {
  var fullPath = path.join(this._path, pathname);

  mkdirp(path.dirname(fullPath), function() {
    fs.writeFile(fullPath, content, function(error) {
      if (callback) callback.call(context, error);
    });
  });
};

FileAdapter.prototype.remove = function(pathname, callback, context) {
  var fullPath = path.join(this._path, pathname);

  rmrf(fullPath, function(error) {
    if (callback) callback.call(context, error);
  });
};

module.exports = FileAdapter;

