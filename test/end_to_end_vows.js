var vows = require("vows");
var assert = require("assert");
var cradle = require("cradle");
var API = require("../lib/api");
var spawn = require("child_process").spawn;
var path = require("path");
var DB = require("../lib/db");
var uscore = require("underscore");
var utils = require("./utils");

// Set up the sub-process envronment for testing
// Use a test db so we can create and delete it.
var subEnv = uscore.clone(process.env);
var dbBackend = subEnv['DB_BACKEND'] = "couchdb";
var dbName = subEnv['DB_NAME'] = "bid_kpi_test";
var dbHost = subEnv['DB_HOST'] = "127.0.0.1";
var dbPort = parseInt(subEnv['DB_PORT'] = "5984", 10);

var dbConfig = {
  db_backend: dbBackend,
  db_host: dbHost,
  db_port: dbPort,
  db_name: dbName
};

// Don't search for an open port; always keep the same port for testing.
// That way we'll get some feedback right away if the previous test didn't
// clean up properly :)
var serverHost = "127.0.0.1";
var serverPort = parseInt(subEnv['PORT'] = "3042", 10);

var kpiggybankProcess = undefined;

// delete the database.
// Do this when setting up and tearing down the test suite.
function deleteDB(callback) {
  var db = new DB(dbBackend, dbConfig, function(err) {
    if (err) return callback(err);

    db.destroy(function(err) {
      if (err) return callback(err);
      return db.exists(callback);
    });
  });
}

process.on('exit', function() {
  if (kpiggybankProcess) {
    kpiggybankProcess.kill();
  }
});

var START_TIME = 1333046104322;

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
        kpiggybankProcess = spawn('node', [server_exec], {env: subEnv});
        kpiggybankProcess.stdout.on('data', function(buf) {
          buf.toString().split("\n").forEach(function(line) {
            //console.log("server.js: " + line);
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
  "Many blobs with sequential timestamps can be stored": {
    topic: function() {
      var start_date = (new Date()).getTime();
      // our actual api
      var api = new API(serverHost, serverPort);
      // a lower-level handle on couchdb so we can query it directly
      var conn = new (cradle.Connection)(dbHost, dbPort);
      var db = conn.database(dbName);
      var cb = this.callback;
      var i;
      var start = START_TIME;
      var finish = start + 100;
      var blob;
      for (i=start; i<=finish; i++) {
        blob = utils.makeBlob(i);
        api.saveData(blob);
      }
      // last record should have been saved within a second
      utils.expectEventually("timestamp", finish, db, 1000, function(err, results) {
        return cb(results, start_date);
      });
    },

    "successfully": function(obj, start_date) {
      assert(obj.timestamp === (START_TIME + 100));
    },

    /*
     * Scaling to 1M users anticipates approx 100 signin activities per second.
     * https://github.com/mozilla/browserid/wiki/Scaling-to-1M
     * So we should be able to keep pace with that.  
     */

    "at the rate we expect for signins by 1M users": function(obj, start_date) {
      // Be able to store data twice as fast as we expect it to arrive.
      // Here, less than 5 secs for what should take 10 secs to arrive.
      assert((new Date()) - start_date < (5000));
    },

  }
})

.addBatch({
  "The API": {
    "has a count method": {
      topic: function() {
        var api = new API(serverHost, serverPort);
        api.count(this.callback);
      },

      "that works": function(count) {
        assert(count === 101);
      }
    }, 

    "can fetch by closed date range": {
      topic: function() {
        var api = new API(serverHost, serverPort);
        api.fetchRange({start: START_TIME, end: START_TIME+9}, this.callback);
      },

      "successfully": function(records) {
        assert(records.length === 10);
      }
    },

    "can fetch by open date range": {
      topic: function() {
        var api = new API(serverHost, serverPort);
        api.fetchRange({start: START_TIME+91}, this.callback);
      },

      "successfully": function(records) {
        assert(records.length === 10);
      }
    },
  }
})

.addBatch({
  "Streaming": {
    topic: function() {
      var api = new API(serverHost, serverPort);
      var cb = this.callback;

      // save a blob, and wait for the change event to be emitted
      api.followChanges();
      api.on('change', function(doc) {
        return cb(null, doc);
      });
      api.saveData(utils.makeBlob(1336575273));
    }, 

    "works": function(doc) {
      assert(doc.timestamp === 1336575273);
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
