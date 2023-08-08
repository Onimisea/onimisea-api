const Pool = require("pg").Pool;

const pool = new Pool({
  user: "postgres",
  password: "onimisea",
  host: "localhost",
  port: "5432",
  database: "onimisea",
});

module.exports = pool;


// Documentation

// Connect
// psql -U postgres -d onimisea -h localhost -p 5432


// Delete
// DROP TABLE IF EXISTS portfolio;
