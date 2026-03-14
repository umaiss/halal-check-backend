const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'halal_checker_db',
    user: 'postgres',
    password: 'postgres',
});

async function checkRows() {
    try {
        const res = await pool.query(`SELECT * FROM halal_checks ORDER BY id DESC LIMIT 1`);
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkRows();
