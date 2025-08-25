// Database utilities and queries for User Service
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class UserDatabase {
  constructor(pg) {
    this.pg = pg;
  }

  // User management
  async createUser(userData) {
    const {
      keycloak_sub,
      email,
      username,
      first_name,
      last_name,
      display_name,
      avatar_url,
      department,
      job_title,
      manager_id,
      preferences = {},
      metadata = {}
    } = userData;

    const query = `
      INSERT INTO users (
        keycloak_sub, email, username, first_name, last_name, 
        display_name, avatar_url, department, job_title, manager_id,
        preferences, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (keycloak_sub) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        first_name = COALESCE(EXCLUDED.first_name, users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, users.last_name),
        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        department = COALESCE(EXCLUDED.department, users.department),
        job_title = COALESCE(EXCLUDED.job_title, users.job_title),
        manager_id = COALESCE(EXCLUDED.manager_id, users.manager_id),
        preferences = COALESCE(EXCLUDED.preferences, users.preferences),
        metadata = COALESCE(EXCLUDED.metadata, users.metadata),
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      keycloak_sub, email, username, first_name, last_name,
      display_name, avatar_url, department, job_title, manager_id,
      JSON.stringify(preferences), JSON.stringify(metadata)
    ];

    const result = await this.pg.query(query, values);
    return result.rows[0];
  }

  async getUserByKeycloakSub(keycloak_sub) {
    const query = 'SELECT * FROM users WHERE keycloak_sub = $1';
    const result = await this.pg.query(query, [keycloak_sub]);
    return result.rows[0];
  }

  async getUserById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pg.query(query, [id]);
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pg.query(query, [email]);
    return result.rows[0];
  }

  async updateUser(id, userData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'keycloak_sub') {
        fields.push(`${key} = $${paramCount}`);
        if (key === 'preferences' || key === 'metadata') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pg.query(query, values);
    return result.rows[0];
  }

  async searchUsers(searchParams) {
    const { search, department, is_active, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = searchParams;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (
        username ILIKE $${paramCount} OR 
        email ILIKE $${paramCount} OR 
        first_name ILIKE $${paramCount} OR 
        last_name ILIKE $${paramCount} OR 
        display_name ILIKE $${paramCount}
      )`;
      values.push(`%${search}%`);
      paramCount++;
    }

    if (department) {
      whereClause += ` AND department = $${paramCount}`;
      values.push(department);
      paramCount++;
    }

    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${paramCount}`;
      values.push(is_active);
      paramCount++;
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await this.pg.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const offset = (page - 1) * limit;
    const allowedSorts = ['created_at', 'updated_at', 'username', 'email', 'last_login_at'];
    const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT * FROM users ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    values.push(limit, offset);

    const result = await this.pg.query(query, values);
    
    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  async updateLastLogin(userId) {
    const query = 'UPDATE users SET last_login_at = NOW() WHERE id = $1';
    await this.pg.query(query, [userId]);
  }

  // API Key management
  async createApiKey(userId, keyData) {
    const { name, permissions = [], expires_at } = keyData;
    
    // Generate API key
    const apiKey = this.generateApiKey();
    const keyHash = await bcrypt.hash(apiKey, 10);
    const keyPrefix = apiKey.substring(0, 8);

    const query = `
      INSERT INTO user_api_keys (
        user_id, name, key_hash, key_prefix, permissions, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, key_prefix, permissions, expires_at, is_active, created_at
    `;

    const values = [
      userId, name, keyHash, keyPrefix, 
      JSON.stringify(permissions), expires_at
    ];

    const result = await this.pg.query(query, values);
    
    return {
      ...result.rows[0],
      api_key: apiKey // Only returned on creation
    };
  }

  async getUserApiKeys(userId) {
    const query = `
      SELECT id, name, key_prefix, permissions, expires_at, 
             last_used_at, is_active, created_at, updated_at
      FROM user_api_keys 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    
    const result = await this.pg.query(query, [userId]);
    return result.rows;
  }

  async revokeApiKey(userId, keyId) {
    const query = `
      UPDATE user_api_keys 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await this.pg.query(query, [keyId, userId]);
    return result.rows[0];
  }

  // User Groups
  async createUserGroup(groupData) {
    const { name, description, permissions = [], metadata = {} } = groupData;
    
    const query = `
      INSERT INTO user_groups (name, description, permissions, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [name, description, JSON.stringify(permissions), JSON.stringify(metadata)];
    const result = await this.pg.query(query, values);
    return result.rows[0];
  }

  async getUserGroups(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const countQuery = 'SELECT COUNT(*) FROM user_groups';
    const countResult = await this.pg.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT * FROM user_groups
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await this.pg.query(query, [limit, offset]);
    
    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  async addUserToGroup(userId, groupId, role = 'member', grantedBy = null, expiresAt = null) {
    const query = `
      INSERT INTO user_group_memberships (user_id, group_id, role, granted_by, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, group_id) DO UPDATE SET
        role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by,
        expires_at = EXCLUDED.expires_at,
        granted_at = NOW()
      RETURNING *
    `;
    
    const values = [userId, groupId, role, grantedBy, expiresAt];
    const result = await this.pg.query(query, values);
    return result.rows[0];
  }

  async getUserGroupMemberships(userId) {
    const query = `
      SELECT ugm.*, ug.name as group_name, ug.description as group_description
      FROM user_group_memberships ugm
      JOIN user_groups ug ON ugm.group_id = ug.id
      WHERE ugm.user_id = $1 
      AND (ugm.expires_at IS NULL OR ugm.expires_at > NOW())
      ORDER BY ugm.granted_at DESC
    `;
    
    const result = await this.pg.query(query, [userId]);
    return result.rows;
  }

  // Session tracking
  async trackSession(userId, sessionData) {
    const { session_id, ip_address, user_agent, login_method, expires_at } = sessionData;
    
    const query = `
      INSERT INTO user_sessions (
        user_id, session_id, ip_address, user_agent, login_method, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const values = [userId, session_id, ip_address, user_agent, login_method, expires_at];
    const result = await this.pg.query(query, values);
    return result.rows[0];
  }

  async endSession(sessionId) {
    const query = `
      UPDATE user_sessions 
      SET ended_at = NOW()
      WHERE session_id = $1 AND ended_at IS NULL
    `;
    
    await this.pg.query(query, [sessionId]);
  }

  // Utility methods
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  async verifyApiKey(apiKey) {
    const keyPrefix = apiKey.substring(0, 8);
    
    const query = `
      SELECT uak.*, u.keycloak_sub, u.email, u.is_active as user_active
      FROM user_api_keys uak
      JOIN users u ON uak.user_id = u.id
      WHERE uak.key_prefix = $1 AND uak.is_active = true AND u.is_active = true
      AND (uak.expires_at IS NULL OR uak.expires_at > NOW())
    `;
    
    const result = await this.pg.query(query, [keyPrefix]);
    
    for (const row of result.rows) {
      const isValid = await bcrypt.compare(apiKey, row.key_hash);
      if (isValid) {
        // Update last used timestamp
        await this.pg.query(
          'UPDATE user_api_keys SET last_used_at = NOW() WHERE id = $1',
          [row.id]
        );
        return row;
      }
    }
    
    return null;
  }
}

module.exports = UserDatabase;
