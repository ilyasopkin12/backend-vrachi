/**
 * Демо-данные: специализации, 20 пациентов (patient01–20@demo.local), 40 врачей,
 * у каждого пациента 2–5 записей CONFIRMED со слотами в мае 2026 (UTC).
 * При каждом запуске старые демо-записи (appointments + слоты) удаляются и создаются заново.
 * Запуск: node scripts/seed-demo-data.cjs
 * Пароль у всех демо-пациентов: Password1!
 */
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

(function loadEnvFromDotEnv() {
  try {
    const p = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(p)) return;
    const raw = fs.readFileSync(p, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const eq = s.indexOf('=');
      if (eq === -1) continue;
      const key = s.slice(0, eq).trim();
      let val = s.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch (_) {
    /* ignore */
  }
})();

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'vrachi',
};

const USER_PASSWORD = 'Password1!';

/** Май 2026 UTC: все слоты внутри [1 июня не вкл.) */
const MAY_2026_START_MS = Date.UTC(2026, 4, 1, 6, 0, 0);

const SPECIALIZATION_NAMES = [
  'Терапевт',
  'Кардиолог',
  'Невролог',
  'Офтальмолог',
  'Хирург',
];

const CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Казань',
  'Новосибирск',
  'Екатеринбург',
  'Нижний Новгород',
];

const FIRST_NAMES = [
  'Иван',
  'Мария',
  'Дмитрий',
  'Ольга',
  'Сергей',
  'Анна',
  'Павел',
  'Татьяна',
  'Андрей',
  'Елена',
  'Максим',
  'Светлана',
  'Никита',
  'Дарья',
  'Илья',
  'Полина',
  'Константин',
  'Вероника',
  'Алексей',
  'Екатерина',
];

const SURNAME_STEMS = [
  'Иванов',
  'Петров',
  'Сидоров',
  'Кузнецов',
  'Смирнов',
  'Попов',
  'Соколов',
  'Лебедев',
  'Козлов',
  'Новиков',
];

/** Число записей на пациента: от 2 до 5 (детерминированно). */
function appointmentCountForPatientIndex(idx) {
  return 2 + ((idx * 17 + 11) % 4);
}

/** Уникальный startTime на пару (врач): индекс слота по этому врачу. */
function nextSlotStart(doctorId, perDoctorSeq) {
  const n = perDoctorSeq.get(doctorId) || 0;
  perDoctorSeq.set(doctorId, n + 1);
  const stepMs = 45 * 60 * 1000;
  return new Date(MAY_2026_START_MS + n * stepMs);
}

async function deleteDemoAppointments(client) {
  const { rows } = await client.query(`
    SELECT a."slotId" AS sid
    FROM appointments a
    INNER JOIN users u ON u.id = a."patientId"
    WHERE u.email ~ $1
  `, ['^patient[0-9]{2}@demo\\.local$']);
  const slotIds = [...new Set(rows.map((r) => r.sid).filter(Boolean))];
  const delAppt = await client.query(`
    DELETE FROM appointments a
    USING users u
    WHERE a."patientId" = u.id AND u.email ~ $1
  `, ['^patient[0-9]{2}@demo\\.local$']);
  if (slotIds.length) {
    await client.query(`DELETE FROM schedule_slots WHERE id = ANY($1::uuid[])`, [slotIds]);
  }
  console.log(
    'removed demo appointments:',
    delAppt.rowCount,
    'schedule_slots:',
    slotIds.length,
  );
}

async function insertConfirmedAppointment(client, patientId, doctorId, startTime, endTime) {
  const slotId = randomUUID();
  const apptId = randomUUID();
  await client.query(
    `INSERT INTO schedule_slots (id, "doctorId", "startTime", "endTime", "isBooked", "consultationType", "createdAt")
     VALUES ($1, $2, $3, $4, true, 'IN_PERSON', NOW())`,
    [slotId, doctorId, startTime, endTime],
  );
  await client.query(
    `INSERT INTO appointments (id, "patientId", "doctorId", "slotId", status, "consultationType", comment, "createdAt", "cancelledAt")
     VALUES ($1, $2, $3, $4, 'CONFIRMED', 'IN_PERSON', NULL, NOW(), NULL)`,
    [apptId, patientId, doctorId, slotId],
  );
}

async function syncPatientAndDoctorStats(client) {
  await client.query(`
    UPDATE doctors d
    SET "visitCount" = (
      SELECT COUNT(*)::int FROM appointments a
      WHERE a."doctorId" = d.id AND a.status = 'CONFIRMED'
    )
  `);
  await client.query(`
    UPDATE users u
    SET "totalVisits" = (
        SELECT COUNT(*)::int FROM appointments a
        WHERE a."patientId" = u.id AND a.status = 'CONFIRMED'
      ),
      "upcomingVisits" = (
        SELECT COUNT(*)::int FROM appointments a
        INNER JOIN schedule_slots s ON s.id = a."slotId"
        WHERE a."patientId" = u.id
          AND a.status = 'CONFIRMED'
          AND s."startTime" > NOW()
      )
  `);
  console.log('synced user stats (totalVisits / upcomingVisits) and doctor visitCount');
}

