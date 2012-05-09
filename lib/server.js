var events = require('events');
var express = require('express');
var config = require('./config');
var url = require('url');
var DB = require('./db');

var emitter = module.exports.events = new events.EventEmitter();
var app = module.exports.app = express.createServer();
var db = module.exports.db = null;

/* 
 * use the start() method to ensure the db is connected before
 * starting the web server
 */
var start = module.exports.start = function() {
  db = new DB(function(err) {
    if (err) return emitter.emit('error', err);

    app.listen(config.server_port, function(err) {
      if (err) return emitter.emit('error', err);

      return emitter.emit('ready');
    });
  });
}

/*
 * app configuration
 *  
 * manipulate this by setting in advance the env vars used by config.js
 */

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
});

if (config.server_mode === 'prod') {
  app.use(express.errorHandler());
} else {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}

/*
 * http get / should give you some documentation
 */

app.get('/', function(req, res) {
  res.writeHead(200);
  res.write("KPIggybank server sez yo");
  res.end();
});

/*
 * API
 *
 * POST /wsapi/interaction_data
 *   required field:
 *     data: stringified blob of json data conforming to 
 *           https://wiki.mozilla.org/Privacy/Reviews/KPI_Backend#Example_data:
 *
 * GET /wsapi/interaction_data
 *    required params:
 *      start: start timestamp 
 *      end: end timestamp
 */

app.post('/wsapi/interaction_data', function(req, res) {
  if (req.body.length > 10000) {
    // too large
    res.writeHead(413);
    return res.end();
  }

  try {
    var data = req.body;
    if (data.timestamp) {
      db.save(data);
      res.writeHead(200);
    } else {
      // bogus
      res.writeHead(400);
    }
  } catch (e) {
    console.error(e);
    return res.end();
  }

  res.end();
});

app.get('/wsapi/interaction_data', function(req, res) {
  try {
    var query = req.query;
    var start = query['start'] || null;
    var end = query['end'] || null;

    db.fetchRange(start, end, function(err, results) {
      if (err) {
        res.writeHead(500);
        return res.end("Computer says no.");
      }
      res.writeHead(200);
      return res.end(JSON.stringify(results));
    });
  } catch(e) {
    res.writeHead(500);
    res.end("Computer says no.");
  }
});

app.get('/wsapi/interaction_data/count', function(req, res) {
  try {
    db.count(function(err, rows) {
      if (err || ! rows.length) {
        res.writeHead(500);
        return res.end();
      }
      res.writeHead(200);
      return res.end(JSON.stringify(rows[0].value));
    });
  } catch(e) {
    res.writeHead(500);
  }
});

app.get('/wsapi/interaction_data/stream', function(req, res) {
  res.writeHead(200);
  db.on('change', function(change) {
    res.write(JSON.stringify(change));
  });
});

if (!module.parent) {
  start();
  emitter.on('error', console.error);
  emitter.on('ready', function() {
    console.log("using db: " + config.couchdb_db);
    console.log("kpiggybank listening on port %d in %s mode", app.address().port, app.settings.env);
  });
}
