-- =============================================================
-- 0002_add_users.sql — [AUTH] application accounts
--
-- Added after the baseline (authentication feature). Runs exactly once,
-- in sequence, tracked in schema_migrations.
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(320) NOT NULL,
    password_hash   VARCHAR(100) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'viewer',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email)
);

COMMENT ON TABLE users IS 'Application accounts for email + password authentication';
COMMENT ON COLUMN users.role IS 'admin | viewer | analyst';

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
