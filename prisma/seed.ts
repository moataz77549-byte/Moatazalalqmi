/**
 * Moataz AI — Enterprise AI Provider Management System (Bootstrap)
 * ===============================================================
 * Automatically scans environment variables and initializes the database.
 */

import { PrismaClient, RoleName, ProviderType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Enterprise AI Provider Management Bootstrap...\n');

  // 1. ROLES
  console.log('📋 Synchronizing roles...');
  const roles = [
    { name: RoleName.SUPER_ADMIN, description: 'Full system access.' },
    { name: RoleName.ADMIN, description: 'Organization administrator.' },
    { name: RoleName.MEMBER, description: 'Standard member.' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  // 2. SUPER ADMIN
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@moataz.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!';
  
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  let superAdmin;

  if (!existingAdmin) {
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
    console.log(`👤 Created Super Admin: ${adminEmail}`);
  } else {
    superAdmin = existingAdmin;
    console.log(`👤 Super Admin verified: ${adminEmail}`);
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

  // 4. AUTOMATIC ENVIRONMENT IMPORT (Enterprise Logic)
  console.log('\n🤖 Scanning Railway Environment Variables for AI Providers...');
  
  const providerDefinitions = [
    { type: ProviderType.OPENAI, env: 'OPENAI_API_KEY', name: 'OpenAI' },
    { type: ProviderType.GEMINI, env: 'GEMINI_API_KEY', name: 'Google Gemini' },
    { type: ProviderType.ANTHROPIC, env: 'ANTHROPIC_API_KEY', name: 'Anthropic Claude' },
    { type: ProviderType.OPENROUTER, env: 'OPENROUTER_API_KEY', name: 'OpenRouter' },
    { type: ProviderType.GROQ, env: 'GROQ_API_KEY', name: 'Groq' },
    { type: ProviderType.DEEPSEEK, env: 'DEEPSEEK_API_KEY', name: 'DeepSeek' },
    { type: ProviderType.NVIDIA_NIM, env: 'NVIDIA_API_KEY', name: 'NVIDIA NIM' },
    { type: ProviderType.HUGGING_FACE, env: 'HUGGINGFACE_API_KEY', name: 'HuggingFace' },
    { type: ProviderType.COHERE, env: 'COHERE_API_KEY', name: 'Cohere' },
    { type: ProviderType.MISTRAL, env: 'MISTRAL_API_KEY', name: 'Mistral' },
    { type: ProviderType.AZURE_OPENAI, env: 'AZURE_OPENAI_API_KEY', name: 'Azure OpenAI' },
    { type: ProviderType.OLLAMA, env: 'OLLAMA_BASE_URL', name: 'Ollama' },
  ];

  for (const p of providerDefinitions) {
    const apiKey = process.env[p.env];
    const isEnvAvailable = !!(apiKey && apiKey.length > 0);

    // Check if provider already exists in DB
    const existingProvider = await prisma.provider.findUnique({
      where: { organizationId_type: { organizationId: defaultOrg.id, type: p.type } }
    });

    // Rules:
    // 1. Never overwrite manually configured providers (Source: DATABASE)
    // 2. If it doesn't exist, import from ENVIRONMENT
    // 3. If it exists as ENVIRONMENT source, update from current ENV
    
    if (!existingProvider) {
      await prisma.provider.create({
        data: {
          organizationId: defaultOrg.id,
          type: p.type,
          name: p.name,
          apiKey: apiKey || null,
          isActive: isEnvAvailable,
          source: 'ENVIRONMENT',
          healthStatus: isEnvAvailable ? 'CONNECTED' : 'NOT_CONFIGURED',
          priority: 1,
        }
      });
      console.log(`   ✨ Imported: ${p.name} (Source: Environment) -> ${isEnvAvailable ? 'Enabled' : 'Disabled'}`);
    } else if (existingProvider.source === 'ENVIRONMENT') {
      await prisma.provider.update({
        where: { id: existingProvider.id },
        data: {
          apiKey: apiKey || existingProvider.apiKey,
          isActive: isEnvAvailable,
          healthStatus: isEnvAvailable ? 'CONNECTED' : 'NOT_CONFIGURED',
        }
      });
      console.log(`   🔄 Updated: ${p.name} (Source: Environment)`);
    } else {
      console.log(`   ℹ️  Skipped: ${p.name} (Manual Configuration Protected)`);
    }
  }

  console.log('\n✅ Enterprise AI Provider Management System initialized.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
