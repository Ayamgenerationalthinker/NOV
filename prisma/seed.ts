import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const MIN_PASSWORD_LENGTH = 8;

/** Env values pasted into dashboards often carry stray spaces or quotes: ignore them. */
function cleanEnvValue(value: string | undefined): string {
  return (value ?? '').trim().replace(/^(['"])(.*)\1$/, '$2');
}

function requireOwnerCredentials(): { email: string; password: string } {
  const email = cleanEnvValue(process.env.INITIAL_ADMIN_EMAIL).toLowerCase();
  const password = cleanEnvValue(process.env.INITIAL_ADMIN_PASSWORD);
  const problems: string[] = [];

  // Deploy builds: seeding is optional only when the owner details are not configured at all.
  if (!email && !password && process.argv.includes('--if-configured')) {
    console.log('ℹ️  Skipping owner setup: INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD are not set.');
    process.exit(0);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    problems.push('INITIAL_ADMIN_EMAIL must be set to your email address.');
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`INITIAL_ADMIN_PASSWORD must be set and at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  if (problems.length > 0) {
    console.error('❌ Cannot create the store owner account:');
    for (const problem of problems) console.error(`   - ${problem}`);
    console.error('   Add them to your .env file (or export them) and run `npm run prisma:seed` again.');
    process.exit(1);
  }

  return { email: email!, password: password! };
}

const { email: adminEmail, password: adminPassword } = requireOwnerCredentials();

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('🌱 Seeding NOV store...');

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Re-running the seed resets the owner's password to INITIAL_ADMIN_PASSWORD.
  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.SUPER_ADMIN,
      passwordHash: hashedPassword,
    },
    create: {
      email: adminEmail,
      name: 'Store Owner',
      passwordHash: hashedPassword,
      role: Role.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Super Admin configured: ${superAdmin.email} (${superAdmin.role})`);

  // Default Seller Store
  // Single-owner store: if the owner email changed, hand the existing store to the new owner.
  const store = await prisma.store.upsert({
    where: { slug: 'nov-flagship-atelier' },
    update: { sellerId: superAdmin.id },
    create: {
      sellerId: superAdmin.id,
      name: 'NOV Flagship Atelier',
      slug: 'nov-flagship-atelier',
      description: 'The official flagship collection of NOV bespoke physical merchandise and software tools.',
      brandColor: '#10b981',
      isVerified: true,
      policyShipping: 'Orders are dispatched within 24 business hours using insured express logistics with live tracking.',
      policyReturns: '14-day hassle-free returns on physical merchandise in original packaging.',
    },
  });

  console.log(`✅ Default Store created: ${store.name} (/${store.slug})`);

  // Shipping Profile & Zones
  const existingProfile = await prisma.shippingProfile.findFirst({
    where: { storeId: store.id, isDefault: true },
  });

  if (!existingProfile) await prisma.shippingProfile.create({
    data: {
      storeId: store.id,
      name: 'Standard Insured Courier',
      isDefault: true,
      processingTimeDays: 1,
      zones: {
        create: [
          {
            name: 'Ghana Domestic Dispatch',
            countries: ['GH'],
            baseRate: 25.0,
            perItemRate: 5.0,
            freeShippingThreshold: 500.0,
            estimatedDaysMin: 1,
            estimatedDaysMax: 3,
          },
          {
            name: 'West Africa Region',
            countries: ['NG', 'CI', 'TG', 'BJ', 'SN'],
            baseRate: 85.0,
            perItemRate: 15.0,
            estimatedDaysMin: 3,
            estimatedDaysMax: 7,
          },
          {
            name: 'International Global Express',
            countries: ['US', 'GB', 'CA', 'DE', 'FR', 'AE', 'ZA'],
            baseRate: 140.0,
            perItemRate: 25.0,
            estimatedDaysMin: 4,
            estimatedDaysMax: 10,
          },
        ],
      },
    },
  });

  console.log(`✅ Shipping profiles and zones configured.`);

  // Comprehensive Product Categories
  const categories = [
    { name: 'Fashion & Apparel', slug: 'fashion', description: 'Contemporary high-end streetwear and tailored garments.' },
    { name: 'Footwear & Sneakers', slug: 'footwear', description: 'Limited-edition bespoke footwear and sneakers.' },
    { name: 'Electronics & Audio', slug: 'electronics', description: 'Precision acoustic equipment and consumer hardware.' },
    { name: 'Luxury Accessories', slug: 'accessories', description: 'Titanium chronographs, handcrafted leather, and jewelry.' },
    { name: 'Developer Tools', slug: 'software', description: 'Source code, templates, UI kits, and boilerplates.' },
    { name: '3D & Graphics Assets', slug: 'graphics', description: 'Spatial 3D models, shaders, and digital design kits.' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log(`✅ Seeded ${categories.length} product categories.`);
  console.log('✨ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
