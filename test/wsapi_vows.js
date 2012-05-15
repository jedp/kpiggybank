var vows = require("vows");
var assert = require("assert");
var spawn = require("child_process").spawn;
var path = require("path");
var http = require("http");
var logger = require("../lib/logging").logger;
var uscore = require("underscore");
var querystring = require("querystring");
var urlparse = require("urlparse");
var utils = require("./utils");

// Set up the env for testing
// This will be picked up by the server and db config
process.env['DB_BACKEND'] = "memory";
process.env['DB_DB'] = "bid_kpi_test_mem";

// Don't search for an open port; always keep the same port for testing.
// That way we'll get some feedback right away if the previous test didn't
// clean up properly :)
//process.env['PORT'] = "3043";


// After env is set, we can get config (because config reads env)
var config = require("../lib/config");

var BACKEND_URL = 'http://127.0.0.1:' + config.server_port;

var POST_BLOB_URL = BACKEND_URL + '/wsapi/interaction_data'
var GET_BLOB_URL = BACKEND_URL + '/wsapi/interaction_data'
var COUNT_BLOBS_URL = BACKEND_URL + '/wsapi/interaction_data/count'

var kpiggybankProcess = undefined;
process.on('exit', function() {
  if (kpiggybankProcess) {
    kpiggybankProcess.kill();
  }
});

var START_TIME = 1333046104322;

var serverIsResponding = function serverIsResponding(callback) {
  var db_url = urlparse(POST_BLOB_URL);
  var options = {
    host: db_url.host,
    port: db_url.port,
    path: db_url.path
  };

  http.get(options, function(res) {
    return callback(null, res.statusCode);
  }).on('error', function(e) {
    return callback(res.statusCode, e.message);
  });
};

/* 
 * Store KPI like browserid does - list of blobs
 * 
 * XXX should we just import the methods directly from browserid?
 * XXX how to structure?
 */
var store = function (kpi_json, cb) {
  var options,
      db_url,
      kpi_req;

  var post_data = querystring.stringify({
    'data' : JSON.stringify(kpi_json)
  });

  var db_url = urlparse(POST_BLOB_URL);

  options = {
        hostname: db_url.host,
        path: db_url.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': post_data.length
        }
  };

  if (db_url.port) {
    options.port = db_url.port;
  }

  kpi_req = http.request(options);
  kpi_req.on('error', function (e) {
    return cb(e);
  });
  kpi_req.on('close', function() {
    return cb(null);
  });

  kpi_req.write(post_data);
  kpi_req.end();

  return cb(null);
};

vows.describe("HTTP Server")

.addBatch({
  "Start server": {
    topic: function() {
      var cb = this.callback;
      var server_exec = path.join(__dirname, '..', 'lib', 'server.js');
      kpiggybankProcess = spawn('node', [server_exec])
      kpiggybankProcess.stdout.on('data', function(buf) {
        buf.toString().split("\n").forEach(function(line) {
          //if (line.trim()) logger.info("server: " + line.trim());
          if (/kpiggybank listening/.test(line)) {
            return cb(null, true);
          }
        });
      });
      kpiggybankProcess.stdout.on('error', function(err) {
        return cb(err);
      });
    },

    "ok": function(started) {
      assert(started === true);
    }
  }
})

.addBatch({
  "Well-formed POST requests": {
    topic: function() {
      store([ utils.makeBlob(), utils.makeBlob()], this.callback);
    },

    "make the server": {
      topic: function() {
        serverIsResponding(this.callback);
      },

      "happy": function(err, code) {
        assert(code === 200);
      }
    }
  }
})

.addBatch({
  "Ill-formed POST requests": {
    topic: function() {
      store("Attack at dawn!", this.callback);
    },

    "do not crash": {
      topic: function() {
        serverIsResponding(this.callback);
      },

      "the server": function(err, code) {
        assert(code === 200);
      }
    }
  }
})

.addBatch({
  "Stop server": {
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

    "ok": function(stopped) {
      assert(stopped === true);
    }
  }
})

.export(module);
