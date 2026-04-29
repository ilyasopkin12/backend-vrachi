/**
 * Полная очистка данных приложения (все строки в связанных таблицах).
 * Не удаляет саму БД и не трогает миграции/расширения.
 *
 * Запуск (обязательно подтверждение):
 *   CONFIRM_CLEAR_DB=yes node scripts/clear-database.cjs
 */
const { Client } = require('pg');

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'vrachi',
};

async function main() {
  if (process.env.CONFIRM_CLEAR_DB !== 'yes') {
    console.error(
      'Refused: set CONFIRM_CLEAR_DB=yes to truncate all application tables.',
    );
    process.exit(1);
  }

  const client = new Client(DB);
  await client.connect();

  await client.query(`
    TRUNCATE TABLE
      appointments,
      schedule_slots,
      doctors,
      users,
      specializations
    RESTART IDENTITY CASCADE;
  `);

  console.log('Truncated: appointments, schedule_slots, doctors, users, specializations');

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
