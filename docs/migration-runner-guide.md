# Supabase Migration Runner Guide

This guide covers the comprehensive database migration runner system implemented for the GSR Operations application.

## Overview

The migration runner provides a complete solution for managing Supabase database migrations, seeding, and deployment operations. It includes:

- **Migration execution** with tracking and rollback capabilities
- **Database seeding** for development and production environments
- **Comprehensive management** through a unified interface
- **Error handling** and recovery procedures
- **Environment-specific** configurations

## Scripts Overview

### 1. Migration Runner (`scripts/migrate-supabase.js`)

Handles database schema migrations with full tracking and rollback support.

**Features:**
- Tracks executed migrations in `_migrations` table
- Supports forward migrations and rollbacks
- Calculates checksums for migration integrity
- Provides detailed status reporting
- Handles SQL statement splitting and execution

**Commands:**
```bash
# Run pending migrations
node scripts/migrate-supabase.js up
node scripts/migrate-supabase.js migrate

# Rollback last migration
node scripts/migrate-supabase.js rollback

# Reset database (rollback all migrations)
node scripts/migrate-supabase.js reset

# Show migration status
node scripts/migrate-supabase.js status

# Show help
node scripts/migrate-supabase.js help
```

### 2. Database Seeder (`scripts/seed-supabase.js`)

Manages database seeding for different environments.

**Features:**
- Basic data seeding (suppliers, materials, customers, pricing)
- Development data seeding (orders, batches, interactions)
- Data clearing for testing
- Conflict avoidance with upsert operations
- Comprehensive error handling

**Commands:**
```bash
# Seed basic data only
node scripts/seed-supabase.js basic

# Seed development data
node scripts/seed-supabase.js dev

# Seed all data (basic + development)
node scripts/seed-supabase.js all

# Clear all seeded data
node scripts/seed-supabase.js clear

# Show help
node scripts/seed-supabase.js help
```

### 3. Database Manager (`scripts/supabase-manager.js`)

Unified interface for all database operations.

**Features:**
- Complete database setup workflows
- Environment-specific configurations
- Orchestrates multiple scripts
- Provides common operation shortcuts
- Comprehensive error handling

**Commands:**
```bash
# Complete database setup
node scripts/supabase-manager.js setup

# Reset database completely
node scripts/supabase-manager.js reset

# Update database (migrations + refresh data)
node scripts/supabase-manager.js update

# Show database status
node scripts/supabase-manager.js status

# Setup development environment
node scripts/supabase-manager.js dev

# Setup production environment
node scripts/supabase-manager.js prod

# Direct script access
node scripts/supabase-manager.js migrate <command>
node scripts/supabase-manager.js seed <command>
node scripts/supabase-manager.js verify
```

### 4. Health Check (`scripts/supabase-health-check.js`)

Comprehensive database health monitoring and performance analysis.

**Features:**
- Database connectivity and response time monitoring
- Table health and data integrity checks
- Database views performance testing
- RLS policies effectiveness verification
- Migration consistency validation
- Overall health scoring system

**Health Checks:**
- **Connectivity**: Tests database connection and response times
- **Table Health**: Verifies all critical tables are accessible with row counts
- **Views Performance**: Tests database views with performance metrics
- **RLS Security**: Validates Row Level Security policies are working
- **Migration Consistency**: Ensures all expected migrations are executed

**Commands:**
```bash
# Run comprehensive health check
node scripts/supabase-health-check.js

# Health check returns exit codes:
# 0 - Excellent/Good health (90%+ score)
# 1 - Fair health (50-89% score) 
# 2 - Poor health (<50% score)
# 3 - Health check failed to run
```

## NPM Scripts

The following npm scripts are available for convenient database management:

```bash
# Database setup and management
npm run db:setup    # Complete database setup
npm run db:reset    # Reset database completely
npm run db:update   # Update database
npm run db:status   # Show database status

# Environment-specific setup
npm run db:dev      # Setup development environment
npm run db:prod     # Setup production environment

# Direct script access
npm run db:migrate  # Run migration commands
npm run db:seed     # Run seeding commands
npm run db:verify   # Run verification script
npm run db:health   # Run comprehensive health check
```

## Environment Variables

The migration runner requires the following environment variables:

### Required Variables

```bash
# Supabase project URL (either format works)
SUPABASE_URL=https://your-project.supabase.co
# OR
VITE_SUPABASE_URL=https://your-project.supabase.co

# Service role key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional Variables

```bash
# Anonymous key (for client operations)
VITE_SUPABASE_ANON_KEY=your-anon-key

# Environment identifier
VITE_APP_ENV=development|staging|production
```

## Migration File Structure

### Migration Files

Migration files are stored in `database/supabase/migrations/` with the naming convention:
```
YYYYMMDDHHMMSS_description.sql
```

Example:
```
20250101000001_initial_schema.sql
20250101000002_rls_policies.sql
20250101000003_seed_data.sql
```

### Rollback Files

Rollback files follow the naming convention:
```
rollback_YYYYMMDDHHMMSS_description.sql
```

Example:
```
rollback_20250101000001_initial_schema.sql
rollback_20250101000002_rls_policies.sql
```

## Usage Examples

### Initial Setup

1. **Set environment variables:**
   ```bash
   export VITE_SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

