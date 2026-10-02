-- AlimenCal – Referenzschema: verbindliche Einstellungen, Overrides,
-- Import-Snapshots (optional, falls eine Persistenz-Schicht eingeführt wird).
-- Kernidee: Base-Werte sind nach beidseitiger Bestätigung physisch
-- unveränderlich. Erzwungen per Trigger (Alternative: Row-Level-Security).

CREATE TABLE calc_settings (
    id UUID PRIMARY KEY,
    scope TEXT NOT NULL,
    key TEXT NOT NULL,
    value_base JSONB NOT NULL,
    unit TEXT,
    version INT NOT NULL DEFAULT 1,
    locked_by_party_a TIMESTAMPTZ,
    locked_by_party_b TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (scope, key, version)
);

CREATE TABLE calc_setting_overrides (
    id UUID PRIMARY KEY,
    setting_id UUID NOT NULL REFERENCES calc_settings (id),
    scenario_id TEXT NOT NULL,
    value_override JSONB NOT NULL,
    reason TEXT,
    created_by_party TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (setting_id, scenario_id)
);

CREATE TABLE import_snapshots (
    id UUID PRIMARY KEY,
    source TEXT NOT NULL,
    payload JSONB NOT NULL,
    checksum TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'committed'
    imported_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1,
    supersedes UUID REFERENCES import_snapshots (id)
);

CREATE TABLE calc_setting_audit (
    id BIGSERIAL PRIMARY KEY,
    setting_id UUID NOT NULL,
    version INT NOT NULL,
    actor_party TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutability: verbindlich festgelegte Einstellungen dürfen nicht mutiert werden.
CREATE OR REPLACE FUNCTION lock_calc_settings() RETURNS trigger AS $$
BEGIN
    IF OLD.locked_by_party_a IS NOT NULL AND OLD.locked_by_party_b IS NOT NULL THEN
        RAISE EXCEPTION 'Einstellung % ist beidseitig verbindlich festgelegt (read-only)', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_settings_immutable
    BEFORE UPDATE OR DELETE ON calc_settings
    FOR EACH ROW EXECUTE FUNCTION lock_calc_settings();

-- Immutability: committete Import-Snapshots sind unveränderlich.
CREATE OR REPLACE FUNCTION lock_import_snapshots() RETURNS trigger AS $$
BEGIN
    IF OLD.status = 'committed' THEN
        RAISE EXCEPTION 'Import-Snapshot % ist committet und unveränderlich (read-only)', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_import_snapshots_immutable
    BEFORE UPDATE OR DELETE ON import_snapshots
    FOR EACH ROW EXECUTE FUNCTION lock_import_snapshots();
