/* 
 * Default config for kpiggybank
 *
 * Override by copying env.sh.dist to env.sh, modifying, and sourcing
 */

module.exports = {
  db_backend: process.env['DB_BACKEND'] || "couchdb",
  db_host: process.env['DB_HOST'] || "127.0.0.1",
  db_port: parseInt((process.env['DB_PORT'] || "5984"), 10),

  db_db: process.env['DB_DB'] || "bid_kpi",
  db_user: process.env['DB_USER'] || "kpiggybank",
  db_pass: process.env['DB_PASS'] || "kpiggybank",

  server_host: process.env['HOST'] || "127.0.0.1",
  server_port: parseInt((process.env['PORT'] || "3000"), 10),
  server_mode: process.env['MODE'] || "dev"

}
