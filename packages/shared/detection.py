import Levenshtein
import re
import hashlib
from typing import List, Tuple
from .models import RiskIndicator


POPULAR_PACKAGES = [
    "lodash", "express", "react", "axios", "moment", "underscore",
    "jquery", "async", "request", "chalk", "commander", "debug",
    "uuid", "dotenv", "webpack", "babel", "typescript", "eslint",
    "prettier", "jest", "mocha", "chai", "sinon", "nodemon",
    "mongoose", "sequelize", "passport", "socket.io", "redis", "pg"
]


def check_typosquat(package_name: str, threshold: float = 0.85) -> Tuple[bool, str, float]:
    """Check if package name is suspiciously similar to popular packages."""
    package_lower = package_name.lower()
    
    for popular in POPULAR_PACKAGES:
        if package_lower == popular:
            continue
        
        # Calculate similarity
        distance = Levenshtein.distance(package_lower, popular)
        max_len = max(len(package_lower), len(popular))
        similarity = 1 - (distance / max_len)
        
        if similarity >= threshold:
            return True, f"Similar to '{popular}' (similarity: {similarity:.2%})", similarity
        
        # Check for common typosquat patterns
        patterns = [
            f"{popular}-", f"-{popular}", f"{popular}s", f"{popular}js",
            f"node-{popular}", f"{popular}-node", f"{popular}lib"
        ]
        for pattern in patterns:
            if pattern in package_lower or package_lower in pattern:
                return True, f"Pattern match with '{popular}' variant", 0.9
    
    return False, "", 0.0


def check_suspicious_scripts(metadata: dict) -> Tuple[bool, List[str], float]:
    """Check for suspicious npm scripts that could execute malicious code."""
    suspicious_scripts = ["postinstall", "preinstall", "install", "prepublish"]
    scripts = metadata.get("scripts", {})
    
    found = []
    for script in suspicious_scripts:
        if script in scripts:
            script_content = scripts[script]
            # Check for suspicious patterns in script
            dangerous_patterns = [
                r"curl\s+", r"wget\s+", r"eval\s*\(", r"base64",
                r"\.sh\s*$", r"node\s+-e", r"python\s+-c"
            ]
            for pattern in dangerous_patterns:
                if re.search(pattern, script_content, re.IGNORECASE):
                    found.append(f"{script}: {script_content[:100]}")
                    break
            else:
                if len(script_content) > 200:
                    found.append(f"{script}: long script ({len(script_content)} chars)")
    
    if found:
        confidence = min(0.6 + len(found) * 0.15, 0.95)
        return True, found, confidence
    return False, [], 0.0


def check_obfuscated_code(content: str) -> Tuple[bool, str, float]:
    """Check for obfuscated/encoded payloads."""
    indicators = []
    
    # Long base64-like strings
    base64_pattern = r'[A-Za-z0-9+/]{100,}={0,2}'
    matches = re.findall(base64_pattern, content)
    if matches:
        indicators.append(f"Found {len(matches)} base64-like string(s)")
    
    # Hex-encoded strings
    hex_pattern = r'\\x[0-9a-fA-F]{2}(?:\\x[0-9a-fA-F]{2}){20,}'
    if re.search(hex_pattern, content):
        indicators.append("Hex-encoded sequences detected")
    
    # Unicode escape sequences
    unicode_pattern = r'\\u[0-9a-fA-F]{4}(?:\\u[0-9a-fA-F]{4}){10,}'
    if re.search(unicode_pattern, content):
        indicators.append("Unicode escape sequences detected")
    
    # Excessive eval/Function constructor usage
    eval_count = len(re.findall(r'\beval\s*\(', content))
    func_count = len(re.findall(r'new\s+Function\s*\(', content))
    if eval_count > 3 or func_count > 2:
        indicators.append(f"Suspicious eval/Function usage (eval: {eval_count}, Function: {func_count})")
    
    if indicators:
        confidence = min(0.5 + len(indicators) * 0.15, 0.9)
        return True, "; ".join(indicators), confidence
    return False, "", 0.0


def compute_evidence_hash(data: str) -> str:
    """Compute SHA256 hash of evidence data."""
    return hashlib.sha256(data.encode()).hexdigest()


def analyze_package_release(
    package_name: str,
    version: str,
    metadata: dict = None,
    content_sample: str = None
) -> Tuple[List[RiskIndicator], float]:
    """
    Analyze a package release for security risks.
    Returns list of risk indicators and overall confidence score.
    """
    indicators = []
    metadata = metadata or {}
    content_sample = content_sample or ""
    
    # Check for typosquatting
    is_typosquat, typo_reason, typo_conf = check_typosquat(package_name)
    if is_typosquat:
        indicators.append(RiskIndicator(
            type="typosquat",
            description=typo_reason,
            confidence=typo_conf,
            evidence=compute_evidence_hash(package_name)
        ))
    
    # Check for suspicious scripts
    has_scripts, script_findings, script_conf = check_suspicious_scripts(metadata)
    if has_scripts:
        indicators.append(RiskIndicator(
            type="suspicious_scripts",
            description=f"Suspicious install scripts: {', '.join(script_findings)}",
            confidence=script_conf,
            evidence=compute_evidence_hash(str(metadata.get("scripts", {})))
        ))
    
    # Check for obfuscated code
    if content_sample:
        is_obfuscated, obf_reason, obf_conf = check_obfuscated_code(content_sample)
        if is_obfuscated:
            indicators.append(RiskIndicator(
                type="obfuscated_code",
                description=obf_reason,
                confidence=obf_conf,
                evidence=compute_evidence_hash(content_sample[:1000])
            ))
    
    # Calculate overall confidence
    if not indicators:
        return [], 0.0
    
    overall_confidence = max(ind.confidence for ind in indicators)
    return indicators, overall_confidence
