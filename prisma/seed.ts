import { PrismaClient, Role, ProductKind, ProductType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for NOV.com Hybrid Commerce...');

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

  // Default Seller Store
  const store = await prisma.store.upsert({
    where: { sellerId: superAdmin.id },
    update: {},
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
  const defaultProfile = await prisma.shippingProfile.create({
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
  });
