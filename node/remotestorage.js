var http  = require('http'),
    https = require('https'),
    url   = require('url'),
    qs    = require('querystring'),
    oauth = require('remotestorage-oauth');

var UnauthorizedError = function() {};
require('util').inherits(UnauthorizedError, Error);

var remoteStorage = function(clientId, scopes) {
  this._clientId = clientId;
  this._scopes   = scopes;
};

remoteStorage.prototype.connect = function(address, options) {
  return new Connection(this, address, options);
};

var Connection = function(client, address, options) {
  var parts     = address.split('@');
  this._client  = client;
  this._address = address;
  this._user    = parts[0];
  this._host    = parts[1];
  this._options = options || {};
};

Connection.prototype._storageDetails = function() {
  return {
    storage: this._storageUrl,
    oauth:   this._oauthUrl,
    token:   this._token
  };
};

Connection.prototype.connect = function(callback, context) {
  if (this._token) return callback.call(context, null, this._storageDetails());

  this.discover(function(error, response) {
    if (error) return callback.call(context, error);

    this._storageUrl = response.storage;
    this._oauthUrl   = response.oauth;

    var url      = response.oauth,
        clientId = this._client._clientId,
        scopes   = this._client._scopes,
        self     = this;

    oauth.authorize(url, clientId, scopes, this._options, function(error, token) {
      if (error) return callback.call(context, error);
      self._token = token.access_token;
      callback.call(context, null, self._storageDetails());
    });
  }, this);
};

Connection.prototype.discover = function(callback, context) {
  var resource = 'acct:' + this._user + '@' + this._host,

      urls = ['https', 'http'].map(function(scheme) {
        return scheme + '://' + this._host + '/.well-known/host-meta.json';
      }, this);

  var attempt = function(index) {
    var url = urls[index];
    if (!url) return callback.call(context, new Error('Could not find remoteStorage endpoints for ' + this._address));

    request('GET', url, {resource: resource}, {}, function(error, response) {
      if (error) return attempt.call(this, index + 1);
      var jrd, store, auth, self = this;

      try {
        jrd   = JSON.parse(response.body.toString('utf8'));
        store = jrd.links[0].href;
        auth  = jrd.links[0].properties['auth-endpoint'];
      } catch (e) {
        return attempt.call(this, index + 1);
      }

      callback.call(context, null, {storage: store, oauth: auth});
    }, this);
  };

  attempt.call(this, 0);
};

Connection.prototype.get = function(path, callback, context) {
  this.connect(function(error, response) {
    if (error) return callback.call(context, error);

    var url     = response.storage + path,
        headers = {Authorization: 'Bearer ' + response.token};

    request('GET', url, {}, headers, function(error, response) {
      this._parseResponse(error, response, callback, context);
    }, this);
  }, this);
};

Connection.prototype.put = function(path, type, content, callback, context) {
  this.connect(function(error, response) {
    if (error) return callback.call(context, error);

    var url     = response.storage + path,
        headers = {
          'Authorization': 'Bearer ' + response.token,
          'Content-Type':  type
        };

    request('PUT', url, content, headers, function(error, response) {
      this._parseResponse(error, response, callback, context);
    }, this);
  }, this);
};

Connection.prototype.delete = function(path, callback, context) {
  this.connect(function(error, response) {
    if (error) return callback.call(context, error);

    var url     = response.storage + path,
        headers = {Authorization: 'Bearer ' + response.token};

    request('DELETE', url, {}, headers, function(error, response) {
      this._parseResponse(error, response, callback, context);
    }, this);
  }, this);
};

Connection.prototype._parseResponse = function(error, response, callback, context) {
  var status = response && response.statusCode;
  if (status === 401 || status === 403)
    error = new UnauthorizedError();

  if (error) return callback.call(context, error);
  if (status !== 200) return callback.call(context, null, null);

  var content  = response.body,
      type     = response.headers['content-type'],
      etag     = response.headers['etag'],
      modified = response.headers['last-modified'],

      time     = etag     ? new Date(parseInt(etag, 10))
               : modified ? new Date(modified)
                          : null;

  callback.call(context, null, {
    content:  content,
    type:     type,
    version:  etag,
    modified: time
  });
};

var request = function(method, _url, params, headers, callback, context) {
  var uri    = url.parse(_url),
      client = (uri.protocol === 'https:') ? https : http,
      path   = uri.path,
      sep    = /\?/.test(path) ? '&' : '?';

  if (typeof params === 'string')  params = new Buffer(params, 'utf8');
  if (!(params instanceof Buffer)) params = new Buffer(qs.stringify(params), 'utf8');

  if (method === 'GET') path = path + sep + params.toString();
  if (method === 'PUT') headers['Content-Length'] = params.length;

  var req = client.request({
    method:   method,
    host:     uri.hostname,
    port:     uri.port || (client === https ? 443 : 80),
    path:     path,
    headers:  headers
  });

  req.addListener('response', function(response) {
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

  req.addListener('error', function(error) {
    callback.call(context, error);
  });

  if (method === 'PUT') req.write(params);
  req.end();
};

module.exports = remoteStorage;
remoteStorage.UnauthorizedError = UnauthorizedError;

