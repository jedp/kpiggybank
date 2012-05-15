var events = require('events');
var util = require('util');

function do_nothing() {};

/*
 * getDatabase(backend[, args])
 * returns an instance of a database using specified backend
 */


var Database = function Database(backend, config, callback) {
  events.EventEmitter.call(this);
  var self = this;

  if (arguments.length === 2) {
    // backend, callback
    callback = config;
    config = require("./config");
  } else if (arguments.length === 1) {
    callback = do_nothing;
    config = require("./config");
  }

  this.message = function(name, message) {
    self.emit(name, message);
  };

  var Backend = require('./backends/' + backend);

  this.backend = new Backend(this.message, config, function(err, created) {
    return callback(err, created);
  });

  return this;
}
util.inherits(Database, events.EventEmitter);

Database.prototype.saveAll = function saveAll(listOrDict, callback) {
  // Accept either a single dictionary or a list of dictionaries

  // a list of json blobs with timestamps walks like a duck
  if (!! listOrDict.length && !! listOrDict[0].timestamp) {
    var self = this;
    var listLength = listOrDict.length;
    var i = 0;
    listOrDict.forEach(function(data) {
      self.save(data, function(err) {
        // crash on any errors
        if (err) return callback(err);

        // after all items have been saved, return
        i += 1;
        if (i === listLength) {
          return callback(null, "ok");
        }
      });
    });
  } else if (!! listOrDict.timestamp) {
    this.save(listOrDict, callback);
  } else {
    callback(new Error("At a minimum, a timestamp is required"));
  }
};

Database.prototype.save = function save(data, callback) {
  // callback is optional
  callback = callback || do_nothing;
  this.backend.save(data, callback);
};

Database.prototype.count = function count(callback) {
  this.backend.count(callback);
};

Database.prototype.fetchRange = function fetchRange(options, callback) {
  if (arguments.length <= 1) {
    callback = options || do_nothing;
    this.backend.fetchRange(callback);
  } else {
    this.backend.fetchRange(options, callback);
  }
};

Database.prototype.exists = function exists(callback) {
  this.backend.exists(callback);
};

Database.prototype.destroy = function destroy(callback) {
  this.backend.destroy(callback);
};

module.exports = Database;
