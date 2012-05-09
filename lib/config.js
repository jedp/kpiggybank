/* 
 * Default config for kpiggybank
 *
 * Override by copying env.sh.dist to env.sh, modifying, and sourcing
 */

module.exports = {
  couchdb_host: process.env['KPIG_COUCHDB_HOST'] || "127.0.0.1",
  couchdb_port: parseInt((process.env['KPIG_COUCHDB_PORT'] || "5984"), 10),

  couchdb_db: process.env['KPIG_COUCHDB_DB'] || "bid_kpi",
  couchdb_user: process.env['KPIG_COUCHDB_USER'] || "kpiggybank",
  couchdb_pass: process.env['KPIG_COUCHDB_PASS'] || "kpiggybank",

  server_host: process.env['KPIG_SERVER_HOST'] || "127.0.0.1",
  server_port: parseInt((process.env['KPIG_SERVER_PORT'] || "80"), 10),
  server_mode: process.env['KPIG_SERVER_MODE'] || "dev"

}
