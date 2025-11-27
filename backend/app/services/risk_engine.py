"""
Risk Scoring Engine
Analyzes enrichment data and calculates risk scores for entities
"""
from typing import Dict, Any, List, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RiskEngine:
    """Calculate risk scores based on enrichment data"""
    
    # Risk level thresholds
    LOW_THRESHOLD = 30
    MEDIUM_THRESHOLD = 60
    
    def calculate_risk(self, entity_type: str, properties: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate risk score for an entity
        
        Returns:
            {
                "score": 0-100,
                "level": "LOW" | "MEDIUM" | "HIGH",
                "reasons": ["reason1", "reason2", ...]
            }
        """
        if entity_type == "email":
            return self._calculate_email_risk(properties)
        elif entity_type == "domain":
            return self._calculate_domain_risk(properties)
        elif entity_type == "ip":
            return self._calculate_ip_risk(properties)
        else:
            return {"score": 0, "level": "LOW", "reasons": []}
    
    def _calculate_email_risk(self, props: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate risk for email addresses"""
        score = 0
        reasons = []
        
        # Breach exposure (high weight)
        breach_count = props.get("breach_count", 0)
        if breach_count > 0:
            breach_score = min(breach_count * 15, 50)
            score += breach_score
            reasons.append(f"Found in {breach_count} data breach{'es' if breach_count > 1 else ''}")
        
        # Hunter.io deliverability score (inverse - low score = high risk)
        hunter_score = props.get("score")
        if hunter_score is not None:
            if hunter_score < 30:
                score += 30
                reasons.append(f"Low deliverability score ({hunter_score}/100)")
            elif hunter_score < 60:
                score += 15
                reasons.append(f"Medium deliverability score ({hunter_score}/100)")
        
        # Email status
        status = props.get("status")
        if status == "invalid":
            score += 20
            reasons.append("Email marked as invalid")
        elif status == "risky":
            score += 35
            reasons.append("Email marked as risky")
        
        return self._format_risk_result(score, reasons)
    
    def _calculate_domain_risk(self, props: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate risk for domains"""
        score = 0
        reasons = []
        
        # Domain age (newly registered = suspicious)
        domain_age_days = props.get("domain_age_days")
        if domain_age_days is not None:
            if domain_age_days < 7:
                score += 40
                reasons.append(f"Domain registered {domain_age_days} days ago (very new)")
            elif domain_age_days < 30:
                score += 25
                reasons.append(f"Domain registered {domain_age_days} days ago (new)")
            elif domain_age_days < 90:
                score += 10
                reasons.append(f"Domain registered {domain_age_days} days ago (recent)")
        
        # VirusTotal reputation
        vt_reputation = props.get("vt_reputation")
        vt_malicious = props.get("vt_malicious", 0)
        vt_suspicious = props.get("vt_suspicious", 0)
        
        if vt_malicious > 0:
            mal_score = min(vt_malicious * 10, 50)
            score += mal_score
            reasons.append(f"VirusTotal: {vt_malicious} engine(s) flagged as malicious")
        
        if vt_suspicious > 0:
            sus_score = min(vt_suspicious * 5, 25)
            score += sus_score
            reasons.append(f"VirusTotal: {vt_suspicious} engine(s) flagged as suspicious")
        
        if vt_reputation is not None and vt_reputation < 50:
            score += 20
            reasons.append(f"Low VirusTotal reputation ({vt_reputation}/100)")
        
        # AlienVault OTX threat intelligence
        otx_threat_score = props.get("otx_threat_score", 0)
        if otx_threat_score > 0:
            otx_score = min(otx_threat_score, 40)
            score += otx_score
            pulse_count = props.get("otx_pulse_count", 0)
            reasons.append(f"AlienVault: Threat score {otx_threat_score}/100 ({pulse_count} pulse{'s' if pulse_count != 1 else ''})")
        
        # URLScan malicious indicators
        malicious_score = props.get("malicious_score", 0)
        if malicious_score > 0:
            score += min(malicious_score * 5, 30)
            reasons.append(f"URLScan detected {malicious_score} malicious indicator(s)")
        
        return self._format_risk_result(score, reasons)
    
    def _calculate_ip_risk(self, props: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate risk for IP addresses"""
        score = 0
        reasons = []
        
        # Proxy/VPN detection
        if props.get("is_proxy"):
            score += 25
            reasons.append("IP is a proxy/VPN")
        
        # Hosting provider (higher risk for certain ASNs)
        if props.get("is_hosting"):
            score += 10
            reasons.append("IP is a hosting provider")
        
        # VirusTotal reputation
        vt_malicious = props.get("vt_malicious", 0)
        vt_suspicious = props.get("vt_suspicious", 0)
        
        if vt_malicious > 0:
            mal_score = min(vt_malicious * 10, 50)
            score += mal_score
            reasons.append(f"VirusTotal: {vt_malicious} engine(s) flagged as malicious")
        
        if vt_suspicious > 0:
            sus_score = min(vt_suspicious * 5, 25)
            score += sus_score
            reasons.append(f"VirusTotal: {vt_suspicious} engine(s) flagged as suspicious")
        
        # AlienVault OTX
        otx_threat_score = props.get("otx_threat_score", 0)
        if otx_threat_score > 0:
            otx_score = min(otx_threat_score, 40)
            score += otx_score
            reasons.append(f"AlienVault: Threat score {otx_threat_score}/100")
        
        # Shodan vulnerabilities
        vulnerabilities = props.get("vulnerabilities", [])
        if vulnerabilities and len(vulnerabilities) > 0:
            vuln_score = min(len(vulnerabilities) * 15, 45)
            score += vuln_score
            reasons.append(f"Shodan: {len(vulnerabilities)} known vulnerabilit{'ies' if len(vulnerabilities) > 1 else 'y'}")
        
        # Open ports (many open ports = potential risk)
        open_ports = props.get("open_ports", [])
        if open_ports and len(open_ports) > 10:
            score += 15
            reasons.append(f"{len(open_ports)} open ports detected")
        
        return self._format_risk_result(score, reasons)
    
    def _format_risk_result(self, score: int, reasons: List[str]) -> Dict[str, Any]:
        """Format the risk result with level and capped score"""
        # Cap score at 100
        score = min(score, 100)
        
        # Determine risk level
        if score < self.LOW_THRESHOLD:
            level = "LOW"
        elif score < self.MEDIUM_THRESHOLD:
            level = "MEDIUM"
        else:
            level = "HIGH"
        
        # If no reasons, add default
        if not reasons:
            reasons = ["No significant risk indicators found"]
        
        return {
            "score": score,
            "level": level,
            "reasons": reasons
        }


# Global instance
risk_engine = RiskEngine()
