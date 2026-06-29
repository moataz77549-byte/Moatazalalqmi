/**
 * Moataz AI — Production Database Seed
 * =====================================
 * Seeds essential data for a fresh PostgreSQL deployment.
 * Run: npx prisma db seed
 */

import { PrismaClient, RoleName, PermissionAction, ProviderType } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Moataz AI database...\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. ROLES & PERMISSIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('📋 Creating roles...');

  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: RoleName.SUPER_ADMIN },
      update: {},
      create: {
        name: RoleName.SUPER_ADMIN,
        description: 'Full system access. Can manage all organizations, users, and settings.',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.ADMIN },
      update: {},
      create: {
        name: RoleName.ADMIN,
        description: 'Organization administrator. Can manage members, projects, and settings.',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.MANAGER },
      update: {},
      create: {
        name: RoleName.MANAGER,
        description: 'Project manager. Can manage projects and team members.',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.MEMBER },
      update: {},
      create: {
        name: RoleName.MEMBER,
        description: 'Standard member. Can use AI features and manage own resources.',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.GUEST },
      update: {},
      create: {
        name: RoleName.GUEST,
        description: 'Limited access. Read-only for shared resources.',
      },
    }),
  ]);

  console.log(`   ✅ ${roles.length} roles created`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. PERMISSIONS (RBAC Matrix)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('🔐 Creating permissions...');

  const resources = [
    'user', 'organization', 'team', 'project', 'workspace',
    'chat', 'message', 'file', 'provider', 'model',
    'apiKey', 'notification', 'auditLog', 'settings',
    'featureFlag', 'memory', 'collection', 'document', 'embedding',
  ];

  const superAdminRole = roles[0];
  const adminRole = roles[1];
  const managerRole = roles[2];
  const memberRole = roles[3];

  // Super Admin: MANAGE all resources
  for (const resource of resources) {
    await prisma.permission.upsert({
      where: {
        roleId_resource_action: {
          roleId: superAdminRole.id,
          resource,
          action: PermissionAction.MANAGE,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        resource,
        action: PermissionAction.MANAGE,
      },
    });
  }

  // Admin: CRUD on most resources
  const adminResources = [
    'organization', 'team', 'project', 'workspace', 'chat',
    'message', 'file', 'provider', 'model', 'apiKey',
    'settings', 'memory', 'collection', 'document',
  ];
  for (const resource of adminResources) {
    for (const action of [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE]) {
      await prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: adminRole.id,
            resource,
            action,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          resource,
          action,
        },
      });
    }
  }

  // Manager: CRU on project-level resources
  const managerResources = ['project', 'workspace', 'chat', 'message', 'file', 'memory', 'collection', 'document'];
  for (const resource of managerResources) {
    for (const action of [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE]) {
      await prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: managerRole.id,
            resource,
            action,
          },
        },
        update: {},
        create: {
          roleId: managerRole.id,
          resource,
          action,
        },
      });
    }
  }

  // Member: CR on own resources
  const memberResources = ['chat', 'message', 'file', 'memory', 'document'];
  for (const resource of memberResources) {
    for (const action of [PermissionAction.CREATE, PermissionAction.READ]) {
      await prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: memberRole.id,
            resource,
            action,
          },
        },
        update: {},
        create: {
          roleId: memberRole.id,
          resource,
          action,
        },
      });
    }
  }

  console.log('   ✅ Permissions matrix created');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. SUPER ADMIN USER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('👤 Creating Super Admin user...');

  // bcrypt hash for "admin123!" — CHANGE IN PRODUCTION
  const defaultPasswordHash = '$2b$12$LJ3cW/E8xKiZPgUZ4x6xXuY7gNqfzR.1Xz0vSqYXcgx5jLmLkPeO';

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@moataz.ai' },
    update: {},
    create: {
      email: 'admin@moataz.ai',
      name: 'Moataz AI Admin',
      passwordHash: defaultPasswordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      isSuperAdmin: true,
      preferredLocale: 'ar',
      timezone: 'Asia/Riyadh',
    },
  });

  console.log(`   ✅ Super Admin: ${superAdmin.email}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. DEFAULT ORGANIZATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('🏢 Creating default organization...');

  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'moataz-ai' },
    update: {},
    create: {
      name: 'Moataz AI',
      slug: 'moataz-ai',
      description: 'Default organization for Moataz AI platform',
      isActive: true,
      plan: 'enterprise',
      ownerId: superAdmin.id,
    },
  });

  console.log(`   ✅ Organization: ${defaultOrg.name} (${defaultOrg.slug})`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. MEMBERSHIP (Super Admin → Org)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: superAdmin.id,
        organizationId: defaultOrg.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      organizationId: defaultOrg.id,
      role: RoleName.SUPER_ADMIN,
    },
  });

  console.log('   ✅ Super Admin membership created');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. DEFAULT PROJECT & WORKSPACE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('📁 Creating default project & workspace...');

  const defaultProject = await prisma.project.upsert({
    where: {
      organizationId_slug: {
        organizationId: defaultOrg.id,
        slug: 'default',
      },
    },
    update: {},
    create: {
      name: 'Default Project',
      slug: 'default',
      description: 'Default workspace project',
      icon: '🚀',
      color: '#6366f1',
      organizationId: defaultOrg.id,
      isActive: true,
    },
  });

  const defaultWorkspace = await prisma.workspace.create({
    data: {
      name: 'Main Workspace',
      description: 'Primary workspace for AI interactions',
      organizationId: defaultOrg.id,
      projectId: defaultProject.id,
      layout: {
        panels: ['chat', 'sidebar', 'knowledge'],
        theme: 'dark',
      },
    },
  });

  console.log(`   ✅ Project: ${defaultProject.name}`);
  console.log(`   ✅ Workspace: ${defaultWorkspace.name}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. AI PROVIDERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('🤖 Creating AI providers...');

  const providers = [
    {
      type: ProviderType.OPENAI,
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      config: {
        supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'],
        defaultModel: 'gpt-4o',
        maxTokens: 128000,
      },
    },
    {
      type: ProviderType.ANTHROPIC,
      name: 'Anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      config: {
        supportedModels: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
        defaultModel: 'claude-sonnet-4-20250514',
        maxTokens: 200000,
      },
    },
    {
      type: ProviderType.GEMINI,
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      config: {
        supportedModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
        defaultModel: 'gemini-2.5-flash',
        maxTokens: 1000000,
      },
    },
    {
      type: ProviderType.DEEPSEEK,
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      config: {
        supportedModels: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
        defaultModel: 'deepseek-chat',
        maxTokens: 64000,
      },
    },
    {
      type: ProviderType.GROQ,
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      config: {
        supportedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
        defaultModel: 'llama-3.3-70b-versatile',
        maxTokens: 131072,
      },
    },
    {
      type: ProviderType.MISTRAL,
      name: 'Mistral AI',
      baseUrl: 'https://api.mistral.ai/v1',
      config: {
        supportedModels: ['mistral-large-latest', 'mistral-medium-latest', 'codestral-latest'],
        defaultModel: 'mistral-large-latest',
        maxTokens: 128000,
      },
    },
    {
      type: ProviderType.OPENROUTER,
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      config: {
        supportedModels: ['auto'],
        defaultModel: 'auto',
        description: 'Multi-provider routing gateway',
      },
    },
    {
      type: ProviderType.OLLAMA,
      name: 'Ollama (Local)',
      baseUrl: 'http://localhost:11434/api',
      config: {
        supportedModels: ['llama3.2', 'codellama', 'mistral', 'qwen2.5-coder'],
        defaultModel: 'llama3.2',
        isLocal: true,
      },
    },
  ];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: {
        organizationId_type: {
          organizationId: defaultOrg.id,
          type: provider.type,
        },
      },
      update: { config: provider.config },
      create: {
        organizationId: defaultOrg.id,
        type: provider.type,
        name: provider.name,
        baseUrl: provider.baseUrl,
        isActive: true,
        config: provider.config,
      },
    });
  }

  console.log(`   ✅ ${providers.length} AI providers configured`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. DEFAULT SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('⚙️  Creating default settings...');

  const orgSettings = [
    { key: 'ai.defaultProvider', value: { provider: 'OPENAI', model: 'gpt-4o' } },
    { key: 'ai.maxTokensPerRequest', value: { limit: 4096 } },
    { key: 'ai.streamingEnabled', value: { enabled: true } },
    { key: 'security.sessionTimeout', value: { hours: 24 } },
    { key: 'security.mfaRequired', value: { enabled: false } },
    { key: 'storage.maxFileSize', value: { bytes: 52428800, label: '50MB' } },
    { key: 'storage.allowedMimeTypes', value: { types: ['application/pdf', 'text/*', 'image/*', 'application/json'] } },
    { key: 'knowledge.defaultEmbeddingModel', value: { model: 'OPENAI_SMALL', dimensions: 1536 } },
    { key: 'knowledge.chunkSize', value: { tokens: 512, overlap: 50 } },
    { key: 'memory.autoExtract', value: { enabled: true, confidence_threshold: 0.7 } },
    { key: 'ui.theme', value: { default: 'dark', allowUserOverride: true } },
    { key: 'ui.language', value: { default: 'ar', supported: ['ar', 'en'] } },
  ];

  for (const setting of orgSettings) {
    await prisma.organizationSetting.upsert({
      where: {
        organizationId_key: {
          organizationId: defaultOrg.id,
          key: setting.key,
        },
      },
      update: { value: setting.value },
      create: {
        organizationId: defaultOrg.id,
        key: setting.key,
        value: setting.value,
      },
    });
  }

  console.log(`   ✅ ${orgSettings.length} organization settings created`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 9. FEATURE FLAGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('🚩 Creating feature flags...');

  const featureFlags = [
    { key: 'ai.streaming', name: 'AI Streaming', value: { enabled: true }, description: 'Enable streaming responses from AI models' },
    { key: 'ai.memory', name: 'AI Memory Engine', value: { enabled: true }, description: 'Enable AI memory persistence and recall' },
    { key: 'ai.knowledge_base', name: 'Knowledge Base', value: { enabled: true }, description: 'Enable document ingestion and RAG' },
    { key: 'ai.artifacts', name: 'Artifacts', value: { enabled: true }, description: 'Enable AI-generated artifact rendering' },
    { key: 'ai.branching', name: 'Chat Branching', value: { enabled: true }, description: 'Enable conversation branching/forking' },
    { key: 'ui.dark_mode', name: 'Dark Mode', value: { enabled: true, default: true }, description: 'Dark theme toggle' },
    { key: 'billing.enabled', name: 'Billing', value: { enabled: false }, description: 'Enable billing and subscription management' },
    { key: 'export.enabled', name: 'Data Export', value: { enabled: true }, description: 'Allow users to export their data' },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { value: flag.value },
      create: {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        value: flag.value,
        isActive: true,
      },
    });
  }

  console.log(`   ✅ ${featureFlags.length} feature flags created`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 10. DEFAULT KNOWLEDGE COLLECTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('📚 Creating default knowledge collection...');

  await prisma.collection.create({
    data: {
      name: 'General Knowledge',
      description: 'Default knowledge base collection',
      collectionType: 'KNOWLEDGE_BASE',
      organizationId: defaultOrg.id,
      userId: superAdmin.id,
      icon: '📚',
      color: '#10b981',
      isShared: true,
    },
  });

  console.log('   ✅ Default knowledge collection created');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DONE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Database seeding completed!');
  console.log('═══════════════════════════════════════');
  console.log(`\n📊 Summary:`);
  console.log(`   • Roles: ${roles.length}`);
  console.log(`   • Super Admin: ${superAdmin.email}`);
  console.log(`   • Organization: ${defaultOrg.name}`);
  console.log(`   • AI Providers: ${providers.length}`);
  console.log(`   • Settings: ${orgSettings.length}`);
  console.log(`   • Feature Flags: ${featureFlags.length}`);
  console.log(`\n⚠️  IMPORTANT: Change the admin password after first login!`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
