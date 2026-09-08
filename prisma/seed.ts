import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for NOV.com...');

  // Default Super Admin credentials
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@nov.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'SuperAdmin123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.SUPER_ADMIN,
    },
    create: {
      email: adminEmail,
      name: 'Super Administrator',
      passwordHash: hashedPassword,
      role: Role.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Super Admin configured: ${superAdmin.email} (${superAdmin.role})`);

  // Default Categories
  const categories = [
    { name: 'Developer Tools', slug: 'developer-tools', description: 'Source code, templates, UI kits, and boilerplates.' },
    { name: 'Ebooks & Guides', slug: 'ebooks-guides', description: 'Comprehensive guides and digital books.' },
    { name: 'Courses & Video', slug: 'courses-video', description: 'Masterclasses and instructional series.' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log(`✅ Seeded ${categories.length} default product categories.`);
  console.log('✨ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