2. **Setup development environment:**
   ```bash
   npm run db:dev
   ```

### Development Workflow

1. **Check migration status:**
   ```bash
   npm run db:status
   ```

2. **Run pending migrations:**
   ```bash
   npm run db:migrate up
   ```

3. **Seed development data:**
   ```bash
   npm run db:seed dev
   ```

4. **Reset and start fresh:**
   ```bash
   npm run db:reset
   npm run db:setup
   ```

### Production Deployment

1. **Setup production environment:**
   ```bash
   npm run db:prod
   ```

2. **Update existing production database:**
   ```bash
   npm run db:update
   ```

### Rollback Operations

1. **Rollback last migration:**
   ```bash
   npm run db:migrate rollback
   ```

2. **Reset entire database:**
   ```bash
   npm run db:reset
   ```

## Error Handling

### Common Issues and Solutions

1. **Missing Environment Variables**
   ```
   ❌ Missing required environment variables
   ```
   **Solution:** Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

2. **Migration Conflicts**
   ```
   ❌ SQL Error: relation already exists
   ```
   **Solution:** Check migration status and resolve conflicts manually

3. **Connection Issues**
   ```
   ❌ Failed to connect to Supabase
   ```
   **Solution:** Verify URL and keys, check network connectivity

4. **Permission Issues**
   ```
   ❌ insufficient_privilege
   ```
   **Solution:** Ensure service role key has proper permissions

### Recovery Procedures

1. **Failed Migration Recovery:**
   ```bash
   # Check what went wrong
   npm run db:status
   
   # Rollback if needed
   npm run db:migrate rollback
   
   # Fix migration file and retry
   npm run db:migrate up
   ```

2. **Corrupted Data Recovery:**
   ```bash
   # Clear problematic data
   npm run db:seed clear
   
   # Re-seed clean data
   npm run db:seed all
   ```

## Testing

### Test Migration Runner

Run the comprehensive test suite:
```bash
node scripts/test-migration-runner.js
```

This validates:
- Help command functionality
- Environment variable validation
- Argument parsing
- File structure integrity
- Package.json script configuration

### Manual Testing

1. **Test without environment variables:**
   ```bash
   node scripts/migrate-supabase.js help
   ```

2. **Test with invalid commands:**
   ```bash
   node scripts/migrate-supabase.js invalid-command
   ```

3. **Test environment validation:**
   ```bash
   unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
   node scripts/migrate-supabase.js status
   ```

## Best Practices

### Migration Development

1. **Always create rollback files** for each migration
2. **Test migrations locally** before deploying
3. **Use descriptive migration names** with timestamps
4. **Keep migrations atomic** - one logical change per file
5. **Backup production data** before major migrations

### Environment Management

1. **Use separate Supabase projects** for dev/staging/prod
2. **Never use production keys** in development
3. **Validate environment variables** before operations
4. **Document environment-specific configurations**

### Deployment Workflow

1. **Development:**
   ```bash
   npm run db:dev
   ```

2. **Staging:**
   ```bash
   npm run db:setup
   ```

3. **Production:**
   ```bash
   npm run db:prod
   ```

## Troubleshooting

### Debug Mode

Enable verbose logging by setting:
```bash
export DEBUG=supabase:*
```

### Common Commands for Debugging

```bash
# Check migration table contents
npm run db:verify

# Show detailed migration status
npm run db:migrate status

# Test connection
node -e "console.log(process.env.SUPABASE_URL)"
```

### Log Analysis

Migration logs include:
- ✅ Success indicators
- ❌ Error messages with context
- ⚠️ Warning messages
- 📊 Status information
- 🎉 Completion confirmations

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Database Migration
on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run db:migrate up
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Vercel Deployment

Add to `vercel.json`:
```json
{
  "build": {
    "env": {
      "SUPABASE_URL": "@supabase-url",
      "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key"
    }
  },
  "functions": {
    "scripts/migrate-supabase.js": {
      "runtime": "nodejs18.x"
    }
  }
}
```

## Security Considerations

1. **Service Role Key Protection:**
   - Never commit service keys to version control
   - Use environment variables or secret management
   - Rotate keys regularly

2. **Migration Security:**
   - Review all SQL before execution
   - Test rollback procedures
   - Validate data integrity after migrations

3. **Access Control:**
   - Limit service role permissions where possible
   - Use separate keys for different environments
   - Monitor database access logs

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Review migration logs
   - Check database performance
   - Validate backup procedures

2. **Monthly:**
   - Update dependencies
   - Review and clean old migration files
   - Test disaster recovery procedures

3. **Quarterly:**
   - Rotate service keys
   - Review security configurations
   - Update documentation

### Getting Help

1. **Check logs** for detailed error messages
2. **Run test suite** to validate setup
3. **Review documentation** for common solutions
4. **Check Supabase status** for service issues

## Conclusion

The migration runner provides a robust, production-ready solution for managing Supabase database operations. It includes comprehensive error handling, rollback capabilities, and environment-specific configurations to support the full development lifecycle.

For additional support or questions, refer to the test suite output and error messages, which provide detailed guidance for troubleshooting and resolution.