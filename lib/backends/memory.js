var crypto = require('crypto')
var uscore = require('underscore');

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
  this.message = message;
  this._db = {};
  this._db_count = 0;
  this._db_exists = true;
  return this;
}

Backend.prototype.save = function save(data, callback) {
  var _id = createId(data);
  this._db[_id] = data;
  this._db_count += 1;
  this._db_exists = true;
  return callback(null, _id);
}

Backend.prototype.count = function count(callback) {
  return callback(null, this._db_count);
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

  return callback(null, results);
};

Backend.prototype.exists = function exists(callback) {
  return callback(null, this._db_exists);
};

Backend.prototype.destroy = function destroy(callback) {
  this._db = {};
  this._db_exists = false;
  return callback(null, true);
};

module.exports = Backend;

