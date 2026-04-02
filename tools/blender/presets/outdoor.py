"""Outdoor preset — natural daylight with procedural sky."""
import bpy
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from lib.lighting import add_sun_light, set_sky_background
from lib.camera import add_camera


def apply(imported_object=None):
    """Apply outdoor daylight preset.

    Sun lamp with procedural sky and shadow-catching ground plane.

    Args:
        imported_object: The model to light. If None, preset still sets up
                         the environment.

    Returns:
        bpy.types.Object — the camera
    """
    # Sun lamp: warm golden-hour angle
    add_sun_light(rotation=(math.radians(45), 0, math.radians(30)),
                  energy=5, color=(1.0, 0.95, 0.85))

    # Procedural sky background
    set_sky_background()

    # Ground plane with shadow catcher
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    ground = bpy.context.active_object
    ground.name = "Ground"
    ground.is_shadow_catcher = True

    # Camera: standard photo angle
    target = imported_object
    cam = add_camera(location=(5, -6, 3.5), target=target)

    return cam
