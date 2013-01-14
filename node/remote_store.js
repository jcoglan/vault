var Vault = require('../lib/vault'),
    http  = require('http'),
    https = require('https'),
    url   = require('url'),
    qs    = require('querystring'),
    oauth = require('remotestorage-oauth');

var RemoteStore = function() {
  this._user = 'me';
  this._host = 'local.dev';
};

RemoteStore.prototype.export = function(callback, context) {
  // TODO
};

RemoteStore.prototype.import = function(json, callback, context) {
  // TODO
};

RemoteStore.prototype.listServices = function(callback, context) {
  this._withAuth(function(error, root, token) {
    if (error) return callback.call(context, error);

    var uri     = url.parse(root),
        path    = uri.pathname + '/vault/services/',
        headers = {Authorization: 'Bearer ' + token};

    this._request('GET', uri.host, path, {}, headers, function(error, response) {
      if (error) return callback.call(context, error);
      var services = Object.keys(JSON.parse(response.body.toString('utf8')));
      callback.call(context, null, services);
    });
  }, this);
};

RemoteStore.prototype.saveGlobals = function(settings, callback, context) {
  this._save('/vault/global', settings, callback, context);
};

RemoteStore.prototype.saveService = function(service, settings, callback, context) {
  this._save('/vault/services/' + service, settings, callback, context);
};

RemoteStore.prototype._save = function(path, settings, callback, context) {
  this._withAuth(function(error, root, token) {
    if (error) return callback.call(context, error);

    var uri     = url.parse(root);
        path    = uri.pathname + path,
        headers = {Authorization: 'Bearer ' + token},
        updated = {};

    this._read(uri.host, path, headers, function(error, saved) {
      if (error) return callback.call(cotnext, error);

      Vault.extend(updated, settings);
      Vault.extend(updated, saved);

      var payload = JSON.stringify(updated, true, 2);
      headers['Content-Type'] = 'application/json';

      this._request('PUT', uri.host, path, payload, headers, callback, context);
    }, this);
  }, this);
};

RemoteStore.prototype._read = function(host, path, headers, callback, context) {
  this._request('GET', host, path, {}, headers, function(error, response) {
    if (error) return callback.call(context, error);

    var payload = (response.statusCode === 200)
                ? JSON.parse(response.body.toString('utf8'))
                : {};

    callback.call(context, null, payload);
  });
};
     
RemoteStore.prototype.serviceSettings = function(service, callback, context) {
  this._withAuth(function(error, root, token) {
    var uri     = url.parse(root),
        global  = uri.pathname + '/vault/global',
        local   = uri.pathname + '/vault/services/' + service,
        headers = {Authorization: 'Bearer ' + token};

    this._read(uri.host, global, headers, function(error, globalSettings) {
      this._read(uri.host, local, headers, function(error, localSettings) {
        Vault.extend(localSettings, globalSettings);
        callback.call(context, null, localSettings);
      });
    }, this);
  }, this);
};

RemoteStore.prototype._withAuth = function(callback, context) {
  if (this._token) return callback.call(context, null, this._root, this._token);

  var resource = 'acct:' + this._user + '@' + this._host;

  this._request('GET', this._host, '/.well-known/host-meta.json', {resource: resource}, {}, function(error, response) {
    var jrd  = JSON.parse(response.body.toString('utf8')),
        url  = jrd.links[0].properties['auth-endpoint'],
        self = this;

    oauth.authorize(url, 'Vault', ['vault:rw'], {}, function(error, token) {
      self._root  = jrd.links[0].href;
      self._token = token.access_token;
      callback.call(context, null, self._root, self._token);
    });
  }, this);
};

RemoteStore.prototype._request = function(method, host, path, params, headers, callback, context) {
  if (typeof params === 'string')  params = new Buffer(params, 'utf8');
  if (!(params instanceof Buffer)) params = new Buffer(qs.stringify(params), 'utf8');

  if (method === 'GET') path = path + '?' + params.toString();
  if (method === 'PUT') headers['Content-Length'] = params.length;

  var request = https.request({
    method:   method,
    host:     host,
    path:     path,
    headers:  headers
  });

  request.on('response', function(response) {
    var chunks = [],
        length = 0;

    response.addListener('data', function(chunk) {
      chunks.push(chunk);
      length += chunk.length;
    });
    response.addListener('end', function() {
      var buffer = new Buffer(length),
          offset = 0;

      for (var i = 0, n = chunks.length; i < n; i++) {
        chunks[i].copy(buffer, offset);
        offset += chunks[i].length;
      }
      response.body = buffer;
      callback.call(context, null, response);
    });
  });

  if (method === 'PUT') request.write(params);
  request.end();
};

module.exports = RemoteStore;

