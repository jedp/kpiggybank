var http = require('http');
var qs = require('querystring');
var events = require('events');
var util = require('util');
var request = require('request');
var Parser = require('./parser');
var logger = require('./logging').error;

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

  this.parser.on('change', function onChangeCallback(change) {
    // emit the document
    self.emit('change', change.doc);
  });

  this.parser.on('error', function onErrorCallback(err) {
    logger.error("Parser error: " + err);
  });


  return this;
};
util.inherits(KPIggyBank, events.EventEmitter);

KPIggyBank.prototype.saveData = function saveData(interaction_data, callback) {
  callback = callback || function() {};
  var uri = 'http://' + this.host + ':' + this.port + '/wsapi/interaction_data';
  request.post({
    headers: {'content-type' : 'application/x-www-form-urlencoded'},
    uri: uri,
    body: qs.stringify({data: JSON.stringify(interaction_data)})
  }, function postRequestCallback(err, res, body) {
    if (err) return callback(err);

    if (!res) return callback(new Error("No response from server"));

    if (res.statusCode === 201) {
      return callback(null, true);
    } else {
      return callback(res.statusCode);
    }
  });
};

KPIggyBank.prototype.followChanges = function followChanges() {
  if (this._followingChanges) return (null);

  this._followingChanges = true;

  // XXX this needs to keep the connection open

  var self = this;
  var req = http.get({
      host: this.host,
      port: this.port,
      path: '/wsapi/interaction_data/stream'
  }, function getRequestCallback(res) {
    res.on('data', function onData(data) {
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
KPIggyBank.prototype._get = function _get(path, options, callback) {
  var query;
  var results = "";

  if (arguments.length === 2) {
    callback = options;
    options = {};
  }

  var url = 'http://' + this.host + ':' + this.port + path +makeQueryString(options);

  request.get({url:url}, function getRequest(err, res, data) {
    if (err) return callback(err);
    return callback(err, JSON.parse(data));
  });
};

/*
 * count(callback) -> [err, int]
 */

KPIggyBank.prototype.count = function count(callback) {
  this._get('/wsapi/interaction_data/count', {}, function countCallback(err, stringResult) {
    return callback(err, parseInt(stringResult, 10));
  });
};

KPIggyBank.prototype.changes = function changes(callback) {
  var self = this;
  this._get('/wsapi/interaction_data/stream', {}, function changesCallback(err, data) {
    self.emit('change', data);
  });
};

/*
 * fetchRange(options, callback) -> [err, list]
 */

KPIggyBank.prototype.fetchRange = function fetchRange(options, callback) {
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
