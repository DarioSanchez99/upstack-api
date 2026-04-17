const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const config = require('../../config/env');

/**
 * Generate a random alphanumeric string of given length.
 */
const randomSuffix = (len = 4) =>
  Math.random()
    .toString(36)
    .substring(2, 2 + len);

/**
 * Register a new user and create their default workspace.
 */
const register = async (email, password, name) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Derive workspace slug from email prefix + random suffix
  const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
  const slug = `${emailPrefix}-${randomSuffix(4)}`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name ?? null,
      workspaces: {
        create: {
          name: name ? `${name}'s Workspace` : 'My Workspace',
          slug,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      createdAt: true,
    },
  });

  return user;
};

/**
 * Authenticate a user and return a signed JWT + user info.
 */
const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  const { passwordHash: _, ...safeUser } = user;
  return { token, user: safeUser };
};

/**
 * Return the current authenticated user by ID (no passwordHash).
 */
const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      stripeCustomerId: true,
      createdAt: true,
    },
  });

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return user;
};

module.exports = { register, login, getMe };
