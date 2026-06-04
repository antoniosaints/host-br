import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { httpError } from './httpError.js';

export const SESSION_COOKIE = 'hostbr_session';

export async function registerUser(database, input) {
  const data = validateRegisterInput(input);
  const userId = randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    database
      .prepare(
        `
        INSERT INTO users (id, name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
      )
      .run(userId, data.name, data.email, passwordHash, now);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      throw httpError(409, 'email_already_registered', 'Este e-mail já está cadastrado.');
    }

    throw error;
  }

  return getUserById(database, userId);
}

export async function loginUser(database, input) {
  const email = normalizeEmail(input?.email);
  const password = String(input?.password || '');

  if (!email || !password) {
    throw httpError(422, 'validation_failed', 'Informe e-mail e senha.');
  }

  const row = database
    .prepare(
      `
      SELECT id, name, email, password_hash AS passwordHash, created_at AS createdAt
      FROM users
      WHERE email = ?
    `
    )
    .get(email);

  if (!row || !(await bcrypt.compare(password, row.passwordHash))) {
    throw httpError(401, 'invalid_credentials', 'E-mail ou senha inválidos.');
  }

  return safeUser(row);
}

export function getUserById(database, userId) {
  const row = database
    .prepare(
      `
      SELECT id, name, email, created_at AS createdAt
      FROM users
      WHERE id = ?
    `
    )
    .get(userId);

  if (!row) {
    throw httpError(401, 'unauthorized', 'Entre na sua conta para continuar.');
  }

  return safeUser(row);
}

export function signSession(user, secret) {
  return jwt.sign({ sub: user.id }, secret, { expiresIn: '7d' });
}

export function readSessionUser(database, token, secret) {
  if (!token) {
    throw httpError(401, 'unauthorized', 'Entre na sua conta para continuar.');
  }

  try {
    const payload = jwt.verify(token, secret);
    return getUserById(database, payload.sub);
  } catch {
    throw httpError(401, 'unauthorized', 'Entre na sua conta para continuar.');
  }
}

export function setSessionCookie(response, token, env) {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

export function clearSessionCookie(response, env) {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/'
  });
}

function validateRegisterInput(input) {
  const name = String(input?.name || '').trim();
  const email = normalizeEmail(input?.email);
  const password = String(input?.password || '');
  const details = {};

  if (name.length < 2) {
    details.name = 'Informe o nome completo.';
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    details.email = 'Informe um e-mail válido.';
  }

  if (password.length < 8) {
    details.password = 'A senha deve ter pelo menos 8 caracteres.';
  }

  if (Object.keys(details).length > 0) {
    throw httpError(422, 'validation_failed', 'Revise os dados enviados.', details);
  }

  return { name, email, password };
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function safeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt
  };
}