async function seedDemoAppointments(client) {
  const { rows: users } = await client.query(
    `SELECT id FROM users WHERE email ~ $1 ORDER BY email`,
    ['^patient[0-9]{2}@demo\\.local$'],
  );
  const { rows: doctors } = await client.query(`SELECT id FROM doctors ORDER BY surname, name`);
  if (!users.length || !doctors.length) {
    console.log('skip demo appointments: no users or doctors');
    return;
  }

  const doctorIds = doctors.map((d) => d.id);
  const perDoctorSeq = new Map();

  await deleteDemoAppointments(client);

  for (let idx = 0; idx < users.length; idx++) {
    const patientId = users[idx].id;
    const nAppts = appointmentCountForPatientIndex(idx);
    for (let a = 0; a < nAppts; a++) {
      const doctorId = doctorIds[(idx * 3 + a * 7) % doctorIds.length];
      const start = nextSlotStart(doctorId, perDoctorSeq);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      await insertConfirmedAppointment(client, patientId, doctorId, start, end);
    }
  }

  console.log(
    'demo appointments inserted for',
    users.length,
    'patients (2–5 appointments each, May 2026)',
  );
  await syncPatientAndDoctorStats(client);
}

function buildDoctors40() {
  const rows = [];
  for (let i = 0; i < 40; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const sn = `${SURNAME_STEMS[i % SURNAME_STEMS.length]}${Math.floor(i / 10) || ''}`;
    const spec = SPECIALIZATION_NAMES[i % SPECIALIZATION_NAMES.length];
    const city = CITIES[i % CITIES.length];
    const years = 5 + (i % 20);
    const clinic = `Клиника демо №${1 + (i % 6)}, каб. ${10 + (i % 90)}`;
    const cabinet = String(100 + i);
    const presence = i % 3 === 0 ? 'ONLINE' : 'OFFLINE';
    const visitCount = 0;
    const ratingStars = 3 + (i % 3);
    rows.push([fn, sn, spec, city, years, clinic, cabinet, presence, visitCount, ratingStars]);
  }
  return rows;
}

const DOCTORS = buildDoctors40();

async function main() {
  const client = new Client(DB);
  await client.connect();

  const specIds = {};
  for (const name of SPECIALIZATION_NAMES) {
    const ex = await client.query(
      'SELECT id FROM specializations WHERE name = $1',
      [name],
    );
    if (ex.rows.length) {
      specIds[name] = ex.rows[0].id;
      continue;
    }
    const id = randomUUID();
    await client.query('INSERT INTO specializations (id, name) VALUES ($1, $2)', [
      id,
      name,
    ]);
    specIds[name] = id;
    console.log('specialization', name, id);
  }

  const passwordHash = await bcrypt.hash(USER_PASSWORD, 10);

  for (let i = 1; i <= 20; i++) {
    const email = `patient${String(i).padStart(2, '0')}@demo.local`;
    const ex = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (ex.rows.length) {
      console.log('skip user', email);
      continue;
    }
    const id = randomUUID();
    const name = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const surname = `${SURNAME_STEMS[(i - 1) % SURNAME_STEMS.length]}${i}`;
    const phone = `+79002${String(i).padStart(6, '0')}`;
    await client.query(
      `INSERT INTO users (id, email, "passwordHash", name, surname, phone, role, "refreshTokenHash", "lastSeenAt", "totalVisits", "upcomingVisits", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'patient', NULL, NULL, 0, 0, NOW())`,
      [id, email, passwordHash, name, surname, phone],
    );
    console.log('user', email, id);
  }

  for (const row of DOCTORS) {
    const [firstName, lastName, specName, city, years, clinic, cabinet, presence, visitCount, ratingStars] =
      row;
    const specId = specIds[specName];
    if (!specId) throw new Error('Unknown spec: ' + specName);

    const ex = await client.query(
      'SELECT id FROM doctors WHERE name = $1 AND surname = $2',
      [firstName, lastName],
    );
    if (ex.rows.length) {
      console.log('skip doctor', firstName, lastName);
      continue;
    }

    const id = randomUUID();
    await client.query(
      `INSERT INTO doctors (
        id, name, surname, "specializationId", city, "experienceYears", description,
        "isActive", "visitCount", "ratingStars", clinic, cabinet, presence, "lastSeenAt", "userId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12::doctors_presence_enum, NULL, NULL)`,
      [
        id,
        firstName,
        lastName,
        specId,
        city,
        years,
        `${clinic}. Стаж ${years} лет.`,
        visitCount,
        ratingStars,
        clinic,
        cabinet,
        presence,
      ],
    );
    console.log('doctor', lastName, id);
  }

  await seedDemoAppointments(client);

  const uc = await client.query(
    `SELECT COUNT(*)::int AS c FROM users WHERE email ~ $1`,
    ['^patient[0-9]{2}@demo\\.local$'],
  );
  const dc = await client.query('SELECT COUNT(*)::int AS c FROM doctors');
  console.log('totals demo patients:', uc.rows[0].c, 'doctors:', dc.rows[0].c);
  console.log('Демо-пациенты логинятся с паролем:', USER_PASSWORD);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
