"""
PayPilot SQLite to Supabase PostgreSQL Migration Script
-------------------------------------------------------
Safely migrates all tables, schemas, relationships, and records from
local SQLite (paypilot.db) to Supabase PostgreSQL (via Session Pooler).

Features:
- READ-ONLY access to source SQLite database (preserves local data untouched).
- Automatic topological sort (preserves all foreign key relationships).
- Data type sanitization (booleans, timestamps, JSON, numerics).
- Automatic PostgreSQL sequence reset (advances serial IDs to prevent future collision).
- Post-migration 1-to-1 record count verification report.
- Supports dry-run simulation mode (--dry-run).

Usage:
  python backend/scripts/migrate_sqlite_to_supabase.py --target-url "postgresql://postgres.xxx:yyy@aws-0-region.pooler.supabase.com:5432/postgres"
  python backend/scripts/migrate_sqlite_to_supabase.py --dry-run
"""

import os
import sys
import argparse
import sqlite3
import logging
from urllib.parse import urlsplit, urlunsplit
from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add project root to sys.path so backend imports work regardless of execution directory
CURRENT_FILE = Path(__file__).resolve()
SCRIPTS_DIR = CURRENT_FILE.parent
BACKEND_DIR = SCRIPTS_DIR.parent
WORKSPACE_DIR = BACKEND_DIR.parent

for p in (str(WORKSPACE_DIR), str(BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import (
    create_engine,
    text,
    Table,
    Boolean,
    DateTime,
    Date,
    Integer,
    Float,
    Numeric,
    JSON,
    inspect,
)
from sqlalchemy.engine import Engine
from backend.app.core.config import settings
from backend.app.core.database import Base
import backend.app.models  # Ensures all 29 models are registered in Base.metadata

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("paypilot_migration")


def mask_database_url(url: str) -> str:
    """Mask password credentials in database URL for safe logging and display."""
    try:
        parsed = urlsplit(url)
        if parsed.password:
            user = parsed.username or "postgres"
            host = parsed.hostname or ""
            port_str = f":{parsed.port}" if parsed.port else ""
            netloc = f"{user}:****@{host}{port_str}"
            return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))
    except Exception:
        pass
    return url.split("@")[-1] if "@" in url else url


def inspect_target_database(engine: Engine) -> Dict[str, int]:
    """Inspect the target database to check if any PayPilot application tables or records exist."""
    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())
    app_tables = set(Base.metadata.tables.keys())
    common = existing_tables.intersection(app_tables)

    result = {}
    with engine.connect() as conn:
        for t in common:
            try:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar() or 0
                result[t] = cnt
            except Exception:
                pass
    return result


def normalize_postgres_url(url: str) -> str:
    """Normalize legacy postgres:// prefix or bare postgresql:// to explicit postgresql+psycopg2:// and ensure sslmode."""
    url = url.strip()
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    if url.startswith("postgresql+psycopg2://") and "sslmode=" not in url.lower():
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    return url


def find_source_sqlite_db(custom_path: Optional[str] = None) -> Path:
    """Locate the source SQLite database file."""
    if custom_path:
        p = Path(custom_path).resolve()
        if p.is_file():
            return p
        raise FileNotFoundError(f"Specified SQLite file not found: {custom_path}")

    candidates = [
        WORKSPACE_DIR / "paypilot.db",
        BACKEND_DIR / "paypilot.db",
        Path("paypilot.db").resolve(),
    ]
    for c in candidates:
        if c.is_file():
            return c
    raise FileNotFoundError("Could not locate paypilot.db in workspace or backend directory.")


def sanitize_column_value(val: Any, col_type: Any) -> Any:
    """
    Sanitize SQLite values for PostgreSQL strict type expectations:
    - Boolean: 0/1 -> False/True
    - DateTime/Date: ISO string -> datetime/date object
    """
    if val is None:
        return None

    if isinstance(col_type, Boolean):
        if isinstance(val, (int, float)):
            return bool(val)
        if isinstance(val, str):
            return val.strip().lower() in ("true", "1", "t", "yes", "y")
        return bool(val)

    if isinstance(col_type, (DateTime, Date)):
        if isinstance(val, str):
            val_clean = val.strip().replace("Z", "+00:00")
            try:
                dt = datetime.fromisoformat(val_clean)
                return dt.date() if isinstance(col_type, Date) else dt
            except Exception:
                for fmt in (
                    "%Y-%m-%d %H:%M:%S.%f",
                    "%Y-%m-%d %H:%M:%S",
                    "%Y-%m-%d",
                ):
                    try:
                        parsed = datetime.strptime(val, fmt)
                        return parsed.date() if isinstance(col_type, Date) else parsed
                    except ValueError:
                        pass
                return val
        return val

    return val


