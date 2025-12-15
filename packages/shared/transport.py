import os
import json
import hashlib
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict
import threading
import logging

logger = logging.getLogger(__name__)


@dataclass
class TransportMessage:
    from_did: str
    to_did: str
    message_type: str
    payload: Dict[str, Any]
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    id: str = field(default_factory=lambda: hashlib.sha256(str(datetime.utcnow().timestamp()).encode()).hexdigest()[:16])


@dataclass
class AgentInfo:
    did: str
    name: str
    capabilities: List[str]
    endpoint: Optional[str] = None
    score: float = 1.0


class Transport(ABC):
    @abstractmethod
    def send(self, to_agent_did: str, message_type: str, payload: Dict[str, Any]) -> bool:
        pass
    
    @abstractmethod
    def read(self) -> List[TransportMessage]:
        pass
    
    @abstractmethod
    def search_agents_by_capabilities(self, capabilities: List[str], min_score: float = 0.5, top_k: int = 10) -> List[AgentInfo]:
        pass
    
    @abstractmethod
    def verify_agent_identity(self, agent_did: str) -> bool:
        pass
    
    @abstractmethod
    def register_agent(self, agent_info: AgentInfo) -> bool:
        pass
    
    @abstractmethod
    def get_own_did(self) -> str:
        pass


