import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PrivacyShield database...');

  // 1. Seed default policy configuration
  const defaultPolicyName = 'default';
  const existingPolicy = await prisma.policyConfiguration.findUnique({
    where: { name: defaultPolicyName }
  });

  if (!existingPolicy) {
    await prisma.policyConfiguration.create({
      data: {
        name: defaultPolicyName,
        blurRadius: 15,
        transitionSpeedMs: 150,
        lockoutMessage: '🔒 Protected Surface View Lockout. Unfocus detected or capture key clicked.',
        watermarkOpacity: 0.08,
        watermarkRotation: -25,
        watermarkFontSize: 13,
        watermarkDensity: 'medium',
        escalationThreshold2: 20,
        escalationThreshold3: 50,
        escalationThreshold4: 80
      }
    });
    console.log('✔ Default policy configuration seeded.');
  } else {
    console.log('✔ Default policy already exists. Skipping.');
  }

  // 2. Seed mock dashboard administrator
  const adminEmail = 'admin@privacyshield.local';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin_secret_pass', salt);

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: passwordHash,
        role: UserRole.ADMIN
      }
    });
    console.log(`✔ Default admin user seeded (${adminEmail} / password: admin_secret_pass).`);
  } else {
    console.log(`✔ Admin user ${adminEmail} already exists. Skipping.`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
