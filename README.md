KPIggyBank
==========

A backend store for Key Performance Indicator (KPI) data.

Node.JS + CouchDB.

Requirements
------------

- An accessible CouchDB server
- Node.JS (0.6.17 or greater)

Installation
------------

- git clone: `https://github.com/jedp/kpiggybank`
- `npm install`

Testing
-------

- `npm test`

The test suite simulates throwing a thousand login sequences at the KPI store.

It is anticipated that, with 1 million users, BrowserID will generate some 
100 sign-in activities per second.  The test suite requires that kpiggy bank
can completely store and retrieve records at a rate at least twice as fast
as this.

Running
-------

For configuration, the file `env.sh.dist` can be copied to `env.sh` and edited.
kpiggybank will look for the following environment variables:

- `KPIG_COUCHDB_HOST`: IP addr of couch server.  Default "127.0.0.1".
- `KPIG_COUCHDB_PORT`: Port number of couch server.  Default "5984".
- `KPIG_COUCHDB_DB`: Name of the database.  Default "bid_kpi".
- `KPIG_COUCHDB_USER`: Username for database if required.  Default "kpiggybank".
- `KPIG_COUCHDB_PASS`: Password for database if required.  Default "kpiggybank".
- `KPIG_SERVER_HOST`: "127.0.0.1"
- `KPIG_SERVER_PORT`: Port for the kpiggybank server.  Default "3000".
- `KPIG_SERVER_MODE`: Governs how verbose logging should be.  Set to "prod" for quieter logging.  Default "dev".

- `npm start`

Or change your env configuration with something like:

- `KPIG_COUCHDB_DB=bid_kpi_test npm start`

When running kpiggybank for the first time on a given database, it will 
ensure that the db exists, creating it if it doesn't.

Please note that the database named `bid_kpi_test` is **deleted** as part of the 
test suite.


JS API
------

The HTTP API calls are wrapped for convenience in a JS module.  You can of 
course call the HTTP methods directly if you want.  Example of using the JS
API:

    var API = require("lib/api");
    var api = new API(server_host, server_port);
    api.saveData(yourblob, yourcallback);

The callback is optional.

HTTP API
--------

*Post Data*

Post a blob of data to `/wsapi/interaction_data`.  
The post `data` should contain a JSON object following
the example here:

    https://wiki.mozilla.org/Privacy/Reviews/KPI_Backend#Example_data

In particular, the `timestamp` field is required, and should be a unix 
timestamp (seconds since the epoch); not an ISO date string.

- url: `/wsapi/interaction_data`
- method: POST
- required param: `{data: <your data blob>}`

*Get Data*

Not yet implemented

- url: `/wsapi/interaction_data?startkey=<date-start>&endkey=<date-end>`
- method: GET
- optional params: `startkey`, `endkey`


