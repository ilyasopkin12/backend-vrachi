/**
 * Демо-данные: специализации, 10 пользователей-пациентов, 12 врачей,
 * плюс записи на приём для статистики пациентов (totalVisits / upcomingVisits).
 * Запуск: node scripts/seed-demo-data.cjs
 * Пароль у всех пользователей: Password1!
 */
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'vrachi',
};

const USER_PASSWORD = 'Password1!';

const SPECIALIZATION_NAMES = [
  'Терапевт',
  'Кардиолог',
  'Невролог',
  'Офтальмолог',
  'Хирург',
];

const PATIENTS = [
  ['Алексей', 'Смирнов', 'patient01@demo.local', '+79001001001'],
  ['Екатерина', 'Кузнецова', 'patient02@demo.local', '+79001001002'],
  ['Никита', 'Попов', 'patient03@demo.local', '+79001001003'],
  ['Анна', 'Васильева', 'patient04@demo.local', '+79001001004'],
  ['Михаил', 'Соколов', 'patient05@demo.local', '+79001001005'],
  ['Дарья', 'Михайлова', 'patient06@demo.local', '+79001001006'],
  ['Илья', 'Новиков', 'patient07@demo.local', '+79001001007'],
  ['Полина', 'Федорова', 'patient08@demo.local', '+79001001008'],
  ['Константин', 'Морозов', 'patient09@demo.local', '+79001001009'],
  ['Вероника', 'Волкова', 'patient10@demo.local', '+79001001010'],
];

/** Последние столбцы: visitCount, ratingStars (1–5). visitCount после сидирования записей пересчитывается из фактических CONFIRMED appointments. */
const DOCTORS = [
  ['Иван', 'Петров', 'Терапевт', 'Москва', 14, 'Клиника «Здоровье», каб. 101', '101', 'OFFLINE', 28, 5],
  ['Мария', 'Сидорова', 'Кардиолог', 'Москва', 11, 'Клиника «Здоровье», каб. 205', '205', 'ONLINE', 45, 4],
  ['Дмитрий', 'Новиков', 'Кардиолог', 'Казань', 9, 'Медцентр Казань', '12', 'OFFLINE', 12, 4],
  ['Ольга', 'Морозова', 'Невролог', 'Москва', 11, 'Невроцентр', '3', 'ONLINE', 63, 5],
  ['Сергей', 'Лебедев', 'Терапевт', 'Новосибирск', 7, 'Поликлиника №4', '18', 'OFFLINE', 7, 3],
  ['Анна', 'Фёдорова', 'Офтальмолог', 'Москва', 14, 'Глазная клиника', '7', 'ONLINE', 51, 5],
  ['Павел', 'Орлов', 'Хирург', 'Санкт-Петербург', 16, 'Городская больница', '402', 'OFFLINE', 34, 4],
  ['Татьяна', 'Романова', 'Терапевт', 'Екатеринбург', 8, 'УралМед', '21', 'OFFLINE', 19, 4],
  ['Андрей', 'Зайцев', 'Невролог', 'Казань', 13, 'Невро+', '5', 'ONLINE', 41, 5],
  ['Елена', 'Белова', 'Офтальмолог', 'Новосибирск', 6, 'ОптикаМед', '2', 'OFFLINE', 9, 3],
  ['Максим', 'Григорьев', 'Терапевт', 'Москва', 5, 'Клиника «Здоровье», онлайн', 'Онлайн-консультация', 'ONLINE', 22, 4],
  ['Светлана', 'Комарова', 'Кардиолог', 'Санкт-Петербург', 12, 'Сердечно-сосудистый центр', '310', 'OFFLINE', 56, 5],
];

/** Уникальное время слота для пары (врач), чтобы не нарушить индекс. */
function nextSlotStart(doctorId, future, perDoctorSeq) {
  const n = perDoctorSeq.get(doctorId) || 0;
  perDoctorSeq.set(doctorId, n + 1);
  const stepMs = 50 * 60 * 1000;
  if (future) {
    return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + n * stepMs);
  }
  return new Date(Date.now() - 40 * 24 * 60 * 60 * 1000 - n * stepMs);
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

async function seedDemoAppointments(client) {
  const { rows: users } = await client.query(
    `SELECT id FROM users WHERE email LIKE 'patient%@demo.local' ORDER BY email`,
  );
  const { rows: doctors } = await client.query(`SELECT id FROM doctors ORDER BY surname`);
  if (!users.length || !doctors.length) {
    console.log('skip demo appointments: no users or doctors');
    return;
  }

  const doctorIds = doctors.map((d) => d.id);
  const perDoctorSeq = new Map();

  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS c FROM appointments a
     INNER JOIN users u ON u.id = a."patientId"
     WHERE u.email LIKE 'patient%@demo.local'`,
  );
  if (existing[0].c > 0) {
    console.log('skip demo appointments: already have', existing[0].c, 'rows for demo patients');
    await syncPatientAndDoctorStats(client);
    return;
  }

  for (let idx = 0; idx < users.length; idx++) {
    const patientId = users[idx].id;
    const pastN = 1 + (idx % 4);
    const upN = idx % 4;

    for (let p = 0; p < pastN; p++) {
      const doctorId = doctorIds[(idx + p) % doctorIds.length];
      const start = nextSlotStart(doctorId, false, perDoctorSeq);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      await insertConfirmedAppointment(client, patientId, doctorId, start, end);
    }
    for (let u = 0; u < upN; u++) {
      const doctorId = doctorIds[(idx + pastN + u) % doctorIds.length];
      const start = nextSlotStart(doctorId, true, perDoctorSeq);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      await insertConfirmedAppointment(client, patientId, doctorId, start, end);
    }
  }

  console.log('demo appointments inserted for', users.length, 'patients');
  await syncPatientAndDoctorStats(client);
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

  for (const [name, surname, email, phone] of PATIENTS) {
    const ex = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (ex.rows.length) {
      console.log('skip user', email);
      continue;
    }
    const id = randomUUID();
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

  const uc = await client.query('SELECT COUNT(*)::int AS c FROM users');
  const dc = await client.query('SELECT COUNT(*)::int AS c FROM doctors');
  console.log('totals users:', uc.rows[0].c, 'doctors:', dc.rows[0].c);
  console.log('Все пациенты логинятся с паролем:', USER_PASSWORD);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
