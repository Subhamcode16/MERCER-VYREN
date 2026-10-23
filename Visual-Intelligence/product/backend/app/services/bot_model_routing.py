"""Versioned model route selection for the first bounded preview task."""


class ModelRouteUnavailable(Exception):
    pass


def select_model_route(policy: str, task_kind: str) -> dict:
    """Fail closed when a bot policy has no approved route for the task."""
    if policy == "local_preview.v1" and task_kind == "instagram_caption_concept":
        return {
            "policy": policy,
            "provider": "local",
            "model": "deterministic_template.v1",
            "reason": "Approved local preview route; no external model invoked",
            "usage_tokens": 0,
            "cost": 0,
        }
    raise ModelRouteUnavailable(f"No route for {task_kind} under {policy}")
