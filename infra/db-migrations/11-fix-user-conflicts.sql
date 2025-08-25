-- Migration 11: Fix User Conflicts
-- Resolves duplicate user entries that cause constraint violations
-- Addresses "duplicate key value violates unique constraint" errors

-- Start transaction for safety
BEGIN;

-- Create temporary tables to identify conflicts
CREATE TEMP TABLE user_email_conflicts AS
SELECT 
    email,
    COUNT(*) as conflict_count,
    (ARRAY_AGG(id ORDER BY created_at ASC))[1] as keep_id,
    ARRAY_AGG(id ORDER BY created_at ASC) as all_ids
FROM users 
WHERE email IN (
    SELECT email 
    FROM users 
    GROUP BY email 
    HAVING COUNT(*) > 1
)
GROUP BY email;

CREATE TEMP TABLE user_keycloak_conflicts AS
SELECT 
    keycloak_sub,
    COUNT(*) as conflict_count,
    (ARRAY_AGG(id ORDER BY created_at ASC))[1] as keep_id,
    ARRAY_AGG(id ORDER BY created_at ASC) as all_ids
FROM users 
WHERE keycloak_sub IN (
    SELECT keycloak_sub 
    FROM users 
    GROUP BY keycloak_sub 
    HAVING COUNT(*) > 1
)
GROUP BY keycloak_sub;

-- Log conflicts found
DO $$
DECLARE
    email_conflicts INTEGER;
    keycloak_conflicts INTEGER;
BEGIN
    SELECT COUNT(*) INTO email_conflicts FROM user_email_conflicts;
    SELECT COUNT(*) INTO keycloak_conflicts FROM user_keycloak_conflicts;
    
    RAISE NOTICE 'Found % email conflicts and % keycloak_sub conflicts to resolve', 
        email_conflicts, keycloak_conflicts;
    
    IF email_conflicts = 0 AND keycloak_conflicts = 0 THEN
        RAISE NOTICE 'No user conflicts found - migration not needed';
    END IF;
END $$;

-- Only proceed if conflicts exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM user_email_conflicts) OR EXISTS (SELECT 1 FROM user_keycloak_conflicts) THEN
        
        -- Update references in related tables before deleting duplicates
        -- Handle email conflicts
        UPDATE user_api_keys 
        SET user_id = uc.keep_id
        FROM user_email_conflicts uc
        WHERE user_api_keys.user_id = ANY(uc.all_ids[2:array_length(uc.all_ids, 1)]);

        UPDATE user_group_memberships
        SET user_id = uc.keep_id
        FROM user_email_conflicts uc
        WHERE user_group_memberships.user_id = ANY(uc.all_ids[2:array_length(uc.all_ids, 1)]);

        UPDATE user_sessions
        SET user_id = uc.keep_id
        FROM user_email_conflicts uc
        WHERE user_sessions.user_id = ANY(uc.all_ids[2:array_length(uc.all_ids, 1)]);

        UPDATE seamless_sso_sessions
        SET user_id = uc.keep_id
        FROM user_email_conflicts uc
        WHERE seamless_sso_sessions.user_id = ANY(uc.all_ids[2:array_length(uc.all_ids, 1)]);

        -- Handle keycloak conflicts
        UPDATE user_api_keys 
        SET user_id = kc.keep_id
        FROM user_keycloak_conflicts kc
        WHERE user_api_keys.user_id = ANY(kc.all_ids[2:array_length(kc.all_ids, 1)]);

        UPDATE user_group_memberships
        SET user_id = kc.keep_id
        FROM user_keycloak_conflicts kc
        WHERE user_group_memberships.user_id = ANY(kc.all_ids[2:array_length(kc.all_ids, 1)]);

        UPDATE user_sessions
        SET user_id = kc.keep_id
        FROM user_keycloak_conflicts kc
        WHERE user_sessions.user_id = ANY(kc.all_ids[2:array_length(kc.all_ids, 1)]);

        UPDATE seamless_sso_sessions
        SET user_id = kc.keep_id
        FROM user_keycloak_conflicts kc
        WHERE seamless_sso_sessions.user_id = ANY(kc.all_ids[2:array_length(kc.all_ids, 1)]);

        -- Merge user data from duplicates into the record we're keeping
        UPDATE users 
        SET 
            first_name = COALESCE(users.first_name, dupes.first_name),
            last_name = COALESCE(users.last_name, dupes.last_name),
            display_name = COALESCE(users.display_name, dupes.display_name),
            avatar_url = COALESCE(users.avatar_url, dupes.avatar_url),
            department = COALESCE(users.department, dupes.department),
            job_title = COALESCE(users.job_title, dupes.job_title),
            manager_id = COALESCE(users.manager_id, dupes.manager_id),
            preferences = COALESCE(users.preferences, '{}') || COALESCE(dupes.preferences, '{}'),
            metadata = COALESCE(users.metadata, '{}') || COALESCE(dupes.metadata, '{}'),
            last_login_at = GREATEST(users.last_login_at, dupes.last_login_at),
            updated_at = NOW()
        FROM (
            SELECT DISTINCT ON (uc.keep_id)
                uc.keep_id,
                u.first_name, u.last_name, u.display_name, u.avatar_url,
                u.department, u.job_title, u.manager_id,
                u.preferences, u.metadata, u.last_login_at
            FROM user_email_conflicts uc
            CROSS JOIN LATERAL unnest(uc.all_ids[2:array_length(uc.all_ids, 1)]) AS duplicate_id
            JOIN users u ON u.id = duplicate_id
            ORDER BY uc.keep_id, u.updated_at DESC
        ) dupes
        WHERE users.id = dupes.keep_id;

        -- Delete duplicate user records
        DELETE FROM users 
        WHERE id IN (
            SELECT unnest(all_ids[2:array_length(all_ids, 1)])
            FROM user_email_conflicts
            UNION
            SELECT unnest(all_ids[2:array_length(all_ids, 1)])
            FROM user_keycloak_conflicts
        );

        RAISE NOTICE 'User conflicts resolved successfully';
    END IF;
END $$;

-- Verify no conflicts remain
DO $$
DECLARE
    email_conflicts INTEGER;
    keycloak_conflicts INTEGER;
BEGIN
    SELECT COUNT(*) INTO email_conflicts
    FROM (SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1) conflicts;
    
    SELECT COUNT(*) INTO keycloak_conflicts  
    FROM (SELECT keycloak_sub FROM users GROUP BY keycloak_sub HAVING COUNT(*) > 1) conflicts;
    
    IF email_conflicts > 0 OR keycloak_conflicts > 0 THEN
        RAISE EXCEPTION 'Still have % email and % keycloak_sub conflicts remaining', 
            email_conflicts, keycloak_conflicts;
    END IF;
    
    RAISE NOTICE 'All user conflicts resolved - database is clean';
END $$;

-- Record migration
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('11-fix-user-conflicts', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;