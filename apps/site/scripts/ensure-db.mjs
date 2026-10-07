// Creates the site database next to the API's one in the dev Postgres (infra/compose/docker-compose.dev.yml).
import { existsSync } from "node:fs";
import pg from "pg";

if (existsSync(".env") && typeof process.loadEnvFile === "function") process.loadEnvFile(".env");

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("DATABASE_URL is not set: copy apps/site/.env.example to apps/site/.env");
    process.exit(1);
}

const target = new URL(url);
const name = decodeURIComponent(target.pathname.slice(1));
const maintenance = new URL(url);
maintenance.pathname = "/postgres";

const client = new pg.Client({ connectionString: maintenance.toString() });
try {
    await client.connect();
} catch (error) {
    console.error(`Postgres is not reachable at ${target.host}: start it with`);
    console.error("  docker compose -f infra/compose/docker-compose.dev.yml up -d postgres");
    console.error(error.message);
    process.exit(1);
}

const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [name]);
if (rowCount === 0) {
    await client.query(`create database "${name.replace(/"/g, '""')}"`);
    console.log(`Created database ${name}`);
} else {
    console.log(`Database ${name} already exists`);
}
await client.end();
