var crypto = require('crypto')
var uscore = require('underscore');
var logger = require('../logging').logger;

function createId(data) {
  return crypto.createHash('sha1')
    .update(JSON.stringify(data))
    .update((new Date()).getTime().toString())
    .update(Math.random().toString())
    .digest('hex');
}

/*
 * in memory db
 * not persistent
 * for testing only
 */
var Backend = function Backend(message, config, callback) {
  logger.warn("Using in-memory data store; This is *NOT* persistent");
  this.message = message;
  this._db = {};
  this._db_count = 0;
  this._db_exists = true;

  // started
  callback(null, true);

  return this;
}

Backend.prototype.save = function save(data, callback) {
  var _id = createId(data);
  data[_id] = _id;
  this._db[_id] = data;
  logger.info("Stored: timestamp " + data.timestamp);
  this._db_count += 1;
  this._db_exists = true;
  this.message('change', data);
  return callback(null, _id);
}

Backend.prototype.count = function count(callback) {
  logger.info("Count: " + this._db_count);
  return callback(null, this._db_count);
}

Backend.prototype.fetchOne = function fetchOne(options, callback) {
  var doc = this._db[options.id];
  if (typeof doc !== undefined) {
    return callback(null, JSON.parse(JSON.stringify(doc)));
  } else {
    return callback(new Error("not found"));
  }
}

Backend.prototype.fetchRange = function fetchRange(options, callback) {
  // options can include startkey, endkey
  if (arguments.length < 2) {
    callback = options;
    options = {};
  }
  var start = options.startkey || 0;
  var end = options.endkey || Infinity;

  var blobs = uscore.filter(this._db, function(blob) {
    return (blob.timestamp > start && blob.timestamp < end);
  });

  // poor man's deep copy
  var results = [];
  blobs.forEach(function(blob) {
    results.push(JSON.parse(JSON.stringify(blob)));
  });

  logger.info("Fetch range " + start + " < timestamp < " + end + " -> " + results.length + " blobs");
  return callback(null, results);
};

Backend.prototype.exists = function exists(callback) {
  logger.info("Exists: " + this._db_exists);
  return callback(null, this._db_exists);
};

Backend.prototype.destroy = function destroy(callback) {
  logger.info("Destroyed: true");
  this._db = {};
  this._db_exists = false;
  return callback(null, true);
};

module.exports = Backend;

