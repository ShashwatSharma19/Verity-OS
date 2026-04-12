import json

class ToulminArgument:
    def __init__(self, claim: str, grounds: list[str], warrant: str, backing: list[str], rebuttal: str = None, qualifier: str = None):
        self.claim = claim
        self.grounds = grounds    
        self.warrant = warrant    
        self.backing = backing    
        self.rebuttal = rebuttal
        self.qualifier = qualifier

def analyze_document_reasoning(llm_response_json: str) -> dict:
    try:
        data = json.loads(llm_response_json)
    except json.JSONDecodeError:
        return {"status": "FAIL_CIRCUIT_BREAKER", "reason": "Invalid JSON format"}

    claim = data.get("claim")
    grounds = data.get("grounds", [])
    warrant = data.get("warrant")
    
    if not claim:
        return {"status": "FAIL_CIRCUIT_BREAKER", "reason": "Missing Claim"}
        
    if not grounds or not isinstance(grounds, list) or len(grounds) == 0:
        return {"status": "MISSING_EVIDENCE", "reason": "Empty Grounds bucket. Claim is unsupported."}
        
    if not warrant or str(warrant).strip() == "":
        return {"status": "MISSING_LOGIC", "reason": "Empty Warrant bucket. Logical connection unsupported."}
        
    argument = ToulminArgument(
        claim=claim,
        grounds=grounds,
        warrant=warrant,
        backing=data.get("backing", []),
        rebuttal=data.get("rebuttal"),
        qualifier=data.get("qualifier")
    )
    return {"status": "SUCCESS", "argument": vars(argument)}