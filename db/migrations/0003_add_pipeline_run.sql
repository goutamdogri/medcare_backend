-- =============================================================
-- 003_add_pipeline_run.sql — [STATE] ML sidecar run tracking
--
-- Added after the baseline (pipeline run tracking feature). Persists the
-- status of each ML sidecar execution (daily / retrain). Written by the ML
-- sidecar; polled by the backend via GET /run/{run_id}/status. Kept in the
-- DB (not memory) so a sidecar restart does not lose run history.
-- Runs exactly once, in sequence, tracked in schema_migrations.
-- =============================================================
CREATE TABLE IF NOT EXISTS pipeline_run (
    run_id             VARCHAR(20)  PRIMARY KEY,
    run_type           VARCHAR(20)  NOT NULL DEFAULT 'daily',
    status             VARCHAR(20)  NOT NULL DEFAULT 'running',
    triggered_by       VARCHAR(50)  NOT NULL DEFAULT 'api',
    as_of              DATE,
    steps_completed    TEXT,
    error              TEXT,
    started_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at        TIMESTAMP,
    duration_seconds   DECIMAL(10,1)
);

COMMENT ON TABLE pipeline_run IS 'Persistent status of ML sidecar runs (daily/retrain) — survives sidecar restarts';
COMMENT ON COLUMN pipeline_run.status IS 'running | completed | failed';
COMMENT ON COLUMN pipeline_run.steps_completed IS 'Comma-delimited list of completed chain steps';

CREATE INDEX IF NOT EXISTS pipeline_run_idx_status ON pipeline_run (status);
CREATE INDEX IF NOT EXISTS pipeline_run_idx_started_at ON pipeline_run (started_at DESC);
