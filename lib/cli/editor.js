var child   = require('child_process'),
    crypto  = require('crypto'),
    fs      = require('fs'),
    path    = require('path'),
    Promise = require('storeroom').Promise;

var Editor = function(path) {
  this._path   = path;
  this._editor = process.env.EDITOR || process.env.VISUAL;
};

Editor.DEFAULT_EDITOR = 'vim';

Editor.editTempfile = function(content) {
  var path = '/tmp/' + crypto.randomBytes(16).toString('hex');
  return this.edit(path, content);
};

Editor.edit = function(path, content) {
  return new Editor(path).edit(content);
};

Editor.prototype.edit = function(content) {
  if (!this._editor)
    return Promise.reject(new Error('No editor detected, please set EDITOR and retry'));

  var _path  = this._path,
      editor = this._editor;

  fs.writeFileSync(_path, content);

  var proc = child.spawn(editor, [_path], {stdio: [0, 1, 2]});

  return new Promise(function(resolve, reject) {
    proc.on('exit', function(status) {
      if (status === 0)
        resolve();
      else
        reject(new Error('Editor exited with non-zero status (' + status + ')'));
    });
  }).then(function() {
    var content = fs.readFileSync(_path, 'utf8');
    fs.unlinkSync(_path);

    return content;
  });
};

module.exports = Editor;
