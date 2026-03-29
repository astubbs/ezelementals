"""Canned Ollama response dicts for testing."""

import json

VALID_CLASSIFICATION = {
    "wind": 2,
    "wind_direction": "frontal",
    "water": 0,
    "water_type": "none",
    "heat_ambient": 0,
    "heat_radiant": 0,
    "confidence": 0.88,
}

LOW_CONFIDENCE_CLASSIFICATION = {
    **VALID_CLASSIFICATION,
    "confidence": 0.4,
}

FURY_ROAD_SANDSTORM = {
    "wind": 3,
    "wind_direction": "frontal",
    "water": 0,
    "water_type": "none",
    "heat_ambient": 2,
    "heat_radiant": 0,
    "confidence": 0.95,
}

DUNKIRK_BEACH = {
    "wind": 1,
    "wind_direction": "side",
    "water": 2,
    "water_type": "spray",
    "heat_ambient": 1,
    "heat_radiant": 0,
    "confidence": 0.82,
}

MALFORMED_RESPONSE = "I cannot classify this scene with confidence."

CLAMPED_CLASSIFICATION = {
    "wind": 5,
    "wind_direction": "frontal",
    "water": -1,
    "water_type": "none",
    "heat_ambient": 0,
    "heat_radiant": 99,
    "confidence": 0.9,
}

MISSING_FIELD_CLASSIFICATION = {
    "wind": 1,
    "wind_direction": "frontal",
    # water and water_type intentionally missing
    "heat_ambient": 0,
    "heat_radiant": 0,
    "confidence": 0.75,
}


def ollama_response(classification_dict: dict) -> dict:
    """Wrap a classification dict in the Ollama API response envelope."""
    return {
        "model": "qwen2.5-vl:7b",
        "response": json.dumps(classification_dict),
        "done": True,
    }


def ollama_raw_response(raw_text: str) -> dict:
    """Wrap raw text (e.g. malformed) in the Ollama API response envelope."""
    return {
        "model": "qwen2.5-vl:7b",
        "response": raw_text,
        "done": True,
    }
