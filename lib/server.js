var events = require('events');
var express = require('express');
var socket_io = require('socket.io');
var config = require('./config');
var url = require('url');
var DB = require('./db');
var logger = require('./logging').logger;

var emitter = module.exports.events = new events.EventEmitter();
var app = module.exports.app = express.createServer();

/*
 * configure socket.io
 * suppress garrulous logging
 */
var io = module.exports.io = socket_io.listen(app);
io.set('log level', 1);

/*
 * make the db connection when the app is started below
 */
var db = module.exports.db = null;

/* 
 * use the start() method to ensure the db is connected before
 * starting the web server
 */
var start = module.exports.start = function() {
  logger.info("Using DB: " + config.db_backend);
  db = new DB(config.db_backend, function(err) {
    if (err) return emitter.emit('error', err);

    app.listen(config.server_port, function(err) {
      if (err) return emitter.emit('error', err);

      // Emit change data to all connected web clients.
      // Use volatile.emit because traffic may spike and
      // it's ok if we drop some of these packets.
      db.on('change', function(change) {
        io.sockets.emit('change', change.doc);
      });

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
  app.use(express.static(__dirname + '/public'));
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
  res.render('index', {
  });
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

io.sockets.on('connection', function(socket) {
  db.fetchRange({limit:7, descending:true}, function(err, docs) {
    docs.reverse();

    docs.forEach(function(doc) {
      socket.volatile.emit('change', doc);
    });
  });
});

app.get('/wsapi/ping', function(req, res) {
  res.writeHead(200);
  return res.end("pong");
});

app.post('/wsapi/interaction_data', function(req, res) {
  logger.info("post data");
  if (! req.body || ! req.body.data) {
    return res.send('Malformed POST, unable to parse JSON.', 400);
  }
  var data;
  try {
    data = JSON.parse(req.body.data);
    db.saveAll(data, function(err) {
      if (err) {
        res.send('invalid', 400);
      } else {
        res.send('ok', 201);
      }
      res.end();
    });
  } catch (e) {
    logger.error(e);
    res.send('oh dear', 500);
  }
});

/*
 * query parameters:
 *   id     - get a record by id
 *   start  - start timestamp for range search
 *   end    - end timestamp for range search
 *
 * if id is specified, start and end are ignored
 */
app.get('/wsapi/interaction_data', function(req, res) {
  var query = req.query;
  var options = {};

  // fetch one
  if (typeof query['id'] !== 'undefined') {
    db.fetchOne({id: query['id']}, function(err, doc) {
      if (err) {
        res.writeHead(404);
        return res.end({error: "Not found"});
      }
      res.writeHead(200);
      return res.end(JSON.stringify({results: doc}));
    });

  // or fetch range
  } else {
    if (typeof query['start'] !== 'undefined') {
      options['startkey'] = parseInt(query['start'], 10);
    }
    if (typeof query['end'] !== 'undefined') {
      options['endkey'] = parseInt(query['end'], 10);
    }
    db.fetchRange(options, function(err, results) {
      if (err) {
        res.writeHead(500);
        return res.end({'error':"Computer says no."});
      }
      res.writeHead(200);
      return res.end(JSON.stringify(results));
    });

  }

});

app.get('/wsapi/interaction_data/count', function(req, res) {
  db.count(function(err, rows) {
    if (err || ! rows.length) {
      res.writeHead(500);
      return res.end();
    }
    res.writeHead(200);
    return res.end(JSON.stringify(rows[0].value));
  });
});

app.get('/wsapi/interaction_data/stream', function(req, res) {
  res.writeHead(200);
  db.on('change', function(change) {
    res.write(JSON.stringify(change) + "\r\n");
  });
});

if (!module.parent) {
  start();
  emitter.on('error', console.error);
  emitter.on('ready', function() {
    console.log("using db: " + config.db_name);
    console.log("kpiggybank listening on port %d in %s mode", app.address().port, app.settings.env);
  });
}
