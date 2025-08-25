#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { execSync } = require('child_process');

/**
 * SSO Hub Database Migration Installer
 * 
 * This script handles database migrations for the SSO Hub project.
 * It reads migration files from /infra/db-migrations/ and applies them in order.
 */

class MigrationInstaller {
  constructor() {
    this.migrationsDir = path.join(__dirname, 'infra', 'db-migrations');
    this.client = null;
    this.config = this.loadConfig();
  }

  loadConfig() {
    // Load environment variables with defaults
    require('dotenv').config();
    
    return {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'sso_hub',
      user: process.env.POSTGRES_USER || 'sso_user',
      password: process.env.POSTGRES_PASSWORD || 'sso_password',
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
  }

  async connect() {
    this.client = new Client(this.config);
    try {
      await this.client.connect();
      console.log(`✅ Connected to PostgreSQL database: ${this.config.database}`);
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('✅ Disconnected from database');
    }
  }

  async getMigrationFiles() {
    try {
      const files = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`📁 Found ${files.length} migration files`);
      return files;
    } catch (error) {
      console.error('❌ Failed to read migration directory:', error.message);
      process.exit(1);
    }
  }

  async getAppliedMigrations() {
    try {
      const result = await this.client.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      // Table might not exist yet, return empty array
      console.log('📝 Schema migrations table not found, creating...');
      return [];
    }
  }

  async executeMigration(filename) {
    const filepath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filepath, 'utf8');
    
    console.log(`🔄 Executing migration: ${filename}`);
    
    try {
      // Execute the migration in a transaction
      await this.client.query('BEGIN');
      
      // Split SQL by semicolon and execute each statement
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.client.query(statement.trim());
        }
      }
      
      await this.client.query('COMMIT');
      console.log(`✅ Migration completed: ${filename}`);
      
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${filename}`);
      console.error('Error:', error.message);
      throw error;
    }
  }

  async run(options = {}) {
    console.log('🚀 Starting SSO Hub Database Migration Installer\n');
    
    await this.connect();
    
    try {
      const migrationFiles = await this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      
      console.log(`📊 Applied migrations: ${appliedMigrations.length}`);
      console.log(`📊 Available migrations: ${migrationFiles.length}\n`);
      
      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(file => {
        const version = path.parse(file).name;
        return !appliedMigrations.includes(version);
      });
      
      if (pendingMigrations.length === 0) {
        console.log('✅ All migrations are up to date!');
        return;
      }
      
      console.log(`🔄 Found ${pendingMigrations.length} pending migrations:`);
      pendingMigrations.forEach(file => console.log(`   - ${file}`));
      console.log('');
      
      if (options.dryRun) {
        console.log('🔍 Dry run mode - no migrations will be executed');
        return;
      }
      
      // Execute pending migrations
      for (const filename of pendingMigrations) {
        await this.executeMigration(filename);
      }
      
      console.log('\n🎉 All migrations completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Migration process failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  async rollback(steps = 1) {
    console.log(`🔄 Rolling back ${steps} migration(s)\n`);
    
    await this.connect();
    
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      
      if (appliedMigrations.length === 0) {
        console.log('❌ No migrations to rollback');
        return;
      }
      
      const migrationsToRollback = appliedMigrations.slice(-steps);
      
      console.log('⚠️  WARNING: Rollback functionality is limited.');
      console.log('   This will only remove entries from schema_migrations table.');
      console.log('   Manual data cleanup may be required.\n');
      
      for (const version of migrationsToRollback.reverse()) {
        console.log(`🔄 Rolling back: ${version}`);
        await this.client.query(
          'DELETE FROM schema_migrations WHERE version = $1',
          [version]
        );
        console.log(`✅ Rollback completed: ${version}`);
      }
      
      console.log('\n🎉 Rollback completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  async status() {
    console.log('📊 Migration Status\n');
    
    await this.connect();
    
    try {
      const migrationFiles = await this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      
      console.log('Migration Status:');
      console.log('================');
      
      migrationFiles.forEach(file => {
        const version = path.parse(file).name;
        const status = appliedMigrations.includes(version) ? '✅ Applied' : '⏳ Pending';
        console.log(`${status} - ${file}`);
      });
      
      console.log(`\n📊 Summary: ${appliedMigrations.length}/${migrationFiles.length} migrations applied`);
      
    } catch (error) {
      console.error('\n❌ Status check failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  
  const installer = new MigrationInstaller();
  
  try {
    // Check for --dry-run flag regardless of command
    const dryRun = args.includes('--dry-run');
    
    switch (command) {
      case 'migrate':
      case 'up':
      case '--dry-run':
        await installer.run({ dryRun: dryRun || command === '--dry-run' });
        break;
        
      case 'rollback':
      case 'down':
        const steps = parseInt(args[1]) || 1;
        await installer.rollback(steps);
        break;
        
      case 'status':
        await installer.status();
        break;
        
      case 'help':
      case '--help':
      case '-h':
        console.log(`
SSO Hub Migration Installer

Usage:
  node migrate-installer.js [command] [options]

Commands:
  migrate, up          Run pending migrations (default)
  rollback, down [n]   Rollback last n migrations (default: 1)
  status              Show migration status
  help                Show this help message

Options:
  --dry-run           Show what would be migrated without executing

Environment Variables:
  POSTGRES_HOST       Database host (default: localhost)
  POSTGRES_PORT       Database port (default: 5432)
  POSTGRES_DB         Database name (default: sso_hub)
  POSTGRES_USER       Database user (default: sso_user)
  POSTGRES_PASSWORD   Database password (default: sso_password)
  POSTGRES_SSL        Enable SSL (default: false)

Examples:
  node migrate-installer.js                    # Run all pending migrations
  node migrate-installer.js --dry-run          # Show pending migrations
  node migrate-installer.js status             # Show migration status
  node migrate-installer.js rollback 2         # Rollback last 2 migrations
        `);
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Use "node migrate-installer.js help" for usage information');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Check if pg module is available
try {
  require('pg');
} catch (error) {
  console.error('❌ PostgreSQL client not found. Please install it:');
  console.error('   npm install pg');
  process.exit(1);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = MigrationInstaller;