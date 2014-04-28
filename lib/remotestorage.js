(function(factory) {
  var map = Array.prototype.map
          ? function(list, mapper, context) { return list.map(mapper, context) }
          : window.map;

  var isNode = (typeof require === 'function'),

      oauth   = isNode ? require('remotestorage-oauth') : window.oauth,
      request = isNode ? require('../node/request')     : window.request,

      RemoteStorage = factory(map, request, oauth);

  if (isNode)
    module.exports = RemoteStorage;
  else
    window.RemoteStorage = RemoteStorage;

})(function(map, request, oauth) {

var RequestError = function(message) {
  Error.apply(this, arguments);
  this.message = message;
};
var f = function() {};
f.prototype = Error.prototye;
RequestError.prototype = new f();

var RemoteStorage = function(clientId, scopes) {
  this._clientId = clientId;
  this._scopes   = scopes;
};

RemoteStorage.prototype.connect = function(address, options) {
  return new Connection(this, address, options);
};

RemoteStorage.prototype.getScopes = function(version) {
  var scopes = [], scope;
  for (var key in this._scopes) {
    scope = key;
    if (version !== '2011.10') scope += ':' + this._scopes[key].join('');
    scopes.push(scope);
  }
  return scopes;
};

var Connection = function(client, address, options) {
  var parts     = address.split('@');
  this._client  = client;
  this._address = address;
  this._user    = parts[0];
  this._host    = parts[1];
  this._options = options || {};

  this._requestOpts = {};
  if (this._options.ca) this._requestOpts.ca = new Buffer(this._options.ca, 'utf8');

  this._storageUrl = this._options.storage;
  this._oauthUrl   = this._options.oauth;
  this._version    = this._options.version;
  this._token      = this._options.token;
};

Connection.prototype._storageDetails = function() {
  return {
    storage: this._storageUrl,
    oauth:   this._oauthUrl,
    version: this._version,
    token:   this._token
  };
};

Connection.prototype.authorize = function(callback, context) {
  this.discover(function(error, response) {
    if (error) return callback.call(context, error);
    if (this._token) return callback.call(context, null, this._storageDetails());

    var url      = response.oauth,
        clientId = this._client._clientId,
        scopes   = this._client.getScopes(this._version),
        self     = this;

    oauth.authorize(url, clientId, scopes, this._options, function(error, token) {
      if (error) return callback.call(context, error);
      self._token = token.access_token;
      callback.call(context, null, self._storageDetails());
    });
  }, this);
};

Connection.prototype.discover = function(callback, context) {
  if (this._storageUrl)
    return callback.call(context, null, this._storageDetails());

  var resource = 'acct:' + this._user + '@' + this._host,

      urls = map(['https', 'http'], function(scheme) {
        return scheme + '://' + this._host + '/.well-known/host-meta.json';
      }, this);

  var attempt = function(index) {
    var url = urls[index];
    if (!url) return callback.call(context, new Error('Could not find RemoteStorage endpoints for ' + this._address));

    request('GET', url, {resource: resource}, {}, this._requestOpts, function(error, response) {
      if (error) return attempt.call(this, index + 1);
      var jrd, link, template, store, auth;

      try {
        jrd      = JSON.parse(response.body.toString('utf8'));
        link     = jrd.links[0];
        template = link.template;
        auth     = (link.properties || {})['auth-endpoint'];
        store    = link.href;
      } catch (e) {
        return attempt.call(this, index + 1);
      }

      if (template) {
        request('GET', template.replace('{uri}', encodeURIComponent(resource)), {}, {}, this._requestOpts, function(error, response) {
          if (error) return attempt.call(this, index + 1);
          try {
            jrd   = JSON.parse(response.body.toString('utf8'));
            link  = jrd.links[0];
            auth  = link.auth;
            store = link.template;
          } catch (e) {
            return attempt.call(this, index + 1);
          }
          done.call(this, store, auth, '2011.10');
        }, this);
      } else {
        done.call(this, store, auth, '2012.04');
      }
    }, this);
  };

  var done = function(store, oauth, version) {
    this._storageUrl = store;
    this._oauthUrl   = oauth;
    this._version    = version;
    callback.call(context, null, this._storageDetails());
  };

  attempt.call(this, 0);
};

Connection.prototype.get = function(path, callback, context) {
  this.authorize(function(error, response) {
    if (error) return callback.call(context, error);

    var url     = this._urlFor(path),
        headers = {Authorization: 'Bearer ' + response.token};

    request('GET', url, {}, headers, this._requestOpts, function(error, response) {
      this._parseResponse(error, 'GET', response, callback, context);
    }, this);
  }, this);
};

Connection.prototype.put = function(path, type, data, callback, context) {
  this.authorize(function(error, response) {
    if (error) return callback.call(context, error);

    var url     = this._urlFor(path),
        headers = {
          'Authorization': 'Bearer ' + response.token,
          'Content-Type':  type
        };

    request('PUT', url, data, headers, this._requestOpts, function(error, response) {
      this._parseResponse(error, 'PUT', response, callback, context);
    }, this);
  }, this);
};

Connection.prototype.delete = function(path, callback, context) {
  this.authorize(function(error, response) {
    if (error) return callback.call(context, error);

    var url     = this._urlFor(path),
        headers = {Authorization: 'Bearer ' + response.token};

    request('DELETE', url, {}, headers, this._requestOpts, function(error, response) {
      this._parseResponse(error, 'DELETE', response, callback, context);
    }, this);
  }, this);
};

Connection.prototype._urlFor = function(path) {
  var root = this._storageUrl;
  if (this._version === '2011.10') root = root.replace(/\/+\{category\}\/*/, '');
  return root + path.replace(/^\/*/, '/');
};

Connection.prototype._parseResponse = function(error, method, response, callback, context) {
  var status = response && response.statusCode;

  if (status === 401 || status === 403)
    error = new RequestError('Access denied for "' + this._address + '"');

  if (method === 'PUT' && status >= 400)
    error = new RequestError('Request to "' + this._address + '" failed');

  if (error) return callback.call(context, error);
  if (status < 200 || status >= 300) return callback.call(context, null, null);

  var data = response.body,
      type = response.headers['content-type'],
      etag = response.headers['etag'];

  callback.call(context, null, {data: data, type: type, version: etag});
};

RemoteStorage.RequestError = RequestError;
return RemoteStorage;
});

