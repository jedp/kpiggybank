var http = require('http');
var qs = require('querystring');
var events = require('events');
var util = require('util');
var request = require('request');
var Parser = require('./parser');

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
  events.EventEmitter.call(this);
  var self = this;

  this.host = host;
  this.port = port;
  this.parser = new Parser();

  this._followingChanges = false;

  this.parser.on('change', function(change) {
    // emit the document
    self.emit('change', change.doc);
  });

  this.parser.on('error', function(err) {
    console.error(err);
  });


  return this;
};
util.inherits(KPIggyBank, events.EventEmitter);

KPIggyBank.prototype.saveData = function saveData(interaction_data, callback) {
  callback = callback || function() {};
  var uri = 'http://' + this.host + ':' + this.port + '/wsapi/interaction_data';
  request.post({
    uri: uri,
    json: interaction_data
  }, function(err, res, body) {
    if (res.statusCode === 201) {
      return callback(null, true);
    } else {
      return callback(res.statusCode);
    }
  });
};

KPIggyBank.prototype.followChanges = function() {
  if (this._followingChanges) return (null);

  this._followingChanges = true;

  var self = this;
  var req = http.get({
      host: this.host,
      port: this.port,
      path: '/wsapi/interaction_data/stream'
  }, function(res) {
    res.on('data', function(data) {
      // each time the parser finds a valid json blob, it 
      // will emit it as a 'change'.  We catch these 'change' 
      // emissions and re-emit them as 'change' events.
      self.parser.read(data);
    });
  });
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

KPIggyBank.prototype.changes = function(callback) {
  var self = this;
  this._get('/wsapi/interaction_data/stream', {}, function(err, data) {
    self.emit('change', data);
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
