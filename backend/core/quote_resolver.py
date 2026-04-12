import difflib

def resolve_quote(source_text: str, quoted_snippet: str, threshold: float = 0.85):
    if not source_text or not quoted_snippet:
        return None
        
    matcher = difflib.SequenceMatcher(None, source_text, quoted_snippet)
    match = matcher.find_longest_match(0, len(source_text), 0, len(quoted_snippet))
    
    if match.size == 0:
        return None
        
    start_idx = match.a
    end_idx = match.a + match.size
    matched_text = source_text[start_idx:end_idx]
    
    similarity = difflib.SequenceMatcher(None, matched_text, quoted_snippet).ratio()
    
    if similarity >= threshold:
        return {"start": start_idx, "end": end_idx, "exact_text": matched_text, "ratio": similarity}
    return None