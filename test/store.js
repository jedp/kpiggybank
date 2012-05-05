var vows = require("vows");
var assert = require("assert");
var spawn = require("child_process").spawn;
var path = require("path");
var DB = require("../lib/db");

// Set up the env for testing
// This will be picked up by the server and db config

// Use a test db so we can create and delete it.
process.env['KPIG_COUCHDB_DB'] = "bid_kpi_test";

// Don't search for an open port; always keep the same port for testing.
// That way we'll get some feedback right away if the previous test didn't
// clean up properly :)
process.env['KPIG_SERVER_PORT'] = "3042";

// After env is set, we can get config (because config reads env)
var config = require("../lib/config");

var kpiggybankProcess = undefined;

// delete the database.
// Do this when setting up and tearing down the test suite.
function deleteDB(callback) {
  var db = new DB(function(err) {
    if (err) return callback(err);

    db.db.destroy(function(err) {
      if (err) return callback(err);
      return db.db.exists(callback);
    });
  });
}

/*
 * Check that for db, there is a document where key===value
 * within the specified interval.  
 *
 * This does an exponential backoff on an (inefficient) temporaryView.
 * The reduce function returns the first matching document, so the caller
 * should expect either a single document to be returned or an error.
 */
function expectEventually(key, value, db, interval, callback) {
  value = value.toString();
  function retrieveWithinTime(time) {
    db.temporaryView(
      {
        map: function (doc) {
         emit(doc._id, doc);
       }
      }, 
      function (err, results) {
        // If there was an error (like not_found) or there were no
        // results, then try again in a little while.  Gradually back
        // off the time until the interval is exceeded.  If nothing
        // is discovered, callback with an error.
        if ((err || results.length === 0) && (time < interval)) {
          time *= 2;
          setTimeout(function() {
            retrieveWithinTime(time);
          }, time);
        } else {
          var found = false;
          results.forEach(function(result) {
            if (result[key] === value) {
              found = true;
              return callback(null, result);
            }
          });
          if (!found) return callback(new Error("Not found"));
        }
      }
    );
  }
  // start at 1ms and go up exponentially from there
  retrieveWithinTime(1);
}

process.on('exit', function() {
  if (kpiggybankProcess) {
    kpiggybankProcess.kill();
  }
});

const BLOB_DATA = {
    "timestamp": 1333046104322,
    "event_stream": [
         [ "picker", 732 ],
         [ "picker::change", 1700 ],
         [ "picker::signin", 2300 ],
         [ "assertion_generation", 2500 ],
         [ "certified", 3300 ],
         [ "assertion_generated", 4500 ],
         [ "complete", 4777 ]
    ],
    "email_type": "secondary",
    "number_emails": 3,
    "new_account": false,
    "language": "en_US",
    "number_sites_logged_in": 1,
    "screen_size": { "width": 640, "height": 480 },
    "sample_rate": 1.0,
     "user_agent": {
      "os": "iOS",
      "browser": "Safari",
      "version": "5.1"  
    }
};

vows.describe("Blob storage")

.addBatch({
  "In the beginning": {
    topic: function() {
      deleteDB(this.callback);
    },

    "the db does not yet exist": function(exists) {
      assert(exists === false);
    },

    "the server": {
      topic: function() {
        var cb = this.callback;
        var server_exec = path.join(__dirname, '..', 'lib', 'server.js');
        kpiggybankProcess = spawn('node', [server_exec]);
        kpiggybankProcess.stdout.on('data', function(buf) {
          buf.toString().split("\n").forEach(function(line) {
            if (/kpiggybank listening/.test(line)) {
              return cb(null, true);
            }
          });
        });
        kpiggybankProcess.stdout.on('error', function(err) {
          return cb(err);
        });
      },

      "is started successfully": function(started) {
        assert(started === true);
      }
    }
  }
})

.addBatch({
  "We can save a blob": {
    topic: function() {
      var api = new(require("../lib/api"))(config.server_host, config.server_port);
      var cb = this.callback;
      var blob_data = BLOB_DATA;

      api.saveData(BLOB_DATA, function(err, result) { 
        return cb(err, result); 
      });
    },

    "and eventually retrieve it straight from couch": {
      topic: function(result) {
        var cradle = require('cradle');
        var conn = new (cradle.Connection)(config.couchdb_host, config.couchdb_port);
        var db = conn.database(config.couchdb_db);
        expectEventually("timestamp", 1333046104322, db, 1000, this.callback);
      },

      "and see what we saved": function(obj) {
        assert(parseInt(obj.timestamp, 10) === BLOB_DATA.timestamp);
      }
    }
  }
})

.addBatch({
  "In the end": {
    topic: function() {
      var cb = this.callback;
      kpiggybankProcess.on('exit', function() { 
        return cb(null, true); 
      });
      kpiggybankProcess.on('error', function(err) {
        return cb(err);
      });
      kpiggybankProcess.kill('SIGINT');
    },

    "the server is stopped": function(stopped) {
      assert(stopped === true);
    },

    "the database": {
      topic: function() {
        deleteDB(this.callback);
      },

      "is deleted": function(exists) {
        assert(exists === false);
      }
    }
  }
})

.export(module);
