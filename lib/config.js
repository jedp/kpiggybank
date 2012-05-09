/* 
 * Default config for kpiggybank
 *
 * Override by copying env.sh.dist to env.sh, modifying, and sourcing
 */

module.exports = {
  couchdb_host: process.env['COUCHDB_HOST'] || "127.0.0.1",
  couchdb_port: parseInt((process.env['COUCHDB_PORT'] || "5984"), 10),

  couchdb_db: process.env['COUCHDB_DB'] || "bid_kpi",
  couchdb_user: process.env['COUCHDB_USER'] || "kpiggybank",
  couchdb_pass: process.env['COUCHDB_PASS'] || "kpiggybank",

  server_host: process.env['HOST'] || "127.0.0.1",
  server_port: parseInt((process.env['PORT'] || "3000"), 10),
  server_mode: process.env['MODE'] || "dev"

}
