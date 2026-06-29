/**
 * Moataz AI — Production Database Seed
 * =====================================
 * Seeds essential data for a fresh PostgreSQL deployment.
 * Run: npx prisma db seed
 */

import { PrismaClient, RoleName, PermissionAction, ProviderType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Moataz AI database...\n');

  // 1. ROLES & PERMISSIONS
  console.log('📋 Creating roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: RoleName.SUPER_ADMIN },
      update: {},
      create: { name: RoleName.SUPER_ADMIN, description: 'Full system access.' },
    }),
    prisma.role.upsert({
      where: { name: RoleName.ADMIN },
      update: {},
      create: { name: RoleName.ADMIN, description: 'Organization administrator.' },
    }),
    prisma.role.upsert({
      where: { name: RoleName.MEMBER },
      update: {},
      create: { name: RoleName.MEMBER, description: 'Standard member.' },
    }),
  ]);

  // 2. SUPER ADMIN USER
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@moataz.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!';
  
  console.log(`👤 Checking for Super Admin: ${adminEmail}...`);
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  let superAdmin;
  if (!existingAdmin) {
    console.log('👤 Creating initial Super Admin account...');
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    superAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Moataz AI Admin',
        passwordHash,
        emailVerified: true,
        isActive: true,
        isSuperAdmin: true,
        preferredLocale: 'ar',
      },
    });
    console.log(`   ✅ Super Admin created: ${adminEmail}`);
  } else {
    superAdmin = existingAdmin;
    console.log('   ℹ️ Super Admin already exists, skipping creation.');
  }

  // 3. DEFAULT ORGANIZATION
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'moataz-ai' },
    update: {},
    create: {
      name: 'Moataz AI',
      slug: 'moataz-ai',
      isActive: true,
      plan: 'enterprise',
      ownerId: superAdmin.id,
    },
  });

  // 4. AI PROVIDERS (Auto-enable based on ENV)
  console.log('🤖 Configuring AI providers...');
  const providerConfigs = [
    { type: ProviderType.OPENAI, env: 'OPENAI_API_KEY', name: 'OpenAI' },
    { type: ProviderType.GEMINI, env: 'GEMINI_API_KEY', name: 'Google Gemini' },
    { type: ProviderType.ANTHROPIC, env: 'ANTHROPIC_API_KEY', name: 'Anthropic' },
    { type: ProviderType.DEEPSEEK, env: 'DEEPSEEK_API_KEY', name: 'DeepSeek' },
    { type: ProviderType.GROQ, env: 'GROQ_API_KEY', name: 'Groq' },
    { type: ProviderType.OPENROUTER, env: 'OPENROUTER_API_KEY', name: 'OpenRouter' },
  ];

  for (const p of providerConfigs) {
    const apiKey = process.env[p.env];
    const isActive = !!(apiKey && apiKey.length > 0);
    
    await prisma.provider.upsert({
      where: { organizationId_type: { organizationId: defaultOrg.id, type: p.type } },
      update: { isActive },
      create: {
        organizationId: defaultOrg.id,
        type: p.type,
        name: p.name,
        isActive,
        apiKey: apiKey || '',
        baseUrl: '', // Use defaults in driver
      },
    });
    console.log(`   ${isActive ? '✅' : '⚪'} Provider ${p.name}: ${isActive ? 'Enabled' : 'Not Configured'}`);
  }

  console.log('\n✅ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
