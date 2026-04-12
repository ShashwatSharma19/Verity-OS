import numpy as np
from typing import List

def calculate_discriminative_calibration(token_logprobs: List[float], length_penalty: float = 1.0) -> float:
    if not token_logprobs:
        return 0.0
    probs = np.exp(token_logprobs)
    mean_logprob = np.mean(token_logprobs)
    normalized_confidence = np.exp(mean_logprob / length_penalty)
    return float(normalized_confidence)