var cradle = require('cradle');

var Backend = function Backend(message, config, callback) {
  var self = this;

  this.message = message;
  this.conn = new (cradle.Connection)(config.db_host, config.db_port);
  this.db = this.conn.database(config.db_name);

  this._maybeCreateDB(function(err, created) {
    if (err) return callback(err);

    // XXX don't get prior changes - only change from this
    // moment on.
    var feed = self.db.changes({include_docs: true});

    feed.on('error', function(err) {
      console.error(err);
      // require clients to handle error? 
      // seems weird, since we're otherwise not an event emitter
      //self.message('error', err);
    });

    feed.on('change', function(change) {
      self.message('change', change);
    });

    return callback(null, created);
  });

  return this;
};

Backend.prototype._maybeCreateDB = function(callback) {
  var self = this;

  // create the db if necessary
  this.db.exists(function(err, exists) {
    if (err) return callback(err);
  
    if (! exists) {
      self.db.create(function(err, created) {

        // data design document puts timestamp in key
        // so you can do startkey/endkey queries
        self.db.save('_design/data', {
          
          // query all by timestamp
          all: {
            map: function(doc) {
                if (doc.timestamp) {
                  emit(doc.timestamp, doc);
                }
              }
            },

          // count all
          count: {
            map: function(doc) {
              emit(doc._id, 1);
            },
            reduce: function(keys, values, rereduce) {
              return sum(values);
            }
          }

        }, function(err, result) {
          return callback(null, created);
        });
      });
    } else {
      // already exists.  fine.
      return callback(null, exists);
    }
  });
};

Backend.prototype.save = function save(data, callback) {
  callback = callback || do_nothing;
  this.db.save(data, callback);
};

Backend.prototype.count = function count(callback) {
  this.db.view('data/count', callback);
};

Backend.prototype.fetchOne = function fetchOne(options, callback) {
  this.db.get(options.id, callback);
};

Backend.prototype.fetchRange = function fetchRange(options, callback) {
  if (arguments.length === 1) {
    callback = options;
    options = {};
  }
  this.db.view('data/all', options, callback);
};

Backend.prototype.exists = function exists(callback) {
  this.db.exists(callback);
};

Backend.prototype.destroy = function destroy(callback) {
  this.db.destroy(callback);
};

module.exports = Backend;

