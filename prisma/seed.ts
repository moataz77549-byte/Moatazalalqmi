/**
 * Moataz AI — Official Production Bootstrap
 * =========================================
 * Initializes the official Super Admin and AI Provider Management System.
 */

import { PrismaClient, RoleName, ProviderType, PermissionAction } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Official Moataz AI Production Bootstrap...\n');

  // 1. ROLES & PERMISSIONS (RBAC)
  console.log('📋 Synchronizing RBAC system...');
  const roles = Object.values(RoleName);
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `Official ${roleName} role.`,
      },
    });
  }

  const superAdminRole = await prisma.role.findUnique({ where: { name: RoleName.SUPER_ADMIN } });
  if (superAdminRole) {
    const resources = ['user', 'organization', 'team', 'project', 'workspace', 'chat', 'provider', 'settings', 'auditLog'];
    for (const resource of resources) {
      await prisma.permission.upsert({
        where: { roleId_resource_action: { roleId: superAdminRole.id, resource, action: PermissionAction.MANAGE } },
        update: {},
        create: { roleId: superAdminRole.id, resource, action: PermissionAction.MANAGE },
      });
    }
  }

  // 2. OFFICIAL SUPER ADMIN ACCOUNT
  const officialEmail = 'mtzallqmy@gmail.com';
  const officialPassword = 'moataz7754';
  
  console.log(`👤 Synchronizing Official Super Admin: ${officialEmail}...`);
  const passwordHash = await bcrypt.hash(officialPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: officialEmail },
    update: {
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
      emailVerified: true,
    },
    create: {
      email: officialEmail,
      name: 'Moataz Al-Alqmi',
      passwordHash,
      emailVerified: true,
      isActive: true,
      isSuperAdmin: true,
      preferredLocale: 'ar',
    },
  });
  console.log(`   ✅ Official Super Admin Ready: ${officialEmail}`);

  // 3. DEFAULT ORGANIZATION & OWNER
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'moataz-ai' },
    update: { ownerId: superAdmin.id },
    create: {
      name: 'Moataz AI',
      slug: 'moataz-ai',
      isActive: true,
      plan: 'enterprise',
      ownerId: superAdmin.id,
    },
  });

  // Ensure membership
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: superAdmin.id, organizationId: defaultOrg.id } },
    update: { role: RoleName.SUPER_ADMIN },
    create: {
      userId: superAdmin.id,
      organizationId: defaultOrg.id,
      role: RoleName.SUPER_ADMIN,
    },
  });

  // 4. AUTOMATIC AI PROVIDER IMPORT
  console.log('\n🤖 Scanning Railway Variables for AI Providers...');
  const providers = [
    { type: ProviderType.OPENAI, env: 'OPENAI_API_KEY', name: 'OpenAI' },
    { type: ProviderType.GEMINI, env: 'GEMINI_API_KEY', name: 'Google Gemini' },
    { type: ProviderType.ANTHROPIC, env: 'ANTHROPIC_API_KEY', name: 'Anthropic Claude' },
    { type: ProviderType.OPENROUTER, env: 'OPENROUTER_API_KEY', name: 'OpenRouter' },
    { type: ProviderType.GROQ, env: 'GROQ_API_KEY', name: 'Groq' },
    { type: ProviderType.DEEPSEEK, env: 'DEEPSEEK_API_KEY', name: 'DeepSeek' },
    { type: ProviderType.NVIDIA_NIM, env: 'NVIDIA_API_KEY', name: 'NVIDIA NIM' },
    { type: ProviderType.MISTRAL, env: 'MISTRAL_API_KEY', name: 'Mistral' },
    { type: ProviderType.COHERE, env: 'COHERE_API_KEY', name: 'Cohere' },
    { type: ProviderType.AZURE_OPENAI, env: 'AZURE_OPENAI_API_KEY', name: 'Azure OpenAI' },
    { type: ProviderType.OLLAMA, env: 'OLLAMA_BASE_URL', name: 'Ollama' },
  ];

  for (const p of providers) {
    const apiKey = process.env[p.env];
    const isConfigured = !!(apiKey && apiKey.length > 0);
    
    await prisma.provider.upsert({
      where: { organizationId_type: { organizationId: defaultOrg.id, type: p.type } },
      update: { 
        isActive: isConfigured,
        apiKey: apiKey || undefined,
        healthStatus: isConfigured ? 'CONNECTED' : 'NOT_CONFIGURED'
      },
      create: {
        organizationId: defaultOrg.id,
        type: p.type,
        name: p.name,
        apiKey: apiKey || null,
        isActive: isConfigured,
        source: 'ENVIRONMENT',
        healthStatus: isConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
      },
    });
    console.log(`   ${isConfigured ? '✅' : '⚪'} Provider ${p.name}: ${isConfigured ? 'Active' : 'Not Configured'}`);
  }

  console.log('\n✅ Official Bootstrap Completed Successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