class SimulatorTransport(Transport):
    """In-memory message bus for offline demo mode."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, agent_did: str = None, agent_name: str = None, capabilities: List[str] = None):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._messages: Dict[str, List[TransportMessage]] = defaultdict(list)
                    instance._agents: Dict[str, AgentInfo] = {}
                    instance._initialized = False
                    cls._instance = instance
        return cls._instance
    
    def __init__(self, agent_did: str = None, agent_name: str = None, capabilities: List[str] = None):
        if agent_did and not hasattr(self, '_own_did'):
            self._own_did = agent_did
            self._own_name = agent_name or "unknown"
            self._own_capabilities = capabilities or []
            if agent_did:
                self.register_agent(AgentInfo(
                    did=agent_did,
                    name=self._own_name,
                    capabilities=self._own_capabilities
                ))
    
    def set_identity(self, agent_did: str, agent_name: str, capabilities: List[str]):
        self._own_did = agent_did
        self._own_name = agent_name
        self._own_capabilities = capabilities
        self.register_agent(AgentInfo(
            did=agent_did,
            name=agent_name,
            capabilities=capabilities
        ))
    
    def get_own_did(self) -> str:
        return getattr(self, '_own_did', 'did:simulator:unknown')
    
    def send(self, to_agent_did: str, message_type: str, payload: Dict[str, Any]) -> bool:
        msg = TransportMessage(
            from_did=self.get_own_did(),
            to_did=to_agent_did,
            message_type=message_type,
            payload=payload
        )
        with self._lock:
            self._messages[to_agent_did].append(msg)
        logger.info(f"[Simulator] Sent {message_type} from {self.get_own_did()} to {to_agent_did}")
        return True
    
    def broadcast(self, message_type: str, payload: Dict[str, Any], capabilities: List[str] = None) -> int:
        """Send to all agents (optionally filtered by capabilities)."""
        targets = self.search_agents_by_capabilities(capabilities or [], min_score=0.0)
        count = 0
        for agent in targets:
            if agent.did != self.get_own_did():
                self.send(agent.did, message_type, payload)
                count += 1
        return count
    
    def read(self) -> List[TransportMessage]:
        own_did = self.get_own_did()
        with self._lock:
            messages = self._messages.get(own_did, [])
            self._messages[own_did] = []
        return messages
    
    def search_agents_by_capabilities(self, capabilities: List[str], min_score: float = 0.5, top_k: int = 10) -> List[AgentInfo]:
        results = []
        with self._lock:
            for agent in self._agents.values():
                if not capabilities:
                    results.append(agent)
                    continue
                matches = sum(1 for cap in capabilities if cap in agent.capabilities)
                score = matches / len(capabilities) if capabilities else 1.0
                if score >= min_score:
                    agent_copy = AgentInfo(
                        did=agent.did,
                        name=agent.name,
                        capabilities=agent.capabilities,
                        endpoint=agent.endpoint,
                        score=score
                    )
                    results.append(agent_copy)
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]
    
    def verify_agent_identity(self, agent_did: str) -> bool:
        with self._lock:
            return agent_did in self._agents
    
    def register_agent(self, agent_info: AgentInfo) -> bool:
        with self._lock:
            self._agents[agent_info.did] = agent_info
        logger.info(f"[Simulator] Registered agent: {agent_info.did} ({agent_info.name})")
        return True
    
    def get_all_agents(self) -> List[AgentInfo]:
        with self._lock:
            return list(self._agents.values())


class ZyndTransport(Transport):
    """Real agent network transport using Zynd SDK."""
    
    def __init__(self, identity_cred_path: str, secret_seed: str, agent_name: str, capabilities: List[str]):
        self.agent_name = agent_name
        self.capabilities = capabilities
        self._client = None
        self._own_did = None
        
        # Robust import shim for Zynd SDK
        try:
            from zyndai_agent import AgentConfig, P3AIAgent
            self._sdk_module = "zyndai_agent"
        except ImportError:
            try:
                from p3ai_agent import AgentConfig, P3AIAgent
                self._sdk_module = "p3ai_agent"
            except ImportError:
                raise ImportError(
                    "Could not import Zynd SDK. Install with:\n"
                    "  pip install zyndai-agent==0.1.0\n"
                    "or check if the package uses a different import name."
                )
        
        self._init_client(identity_cred_path, secret_seed)
    
    def _init_client(self, identity_cred_path: str, secret_seed: str):
        if self._sdk_module == "zyndai_agent":
            from zyndai_agent import AgentConfig, P3AIAgent
        else:
            from p3ai_agent import AgentConfig, P3AIAgent
        
        config = AgentConfig(
            identity_credential_path=identity_cred_path,
            secret_seed=secret_seed
        )
        self._client = P3AIAgent(config)
        self._own_did = self._client.get_did()
        
        # Register self with capabilities
        self._client.register_capabilities(self.capabilities)
    
    def get_own_did(self) -> str:
        return self._own_did or "did:zynd:unknown"
    
    def send(self, to_agent_did: str, message_type: str, payload: Dict[str, Any]) -> bool:
        try:
            message = {
                "type": message_type,
                "payload": payload,
                "timestamp": datetime.utcnow().isoformat()
            }
            self._client.send_message(to_agent_did, json.dumps(message))
            logger.info(f"[Zynd] Sent {message_type} to {to_agent_did}")
            return True
        except Exception as e:
            logger.error(f"[Zynd] Failed to send message: {e}")
            return False
    
    def read(self) -> List[TransportMessage]:
        try:
            raw_messages = self._client.receive_messages()
            messages = []
            for raw in raw_messages:
                data = json.loads(raw.content)
                msg = TransportMessage(
                    from_did=raw.sender_did,
                    to_did=self.get_own_did(),
                    message_type=data.get("type", "unknown"),
                    payload=data.get("payload", {}),
                    timestamp=data.get("timestamp", datetime.utcnow().isoformat())
                )
                messages.append(msg)
            return messages
        except Exception as e:
            logger.error(f"[Zynd] Failed to read messages: {e}")
            return []
    
    def search_agents_by_capabilities(self, capabilities: List[str], min_score: float = 0.5, top_k: int = 10) -> List[AgentInfo]:
        try:
            results = self._client.search_agents(
                capabilities=capabilities,
                min_score=min_score,
                limit=top_k
            )
            return [
                AgentInfo(
                    did=r.did,
                    name=r.name,
                    capabilities=r.capabilities,
                    endpoint=r.endpoint,
                    score=r.score
                )
                for r in results
            ]
        except Exception as e:
            logger.error(f"[Zynd] Failed to search agents: {e}")
            return []
    
    def verify_agent_identity(self, agent_did: str) -> bool:
        try:
            return self._client.verify_identity(agent_did)
        except Exception as e:
            logger.error(f"[Zynd] Failed to verify identity: {e}")
            return False
    
    def register_agent(self, agent_info: AgentInfo) -> bool:
        return True  # Self-registration happens in init


def get_transport(agent_name: str, capabilities: List[str], agent_did: str = None) -> Transport:
    """Factory function to get appropriate transport based on MODE env var."""
    mode = os.getenv("MODE", "SIMULATOR").upper()
    
    if mode == "ZYND":
        prefix = agent_name.upper().replace("-", "_")
        identity_path = os.getenv(f"{prefix}_IDENTITY_CRED_PATH")
        secret_seed = os.getenv(f"{prefix}_SEED")
        
        if not identity_path or not secret_seed:
            logger.warning(f"Missing Zynd credentials for {agent_name}, falling back to simulator")
            mode = "SIMULATOR"
        else:
            return ZyndTransport(identity_path, secret_seed, agent_name, capabilities)
    
    # Simulator mode
    did = agent_did or f"did:simulator:{agent_name}"
    transport = SimulatorTransport()
    transport.set_identity(did, agent_name, capabilities)
    return transport
