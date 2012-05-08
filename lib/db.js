var cradle = require('cradle');

function do_nothing() {};

var Database = function Database(config, callback) {
  if (arguments.length < 2) {
    callback = config || do_nothing;
    config = require('./config');
  }

  this.conn = new (cradle.Connection)(config.couchdb_host, config.couchdb_port);

  // create the db if necessary
  var db = this.conn.database(config.couchdb_db);
  db.exists(function(err, exists) {
    if (err) return callback(err);
  
    if (! exists) {
      db.create(function(err, created) {

        // data design document puts timestamp in key
        // so you can do startkey/endkey queries
        db.save('_design/data', {
          all: {
            map: function(doc) {
                if (doc.timestamp) {
                  emit(doc.timestamp, doc);
                }
              }
            }
          }, function(err, result) {
            return callback(null, created);
          });
        });
    } else {
      return callback(null, exists);
    }
  });

  this.db = db;
};

Database.prototype.save = function save(data, callback) {
  callback = callback || do_nothing;

  this.db.save(data, function(err, result) {
    return callback(err, result);
  });
};

Database.prototype.fetchRange = function fetchRange(start, end, callback) {
  this.db.view('data/all', { startkey: start, endkey: end}, callback);
};

module.exports = Database;
