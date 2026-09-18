-- Axiom Notebook — initial schema
-- Math-native document store. Math is stored as raw LaTeX + canonical MathJSON
-- + server-side canonical symbolic form. Never stored as rendered HTML only.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- documents
-- =========================================================================
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL DEFAULT 'Untitled',
    -- ProseMirror/Tiptap JSON document tree (UI-facing structure).
    doc_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Yjs persisted update blob for collaborative state (binary).
    y_doc_state     BYTEA,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_updated_at_idx
    ON documents (updated_at DESC);

-- =========================================================================
-- math_blocks  (one row per math node referenced by a document)
-- =========================================================================
CREATE TABLE IF NOT EXISTS math_blocks (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id              UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    display_mode             TEXT NOT NULL CHECK (display_mode IN ('inline','block','derivation')),
    raw_latex                TEXT NOT NULL,
    canonical_math_json      JSONB,                     -- MathJSON (client canonical)
    server_canonical_form    JSONB,                     -- SymPy srepr / structural form
    domain_tag               TEXT NOT NULL DEFAULT 'unknown',
    derivation_group_id      UUID,                      -- FK set below
    visualization_hint       JSONB,
    assumptions              JSONB NOT NULL DEFAULT '[]'::jsonb,
    parse_status             TEXT NOT NULL DEFAULT 'pending'
                              CHECK (parse_status IN ('pending','ok','partial','error')),
    parse_error              TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS math_blocks_document_idx ON math_blocks (document_id);
CREATE INDEX IF NOT EXISTS math_blocks_domain_idx   ON math_blocks (domain_tag);
CREATE INDEX IF NOT EXISTS math_blocks_canonical_gin
    ON math_blocks USING GIN (canonical_math_json jsonb_path_ops);

-- =========================================================================
-- derivation_groups  (an ordered sequence of math_blocks)
-- =========================================================================
CREATE TABLE IF NOT EXISTS derivation_groups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    title         TEXT,
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE math_blocks
    ADD CONSTRAINT math_blocks_derivation_group_fk
    FOREIGN KEY (derivation_group_id)
    REFERENCES derivation_groups(id)
    ON DELETE SET NULL;

-- =========================================================================
-- derivation_steps
-- =========================================================================
CREATE TABLE IF NOT EXISTS derivation_steps (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    derivation_group_id    UUID NOT NULL REFERENCES derivation_groups(id) ON DELETE CASCADE,
    order_index            INTEGER NOT NULL,
    math_block_id          UUID NOT NULL REFERENCES math_blocks(id) ON DELETE CASCADE,
    previous_step_id       UUID REFERENCES derivation_steps(id) ON DELETE SET NULL,
    change_set             JSONB NOT NULL DEFAULT '{}'::jsonb,
    operation_candidates   JSONB NOT NULL DEFAULT '[]'::jsonb,
    selected_operation     TEXT,
    confidence             REAL NOT NULL DEFAULT 0.0,
    visualization_state    JSONB,
    explanation_short      TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (derivation_group_id, order_index)
);

CREATE INDEX IF NOT EXISTS derivation_steps_group_idx
    ON derivation_steps (derivation_group_id, order_index);

-- =========================================================================
-- updated_at trigger
-- =========================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_set_updated_at ON documents;
CREATE TRIGGER documents_set_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS math_blocks_set_updated_at ON math_blocks;
CREATE TRIGGER math_blocks_set_updated_at
    BEFORE UPDATE ON math_blocks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

