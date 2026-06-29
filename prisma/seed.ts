/**
 * Moataz AI — Production Recovery & Stabilization Bootstrap
 * ========================================================
 * Version: 3.0.0 (Recovery Mode)
 */

import { PrismaClient, RoleName, ProviderType, PermissionAction, FeatureFlagType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🛡️ ENTERING PRODUCTION RECOVERY MODE...\n');

  // 1. ROLES & PERMISSIONS AUDIT
  console.log('📋 Phase 1: Roles & RBAC Audit...');
  const roles = Object.values(RoleName);
  const roleRecords: Record<string, any> = {};
  
  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `Official ${roleName} role for Moataz AI Recovery.`,
      },
    });
    roleRecords[roleName] = role;
  }

  const resources = [
    'user', 'organization', 'team', 'project', 'workspace', 'chat', 
    'provider', 'model', 'file', 'artifact', 'note', 'task', 
    'memory', 'knowledge', 'collection', 'embedding', 'settings', 
    'auditLog', 'analytics', 'featureFlag', 'notification'
  ];
  const actions = Object.values(PermissionAction);

  for (const roleName of [RoleName.SUPER_ADMIN, RoleName.ADMIN]) {
    const role = roleRecords[roleName];
    if (!role) continue;
    for (const resource of resources) {
      for (const action of actions) {
        await prisma.permission.upsert({
          where: { roleId_resource_action: { roleId: role.id, resource, action } },
          update: {},
          create: { roleId: role.id, resource, action },
        });
      }
    }
  }
  console.log('   ✅ RBAC System Stabilized.');

  // 2. SUPER ADMIN RECOVERY
  console.log('\n👤 Phase 2: Super Admin Recovery...');
  const officialEmail = 'mtzallqmy@gmail.com';
  const officialPassword = 'moataz7754';
  const passwordHash = await bcrypt.hash(officialPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: officialEmail },
    update: {
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: officialEmail,
      name: 'Moataz Al-Alqmi',
      passwordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      isSuperAdmin: true,
      preferredLocale: 'ar',
    },
  });
  console.log(`   ✅ Owner Account Secured: ${officialEmail}`);

  // 3. INFRASTRUCTURE RECOVERY
  console.log('\n🏢 Phase 3: Infrastructure Recovery...');
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'moataz-ai-enterprise' },
    update: { ownerId: superAdmin.id },
    create: {
      name: 'Moataz AI Enterprise',
      slug: 'moataz-ai-enterprise',
      isActive: true,
      plan: 'enterprise',
      ownerId: superAdmin.id,
    },
  });

  const defaultProject = await prisma.project.upsert({
    where: { organizationId_slug: { organizationId: defaultOrg.id, slug: 'default-project' } },
    update: {},
    create: {
      name: 'Main Project',
      slug: 'default-project',
      organizationId: defaultOrg.id,
      isActive: true,
    },
  });

  await prisma.workspace.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { organizationId: defaultOrg.id, projectId: defaultProject.id },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Production Workspace',
      organizationId: defaultOrg.id,
      projectId: defaultProject.id,
    },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: superAdmin.id, organizationId: defaultOrg.id } },
    update: { role: RoleName.SUPER_ADMIN },
    create: {
      userId: superAdmin.id,
      organizationId: defaultOrg.id,
      role: RoleName.SUPER_ADMIN,
    },
  });
  console.log('   ✅ Core Organization & Workspaces Ready.');

  // 4. PROVIDER MANAGER RECOVERY
  console.log('\n🤖 Phase 4: AI Provider Recovery & Import...');
  const providerConfigs = [
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
    { type: ProviderType.HUGGING_FACE, env: 'HUGGINGFACE_API_KEY', name: 'Hugging Face' },
    { type: ProviderType.CUSTOM, env: 'OPENAI_COMPATIBLE_API_KEY', name: 'OpenAI Compatible' },
  ];

  for (const p of providerConfigs) {
    const apiKey = process.env[p.env];
    const isConfigured = !!(apiKey && apiKey.length > 0);
    
    await prisma.provider.upsert({
      where: { organizationId_type: { organizationId: defaultOrg.id, type: p.type } },
      update: { 
        isActive: isConfigured,
        apiKey: apiKey || undefined,
        healthStatus: isConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
        source: 'ENVIRONMENT'
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
    console.log(`   ${isConfigured ? '✅' : '⚪'} Provider ${p.name}: ${isConfigured ? 'Enabled' : 'Disabled'}`);
  }

  // 5. STABILIZATION DEFAULTS
  console.log('\n🚩 Phase 5: Stabilization Defaults...');
  const flags = [
    { key: 'enable-registration', name: 'Registration', type: FeatureFlagType.BOOLEAN, value: true },
    { key: 'maintenance-mode', name: 'Maintenance', type: FeatureFlagType.BOOLEAN, value: false },
  ];
  for (const flag of flags) {
    await prisma.featureFlag.upsert({ where: { key: flag.key }, update: {}, create: flag });
  }

  console.log('\n✨ RECOVERY COMPLETED. SYSTEM STABILIZED.');
  console.log('═══════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('\n❌ RECOVERY FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
