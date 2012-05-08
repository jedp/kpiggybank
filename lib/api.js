var http = require('http');
var qs = require('querystring');

function makeQueryString(options) {
  var values = [];
  var key;
  for (key in options) {
    if (options.hasOwnProperty(key)) {
      values.push(key + '=' + options[key]);
    }
  }

  if (values.length > 0) {
    return "?" + values.join("&");
  } else {
    return "";
  }
}

var KPIggyBank = function KPIggyBank(host, port) {
  this.host = host;
  this.port = port;
};

KPIggyBank.prototype.saveData = function saveData(interaction_data, callback) {
  callback = callback || function() {};
  var post_data = qs.stringify(interaction_data);

  var req = http.request(
    {
      host: this.host,
      port: this.port,
      path: '/wsapi/interaction_data',
      method: 'POST',
      headers: {
        'Content-type': 'application/x-www-form-urlencoded',
        'Content-length': post_data.length
      }
    }, 
    function(res) {
      res.on('error', function(err) {
        return callback(err);
      });

      res.on('end', function() {
        return callback(null);
      });
    });

  // without an error handler, this would crash if the 
  // service were unavailable
  req.on("error", function(err) {
    return callback(err);
  });

  req.write(post_data);
  req.end();
};

/*
 * a utility GET function for api calls
 */
KPIggyBank.prototype._get = function(path, options, callback) {
  var query;
  var results = "";

  if (arguments.length === 2) {
    callback = options;
    options = {};
  }

  http.get({
    host: this.host,
    port: this.port,
    path: path + makeQueryString(options)
  }, function(res) {

    res.on('data', function(data) { 
      results += data; 
    });

    res.on('end', function() {
      return callback(null, JSON.parse(results));
    });

    res.on('error', function(err) {
      return callback(err);
    });

  }).on('error', function(err) {
    console.error(err);
    return callback(err);
  });
};

/*
 * count(callback) -> [err, int]
 */

KPIggyBank.prototype.count = function(callback) {
  this._get('/wsapi/interaction_data/count', {}, function(err, stringResult) {
    return callback(err, parseInt(stringResult, 10));
  });
};

/*
 * fetchRange(options, callback) -> [err, list]
 */

KPIggyBank.prototype.fetchRange = function(options, callback) {
  if (arguments.length === 1) {
    callback = options;
    options = {};
  }

  // sanitize options
  var _options = {};
  if (options.start) { _options.start = options.start }
  if (options.end) { _options.end = options.end }

  this._get('/wsapi/interaction_data', _options, callback);
};

module.exports = KPIggyBank;
