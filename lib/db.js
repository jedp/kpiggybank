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
      return db.create(callback);
    }

    return callback(null, exists);
  });

  this.db = db;
};

Database.prototype.save = function save(data, callback) {
  callback = callback || do_nothing;

  this.db.save(data, function(err, result) {
    return callback(err, result);
  });
};

module.exports = Database;
