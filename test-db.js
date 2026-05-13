import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'u975944253_mahmodnabelsi',
  password: '@flaT0nne14752',
  database: 'u975944253_QSWOT'
};

async function testDB() {
  try {
    console.log("Connecting to", dbConfig.host, "...");
    const con = await mysql.createConnection(dbConfig);
    console.log("Connected successfully!");

    console.log("Creating table...");
    await con.query(`
      CREATE TABLE IF NOT EXISTS app_data (
        id VARCHAR(100) PRIMARY KEY,
        state JSON
      )
    `);
    console.log("Table 'app_data' verified.");

    console.log("Testing UPSERT...");
    const stateObj = { foo: "bar_" + Date.now() };
    await con.query(`
      INSERT INTO app_data (id, state) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE state = VALUES(state)
    `, ['test_key', JSON.stringify(stateObj)]);
    console.log("UPSERT successful.");

    const [rows] = await con.query('SELECT state FROM app_data WHERE id = ?', ['test_key']);
    console.log("Retrieved data:", rows[0].state);

    await con.query('DELETE FROM app_data WHERE id = ?', ['test_key']);
    console.log("Cleanup successful.");

    await con.end();
  } catch (err) {
    console.error("Test failed with error:", err.message);
  }
}

testDB();
