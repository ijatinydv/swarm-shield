import json
from datetime import datetime
from typing import Optional, List
from pathlib import Path
import sqlite3
from contextlib import contextmanager
from .models import Incident, Credential, Agent, PatchPlan


class Storage:
    def __init__(self, db_path: str = "data.db"):
        self.db_path = db_path
        self._init_db()
    
    @contextmanager
    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()
    
    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS credentials (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    incident_id TEXT,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agents (
                    id TEXT PRIMARY KEY,
                    did TEXT UNIQUE NOT NULL,
                    data TEXT NOT NULL,
                    last_seen TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS patch_plans (
                    id TEXT PRIMARY KEY,
                    incident_id TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    from_did TEXT NOT NULL,
                    to_did TEXT NOT NULL,
                    message_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    processed INTEGER DEFAULT 0
                )
            """)
    
    def save_incident(self, incident: Incident) -> Incident:
        with self._get_conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO incidents (id, data, created_at) VALUES (?, ?, ?)",
                (incident.id, incident.json(), incident.created_at.isoformat())
            )
        return incident
    
    def get_incident(self, incident_id: str) -> Optional[Incident]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT data FROM incidents WHERE id = ?", (incident_id,)
            ).fetchone()
            if row:
                return Incident.parse_raw(row["data"])
        return None
    
    def list_incidents(self, limit: int = 100) -> List[Incident]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT data FROM incidents ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
            return [Incident.parse_raw(row["data"]) for row in rows]
    
    def save_credential(self, credential: Credential, incident_id: Optional[str] = None) -> Credential:
        with self._get_conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO credentials (id, type, incident_id, data, created_at) VALUES (?, ?, ?, ?, ?)",
                (credential.id, credential.type, incident_id, credential.json(), credential.issuance_date.isoformat())
            )
        return credential
    
    def get_credential(self, credential_id: str) -> Optional[Credential]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT data FROM credentials WHERE id = ?", (credential_id,)
            ).fetchone()
            if row:
                return Credential.parse_raw(row["data"])
        return None
    
    def list_credentials(self, incident_id: Optional[str] = None, cred_type: Optional[str] = None) -> List[Credential]:
        with self._get_conn() as conn:
            query = "SELECT data FROM credentials WHERE 1=1"
            params = []
            if incident_id:
                query += " AND incident_id = ?"
                params.append(incident_id)
            if cred_type:
                query += " AND type = ?"
                params.append(cred_type)
            query += " ORDER BY created_at DESC"
            rows = conn.execute(query, params).fetchall()
            return [Credential.parse_raw(row["data"]) for row in rows]
    
    def get_safe_attestations(self, package_name: str, version: str) -> List[Credential]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT data FROM credentials WHERE type = ?",
                ("SafeToUseAttestation",)
            ).fetchall()
            results = []
            for row in rows:
                cred = Credential.parse_raw(row["data"])
                subj = cred.subject
                if subj.get("package_name") == package_name and subj.get("version") == version:
                    if cred.expiration_date:
                        if isinstance(cred.expiration_date, str):
                            exp = datetime.fromisoformat(cred.expiration_date)
                        else:
                            exp = cred.expiration_date
                        if exp > datetime.utcnow():
                            results.append(cred)
                    else:
                        results.append(cred)
            return results
    
    def save_agent(self, agent: Agent) -> Agent:
        with self._get_conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO agents (id, did, data, last_seen) VALUES (?, ?, ?, ?)",
                (agent.id, agent.did, agent.json(), agent.last_seen.isoformat())
            )
        return agent
    
    def get_agent_by_did(self, did: str) -> Optional[Agent]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT data FROM agents WHERE did = ?", (did,)
            ).fetchone()
            if row:
                return Agent.parse_raw(row["data"])
        return None
    
    def list_agents(self) -> List[Agent]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT data FROM agents ORDER BY last_seen DESC"
            ).fetchall()
            return [Agent.parse_raw(row["data"]) for row in rows]
    
    def save_patch_plan(self, plan: PatchPlan) -> PatchPlan:
        with self._get_conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO patch_plans (id, incident_id, data, created_at) VALUES (?, ?, ?, ?)",
                (plan.id, plan.incident_id, plan.json(), plan.created_at.isoformat())
            )
        return plan
    
    def get_patch_plan(self, plan_id: str) -> Optional[PatchPlan]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT data FROM patch_plans WHERE id = ?", (plan_id,)
            ).fetchone()
            if row:
                return PatchPlan.parse_raw(row["data"])
        return None
    
    def get_patch_plans_for_incident(self, incident_id: str) -> List[PatchPlan]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT data FROM patch_plans WHERE incident_id = ?", (incident_id,)
            ).fetchall()
            return [PatchPlan.parse_raw(row["data"]) for row in rows]


storage = Storage()
