(function(factory) {
  var map = Array.prototype.map
          ? function(list, mapper, context) { return list.map(mapper, context) }
          : this.map;

  var isNode  = (typeof module !== 'undefined'),
      request = isNode ? require('../node/request') : this.request,
      oauth   = isNode ? require('remotestorage-oauth') : this.oauth;

  var remoteStorage = factory(map, request, oauth);
  if (isNode)
    module.exports = remoteStorage;
  else
    this.remoteStorage = remoteStorage;

})(function(map, request, oauth) {

var RequestError = function(message) {
  Error.apply(this, arguments);
  this.message = message;
};
var f = function() {};
f.prototype = Error.prototye;
RequestError.prototype = new f();

var remoteStorage = function(clientId, scopes) {
  this._clientId = clientId;
  this._scopes   = scopes;
};

remoteStorage.prototype.connect = function(address, options) {
  return new Connection(this, address, options);
};

remoteStorage.prototype.getScopes = function(version) {
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

    this._options.state = this._address;

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
    if (!url) return callback.call(context, new Error('Could not find remoteStorage endpoints for ' + this._address));

    request('GET', url, {resource: resource}, {}, function(error, response) {
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
        request('GET', template.replace('{uri}', encodeURIComponent(resource)), {}, {}, function(error, response) {
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
        done.call(this, store, auth, 'draft.00');
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

    request('GET', url, {}, headers, function(error, response) {
      this._parseResponse(error, 'GET', response, callback, context);
    }, this);
  }, this);
};

Connection.prototype.put = function(path, type, content, callback, context) {
  this.authorize(function(error, response) {
    if (error) return callback.call(context, error);

    var url     = this._urlFor(path),
        headers = {
          'Authorization': 'Bearer ' + response.token,
          'Content-Type':  type
        };

    request('PUT', url, content, headers, function(error, response) {
      this._parseResponse(error, 'PUT', response, callback, context);
    }, this);
  }, this);
};

Connection.prototype.delete = function(path, callback, context) {
  this.authorize(function(error, response) {
    if (error) return callback.call(context, error);

    var url     = this._urlFor(path),
        headers = {Authorization: 'Bearer ' + response.token};

    request('DELETE', url, {}, headers, function(error, response) {
      this._parseResponse(error, 'DELETE', response, callback, context);
    }, this);
  }, this);
};

Connection.prototype._urlFor = function(path) {
  var root = this._storageUrl;
  if (this._version === '2011.10') root = root.replace(/\/+\{category\}\/*/, '');
  return root + path;
};

Connection.prototype._parseResponse = function(error, method, response, callback, context) {
  var status = response && response.statusCode;

  if (status === 401 || status === 403)
    error = new RequestError('Access denied for "' + this._address + '"');

  if (method === 'PUT' && status >= 400)
    error = new RequestError('Request to "' + this._address + '" failed');

  if (error) return callback.call(context, error);
  if (status < 200 || status >= 300) return callback.call(context, null, null);

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

remoteStorage.RequestError = RequestError;
return remoteStorage;
});

