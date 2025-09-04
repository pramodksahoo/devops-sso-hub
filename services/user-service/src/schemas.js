// User Service Data Schemas using Zod
const { z } = require('zod');

// User profile schema
const UserProfileSchema = z.object({
  keycloak_sub: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1).max(100),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  display_name: z.string().max(200).optional(),
  avatar_url: z.string().url().optional(),
  department: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  manager_id: z.string().uuid().optional(),
  preferences: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({})
});

const UpdateUserProfileSchema = UserProfileSchema.partial().omit({ 
  keycloak_sub: true 
});

// API Key schema
const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).default([]),
  expires_at: z.string().datetime().optional()
});

// User Group schema
const CreateUserGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

const UpdateUserGroupSchema = CreateUserGroupSchema.partial();

// Group membership schema
const GroupMembershipSchema = z.object({
  user_id: z.string().uuid(),
  group_id: z.string().uuid(),
  role: z.enum(['member', 'admin', 'owner']).default('member'),
  expires_at: z.string().datetime().optional()
});

// Query parameters schema
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc')
});

const UserQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  department: z.string().optional(),
  is_active: z.coerce.boolean().optional()
});

// OpenAPI schemas for documentation
const openApiSchemas = {
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      keycloak_sub: { type: 'string' },
      email: { type: 'string', format: 'email' },
      username: { type: 'string' },
      first_name: { type: 'string' },
      last_name: { type: 'string' },
      display_name: { type: 'string' },
      avatar_url: { type: 'string', format: 'uri' },
      department: { type: 'string' },
      job_title: { type: 'string' },
      manager_id: { type: 'string', format: 'uuid' },
      preferences: { type: 'object' },
      metadata: { type: 'object' },
      is_active: { type: 'boolean' },
      last_login_at: { type: 'string', format: 'date-time' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },
  UserApiKey: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      key_prefix: { type: 'string' },
      permissions: { type: 'array', items: { type: 'string' } },
      expires_at: { type: 'string', format: 'date-time' },
      last_used_at: { type: 'string', format: 'date-time' },
      is_active: { type: 'boolean' },
      created_at: { type: 'string', format: 'date-time' }
    }
  },
  UserGroup: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string' },
      permissions: { type: 'array', items: { type: 'string' } },
      metadata: { type: 'object' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      statusCode: { type: 'number' }
    }
  },
  PaginatedResponse: {
    type: 'object',
    properties: {
      data: { type: 'array' },
      pagination: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          total: { type: 'number' },
          totalPages: { type: 'number' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' }
        }
      }
    }
  }
};

module.exports = {
  UserProfileSchema,
  UpdateUserProfileSchema,
  CreateApiKeySchema,
  CreateUserGroupSchema,
  UpdateUserGroupSchema,
  GroupMembershipSchema,
  PaginationSchema,
  UserQuerySchema,
  openApiSchemas
};
