import fs from 'fs';
import path from 'path';
import { Role } from '@prisma/client';

export interface DevUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

const STORAGE_PATH = path.resolve(process.cwd(), '.private_storage', 'dev_users.json');

function getDevUsers(): DevUser[] {
  try {
    if (!fs.existsSync(STORAGE_PATH)) {
      const dir = path.dirname(STORAGE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STORAGE_PATH, '[]', 'utf-8');
      return [];
    }
    const data = fs.readFileSync(STORAGE_PATH, 'utf-8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

function saveDevUsers(users: DevUser[]): void {
  try {
    const dir = path.dirname(STORAGE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save dev users:', err);
  }
}

export const DevUserStore = {
  findByEmail(email: string): DevUser | null {
    const users = getDevUsers();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  findById(id: string): DevUser | null {
    const users = getDevUsers();
    return users.find((u) => u.id === id) || null;
  },

  create(userData: { email: string; name?: string | null; passwordHash: string; role?: Role }): DevUser {
    const users = getDevUsers();
    const newUser: DevUser = {
      id: `dev_usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: userData.email.toLowerCase(),
      name: userData.name || null,
      passwordHash: userData.passwordHash,
      role: userData.role || Role.CUSTOMER,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveDevUsers(users);
    return newUser;
  },
};
