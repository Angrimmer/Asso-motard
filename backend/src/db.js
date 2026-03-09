require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test de connexion au démarrage
pool.getConnection()
  .then(connection => {
    console.log("BDD connectée : " + process.env.DB_NAME + " sur " + process.env.DB_HOST);
    connection.release();
  })
  .catch(err => {
    console.error("Erreur de connexion à la BDD :", err.message);
  });

module.exports = pool;
