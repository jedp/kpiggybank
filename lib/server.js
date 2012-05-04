var express = require('express');
var config = require('./config');
var db = new(require('./db'));

var app = express.createServer();

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
 */

app.post('/wsapi/interaction_data', function(req, res) {
  db.save(req.body);
  res.writeHead(200);
  res.end();
});

/*
 * run as script 
 */

if (!module.parent) {
  app.listen(config.server_port, function(){
    console.log("kpiggybank listening on port %d in %s mode", app.address().port, app.settings.env);
  });
} else {
  module.exports = app;
}
