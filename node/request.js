var http  = require('http'),
    https = require('https'),
    fs    = require('fs'),
    url   = require('url'),
    qs    = require('querystring'),
    Vault = require('../lib/vault');

module.exports = function(method, _url, params, headers, options, callback, context) {
  var uri    = url.parse(_url),
      client = (uri.protocol === 'https:') ? https : http,
      path   = uri.path,
      sep    = /\?/.test(path) ? '&' : '?';

  if (typeof params === 'string')  params = new Buffer(params, 'utf8');
  if (!(params instanceof Buffer)) params = new Buffer(qs.stringify(params), 'utf8');

  if (method === 'GET') {
    params = params.toString();
    if (params !== '') path = path + sep + params;
  }
  else if (method === 'PUT') {
    headers['Content-Length'] = params.length.toString();
  }
  else if (method === 'DELETE') {
    headers['Content-Length'] = '0';
  }

  var requestOptions = {
    method:   method,
    host:     uri.hostname,
    port:     uri.port || (client === https ? 443 : 80),
    path:     path,
    headers:  headers
  };
  Vault.extend(requestOptions, options);
  var req = client.request(requestOptions);

  req.on('response', function(response) {
    var chunks = [],
        length = 0;

    response.on('data', function(chunk) {
      chunks.push(chunk);
      length += chunk.length;
    });
    response.on('end', function() {
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

  req.on('error', function(error) {
    callback.call(context, error);
  });

  if (method === 'PUT') req.write(params);
  req.end();
};

