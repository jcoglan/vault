var async  = require('async'),
    child  = require('child_process'),
    crypto = require('crypto'),
    fs     = require('fs'),
    mkdirp = require('mkdirp'),
    path   = require('path');

var Editor = function(path) {
  this._path   = path;
  this._editor = process.env.EDITOR || process.env.VISUAL;
};

Editor.DEFAULT_EDITOR = 'vim';

Editor.editTempfile = function(content, callback, context) {
  var path = '/tmp/' + crypto.randomBytes(16).toString('hex');
  return this.edit(path, content, callback, context);
};

Editor.edit = function(path, content, callback, context) {
  new Editor(path).edit(content, callback, context);
};

Editor.prototype.edit = function(content, callback, context) {
  if (!this._editor)
    return callback.call(context, new Error('No editor detected, please set $EDITOR and retry'));

  var _path  = this._path,
      editor = this._editor;

  async.waterfall([
    function(next) {
      mkdirp(path.dirname(_path), next);
    },
    function(_, next) {
      fs.writeFile(_path, content, next);
    },
    function(next) {
      var proc = child.spawn(editor, [_path], {stdio: [0,1,2]});
      proc.addListener('exit', function(status) {
        next(status === 0 ? null : new Error('Editor exited with non-zero status (' + status + ')'));
      });
    },
    function(next) {
      fs.readFile(_path, next);
    },
    function(content, next) {
      fs.unlink(_path, function(error) { next(error, content) });
    }
  ],
  function(error, content) {
    callback.call(context, error, content && content.toString('utf8'));
  });
};

module.exports = Editor;

