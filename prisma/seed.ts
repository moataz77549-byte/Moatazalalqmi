/**
 * Moataz AI — Ultimate Production Bootstrap & System Initialization
 * =================================================================
 * Principal Architect: Moataz AI Team
 * Version: 2.0.0 (Production)
 */

import { PrismaClient, RoleName, ProviderType, PermissionAction, FeatureFlagType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 INITIALIZING MOATAZ AI PRODUCTION BOOTSTRAP...\n');

  // 1. ROLES SYNCHRONIZATION
  console.log('📋 Step 1: Synchronizing RBAC Roles...');
  const roles = Object.values(RoleName);
  const roleRecords: Record<string, any> = {};
  
  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `Official ${roleName} role for the Moataz AI platform.`,
      },
    });
    roleRecords[roleName] = role;
    console.log(`   - Role ${roleName} synchronized.`);
  }

  // 2. PERMISSIONS INITIALIZATION
  console.log('\n🔐 Step 2: Initializing Global Permissions...');
  const resources = [
    'user', 'organization', 'team', 'project', 'workspace', 'chat', 
    'provider', 'model', 'file', 'artifact', 'note', 'task', 
    'memory', 'knowledge', 'collection', 'embedding', 'settings', 
    'auditLog', 'analytics', 'featureFlag', 'notification'
  ];

  const actions = Object.values(PermissionAction);

  // Grant ALL permissions to SUPER_ADMIN and ADMIN (for now, can be refined)
  const privilegedRoles = [RoleName.SUPER_ADMIN, RoleName.ADMIN];
  
  for (const roleName of privilegedRoles) {
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
    console.log(`   - Full permissions granted to ${roleName}.`);
  }

  // 3. OFFICIAL SUPER ADMIN ACCOUNT
  console.log('\n👤 Step 3: Synchronizing Official Platform Administrator...');
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
      timezone: 'Asia/Riyadh',
    },
  });
  console.log(`   ✅ Official Super Admin Ready: ${officialEmail}`);

  // 4. DEFAULT ORGANIZATION & WORKSPACE
  console.log('\n🏢 Step 4: Creating Default Organization & Workspace...');
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'moataz-ai-enterprise' },
    update: { ownerId: superAdmin.id },
    create: {
      name: 'Moataz AI Enterprise',
      slug: 'moataz-ai-enterprise',
      description: 'Default production organization.',
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
      description: 'Default production project.',
      organizationId: defaultOrg.id,
      isActive: true,
    },
  });

  const defaultWorkspace = await prisma.workspace.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' }, // Fixed UUID for default
    update: { organizationId: defaultOrg.id, projectId: defaultProject.id },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Production Workspace',
      description: 'Primary workspace for AI operations.',
      organizationId: defaultOrg.id,
      projectId: defaultProject.id,
    },
  });

  // Ensure Membership
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: superAdmin.id, organizationId: defaultOrg.id } },
    update: { role: RoleName.SUPER_ADMIN },
    create: {
      userId: superAdmin.id,
      organizationId: defaultOrg.id,
      role: RoleName.SUPER_ADMIN,
    },
  });
  console.log('   ✅ Infrastructure initialized.');

  // 5. AI PROVIDERS & ENVIRONMENT IMPORT
  console.log('\n🤖 Step 5: Importing AI Providers from Environment...');
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
        baseUrl: p.type === ProviderType.CUSTOM ? process.env.OPENAI_COMPATIBLE_URL : undefined
      },
      create: {
        organizationId: defaultOrg.id,
        type: p.type,
        name: p.name,
        apiKey: apiKey || null,
        isActive: isConfigured,
        source: 'ENVIRONMENT',
        healthStatus: isConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
        baseUrl: p.type === ProviderType.CUSTOM ? process.env.OPENAI_COMPATIBLE_URL : undefined
      },
    });
    console.log(`   ${isConfigured ? '✅' : '⚪'} Provider ${p.name}: ${isConfigured ? 'Active' : 'Not Configured'}`);
  }

  // 6. FEATURE FLAGS & SETTINGS
  console.log('\n🚩 Step 6: Initializing Feature Flags & Defaults...');
  const flags = [
    { key: 'enable-registration', name: 'User Registration', type: FeatureFlagType.BOOLEAN, value: true },
    { key: 'enable-api-access', name: 'External API Access', type: FeatureFlagType.BOOLEAN, value: true },
    { key: 'enable-file-upload', name: 'File Upload & Analysis', type: FeatureFlagType.BOOLEAN, value: true },
    { key: 'maintenance-mode', name: 'Maintenance Mode', type: FeatureFlagType.BOOLEAN, value: false },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { value: flag.value },
      create: flag,
    });
  }

  // Default Org Settings
  const orgSettings = [
    { key: 'default-language', value: 'ar' },
    { key: 'theme-color', value: '#6366f1' },
    { key: 'allow-public-sharing', value: true },
  ];

  for (const setting of orgSettings) {
    await prisma.organizationSetting.upsert({
      where: { organizationId_key: { organizationId: defaultOrg.id, key: setting.key } },
      update: { value: setting.value },
      create: { organizationId: defaultOrg.id, key: setting.key, value: setting.value },
    });
  }

  console.log('\n✨ BOOTSTRAP COMPLETED SUCCESSFULLY.');
  console.log('═══════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('\n❌ BOOTSTRAP FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