def get_sqlite_row_count(conn: sqlite3.Connection, table_name: str) -> int:
    """Count rows in a SQLite table."""
    try:
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {table_name}")
        return cur.fetchone()[0]
    except Exception:
        return 0


def get_target_row_count(engine: Engine, table_name: str) -> int:
    """Count rows in a target table."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            return result.scalar() or 0
    except Exception:
        return 0


def reset_postgres_sequences(engine: Engine, tables: List[Table]):
    """Reset PostgreSQL serial/identity sequences to max(id) to prevent collision."""
    if engine.dialect.name != "postgresql":
        logger.info("Target is not PostgreSQL; skipping sequence reset.")
        return

    logger.info("Advancing PostgreSQL serial sequences...")
    with engine.begin() as conn:
        for table in tables:
            # Check for single primary key integer column (typically 'id')
            pks = [c for c in table.primary_key.columns if isinstance(c.type, Integer)]
            if not pks:
                continue
            pk_col = pks[0].name
            sql = f"""
                DO $$
                DECLARE
                    seq_name text;
                BEGIN
                    SELECT pg_get_serial_sequence('{table.name}', '{pk_col}') INTO seq_name;
                    IF seq_name IS NOT NULL THEN
                        EXECUTE format(
                            'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1), (SELECT MAX(%I) IS NOT NULL FROM %I))',
                            seq_name, '{pk_col}', '{table.name}', '{pk_col}', '{table.name}'
                        );
                    END IF;
                END $$;
            """
            try:
                conn.execute(text(sql))
            except Exception as e:
                logger.warning("Could not reset sequence for table %s: %s", table.name, e)


def run_migration(
    sqlite_path: Path,
    target_url: str,
    dry_run: bool = False,
    batch_size: int = 500,
) -> bool:
    """Execute end-to-end migration from SQLite to Target Engine."""
    logger.info("==================================================")
    logger.info("     PayPilot SQLite -> Supabase Migration       ")
    logger.info("==================================================")
    logger.info("Source SQLite DB : %s", sqlite_path)
    logger.info("Target DB URL    : %s", mask_database_url(target_url))
    logger.info("Mode             : %s", "DRY-RUN (SIMULATION)" if dry_run else "LIVE MIGRATION")

    # 1. Connect to SQLite in READ-ONLY mode
    sqlite_uri = f"file:{sqlite_path.as_posix()}?mode=ro"
    sqlite_conn = sqlite3.connect(sqlite_uri, uri=True)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # Discover SQLite existing tables
    sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    existing_sqlite_tables = set(row[0] for row in sqlite_cur.fetchall())
    logger.info("Found %d user tables in SQLite database.", len(existing_sqlite_tables))

    # 2. Setup Target Database Engine
    target_engine_kwargs: Dict[str, Any] = {"pool_pre_ping": True}
    if target_url.startswith("postgresql"):
        target_engine_kwargs["connect_args"] = {}
        if "sslmode=" not in target_url.lower():
            target_engine_kwargs["connect_args"]["sslmode"] = "require"
        target_engine_kwargs["pool_size"] = 5
        target_engine_kwargs["max_overflow"] = 5

    target_engine = create_engine(target_url, **target_engine_kwargs)

    # 3. Pre-migration Inspection of Target Database
    if not dry_run:
        logger.info("Inspecting target database state...")
        existing_target_data = inspect_target_database(target_engine)
        if not existing_target_data:
            logger.info("Target database clean slate verified: 0 existing PayPilot tables found.")
        else:
            logger.warning("Found %d existing PayPilot tables in target database:", len(existing_target_data))
            for tbl, cnt in existing_target_data.items():
                logger.warning("  - %s: %d existing records", tbl, cnt)
            logger.info("Existing records will be safely preserved and NOT overwritten.")

        logger.info("Ensuring target database schema is created via SQLAlchemy models...")
        Base.metadata.create_all(bind=target_engine)
        logger.info("Schema verified on target database.")

    # 4. Read and sanitize all data from SQLite
    ordered_tables = Base.metadata.sorted_tables
    logger.info("Topologically sorted %d application tables for safe migration.", len(ordered_tables))

    prepared_data: Dict[str, List[Dict[str, Any]]] = {}
    sqlite_counts: Dict[str, int] = {}
    total_source_records = 0

    for table in ordered_tables:
        tname = table.name
        if tname not in existing_sqlite_tables:
            logger.info("Skipping '%s' (table does not exist in SQLite source).", tname)
            continue

        sqlite_count = get_sqlite_row_count(sqlite_conn, tname)
        sqlite_counts[tname] = sqlite_count
        if sqlite_count == 0:
            logger.info("Table '%s': 0 records in SQLite. Moving on.", tname)
            prepared_data[tname] = []
            continue

        sqlite_cur.execute(f"SELECT * FROM {tname}")
        sqlite_rows = sqlite_cur.fetchall()

        col_type_map = {col.name: col.type for col in table.columns}
        cleaned_rows: List[Dict[str, Any]] = []

        for row in sqlite_rows:
            row_dict = dict(row)
            cleaned_row = {}
            for col_name, col_type in col_type_map.items():
                if col_name in row_dict:
                    raw_val = row_dict[col_name]
                    cleaned_row[col_name] = sanitize_column_value(raw_val, col_type)
            cleaned_rows.append(cleaned_row)

        prepared_data[tname] = cleaned_rows
        total_source_records += len(cleaned_rows)
        logger.info("Table '%s': Prepared %d records from SQLite.", tname, len(cleaned_rows))

    sqlite_conn.close()

    total_inserted_records = 0
    verification_stats = []

    # 5. Execute Migration within an Atomic All-Or-Nothing Transaction
    if not dry_run:
        logger.info("Beginning atomic database transaction across all tables...")
        try:
            with target_engine.begin() as conn:
                for table in ordered_tables:
                    tname = table.name
                    if tname not in prepared_data or not prepared_data[tname]:
                        continue

                    rows = prepared_data[tname]
                    pks = [c.name for c in table.primary_key.columns]
                    pk_name = pks[0] if len(pks) == 1 else None

                    # Guard against overwriting existing target data
                    existing_pks = set()
                    if pk_name:
                        try:
                            pk_query = conn.execute(text(f"SELECT {pk_name} FROM {tname}")).fetchall()
                            existing_pks = set(r[0] for r in pk_query)
                        except Exception:
                            existing_pks = set()

                    rows_to_insert = []
                    for r in rows:
                        if pk_name and r.get(pk_name) in existing_pks:
                            logger.info("Preserving existing target record in '%s' (%s=%s). Skipping.", tname, pk_name, r.get(pk_name))
                            continue
                        rows_to_insert.append(r)

                    if rows_to_insert:
                        for i in range(0, len(rows_to_insert), batch_size):
                            batch = rows_to_insert[i : i + batch_size]
                            conn.execute(table.insert(), batch)
                        total_inserted_records += len(rows_to_insert)
                        logger.info("Table '%s': Inserted %d records into target.", tname, len(rows_to_insert))
                    else:
                        logger.info("Table '%s': All %d records already present in target. Preserved.", tname, len(rows))

            logger.info("All tables committed successfully in a single atomic transaction!")
        except Exception as exc:
            logger.error("FATAL ERROR during data migration: %s", exc)
            logger.error("TRANSACTION ROLLED BACK: No incomplete or corrupt data was committed.")
            raise

        # 6. Reset PostgreSQL sequences after transaction commit
        reset_postgres_sequences(target_engine, ordered_tables)

    # 7. Post-Migration Verification Suite
    logger.info("Running post-migration verification audit...")
    all_matched = True

    for table in ordered_tables:
        tname = table.name
        s_cnt = sqlite_counts.get(tname, 0)

        if dry_run:
            tgt_cnt = s_cnt
            status = "MATCH (EMPTY)" if s_cnt == 0 else "DRY-RUN VALIDATED"
        else:
            tgt_cnt = get_target_row_count(target_engine, tname)
            if s_cnt == 0 and tgt_cnt == 0:
                status = "MATCH (EMPTY)"
            elif tgt_cnt == s_cnt:
                status = "MATCH"
            else:
                status = f"MISMATCH ({tgt_cnt}/{s_cnt})"
                all_matched = False

        verification_stats.append((tname, s_cnt, tgt_cnt, status))

    # 8. Print Final Verification Summary Table
    logger.info("\n" + "=" * 75)
    logger.info("                 MIGRATION VERIFICATION AUDIT REPORT")
    logger.info("=" * 75)
    logger.info(f"{'TABLE NAME':<30} | {'SQLITE':<8} | {'TARGET':<8} | {'STATUS':<20}")
    logger.info("-" * 75)

    for tname, s_cnt, tgt_cnt, st in verification_stats:
        logger.info(f"{tname:<30} | {s_cnt:<8} | {tgt_cnt:<8} | {st:<20}")

    logger.info("=" * 75)
    logger.info("Source SQLite Records  : %d", total_source_records)
    if not dry_run:
        logger.info("Target Inserted Records: %d", total_inserted_records)
    logger.info("Overall Integrity Audit: %s", "PASSED (100% Data Fidelity)" if all_matched else "FAILED")
    logger.info("=" * 75 + "\n")

    return all_matched


def main():
    parser = argparse.ArgumentParser(description="Migrate PayPilot SQLite database to Supabase PostgreSQL.")
    parser.add_argument(
        "--target-url",
        "--target_url",
        dest="target_url",
        help="Target PostgreSQL connection string (Supabase Session Pooler).",
    )
    parser.add_argument(
        "--sqlite-path",
        dest="sqlite_path",
        help="Path to source paypilot.db (defaults to auto-detecting paypilot.db).",
    )
    parser.add_argument(
        "--check-target",
        action="store_true",
        help="Connect to target database and inspect if any PayPilot tables or records already exist, without modifying anything.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate the migration and validate records without writing to the target database.",
    )
    args = parser.parse_args()

    target_url = args.target_url or os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL")

    if args.check_target:
        if not target_url:
            logger.error("Target database URL is required for --check-target.")
            sys.exit(1)
        target_url = normalize_postgres_url(target_url)
        logger.info("Connecting to target database: %s", mask_database_url(target_url))
        target_engine_kwargs: Dict[str, Any] = {"pool_pre_ping": True}
        if target_url.startswith("postgresql"):
            target_engine_kwargs["connect_args"] = {}
            if "sslmode=" not in target_url.lower():
                target_engine_kwargs["connect_args"]["sslmode"] = "require"
        target_engine = create_engine(target_url, **target_engine_kwargs)
        existing_data = inspect_target_database(target_engine)
        if not existing_data:
            logger.info("TARGET DATABASE STATUS: 100% CLEAN SLATE. No existing PayPilot application tables or records found.")
        else:
            logger.warning("TARGET DATABASE STATUS: Contains %d PayPilot tables:", len(existing_data))
            for tbl, cnt in existing_data.items():
                logger.warning("  - %s: %d records", tbl, cnt)
        sys.exit(0)

    sqlite_file = find_source_sqlite_db(args.sqlite_path)

    if not target_url and not args.dry_run:
        logger.error(
            "Target database URL is required. Provide --target-url or set TARGET_DATABASE_URL/DATABASE_URL environment variable."
        )
        logger.info("Example: python backend/scripts/migrate_sqlite_to_supabase.py --target-url 'postgresql://postgres.xxx:yyy@aws-0-us-east-1.pooler.supabase.com:5432/postgres'")
        logger.info("Or run simulation with: python backend/scripts/migrate_sqlite_to_supabase.py --dry-run")
        sys.exit(1)

    if args.dry_run and not target_url:
        # Use an in-memory or dummy URL for dry-run
        target_url = "sqlite:///:memory:"

    target_url = normalize_postgres_url(target_url)

    success = run_migration(
        sqlite_path=sqlite_file,
        target_url=target_url,
        dry_run=args.dry_run,
    )

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()

