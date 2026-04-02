"""Dark void preset — cinematic dark aesthetic (DEEP SEA / GLACIAL style)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from lib.lighting import add_area_light, add_point_light, set_background_color
from lib.camera import add_camera


def apply(imported_object=None):
    """Apply dark void lighting preset.

    Dramatic rim lighting with cyan tint on near-black background.

    Args:
        imported_object: The model to light. If None, preset still sets up
                         the environment.

    Returns:
        bpy.types.Object — the camera
    """
    # Rim light: behind-left, cyan tint
    add_area_light(location=(-3, 3, 4), energy=400, size=2,
                   color=(0.0, 0.85, 1.0))  # cyan

    # Subtle fill: below-front, cool blue
    add_point_light(location=(1, -2, -1), energy=100,
                    color=(0.4, 0.5, 0.8))

    # Near-black background
    set_background_color(color=(0.004, 0.004, 0.02, 1), strength=1.0)

    # Camera: lower angle, closer
    target = imported_object
    cam = add_camera(location=(3, -3, 2), target=target)

    return cam
