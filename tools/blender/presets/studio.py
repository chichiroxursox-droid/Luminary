"""Studio preset — classic 3-point product photography setup."""
import bpy
import math
import os
import sys

# Add parent directory to path so we can import lib modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from lib.lighting import add_area_light, add_point_light, set_background_color
from lib.materials import create_material
from lib.camera import add_camera


def apply(imported_object=None):
    """Apply studio lighting preset.

    Sets up a seamless curved backdrop, 3-point lighting, and camera.

    Args:
        imported_object: The model to photograph. If None, preset still sets up
                         the environment (useful for procedural scenes).

    Returns:
        bpy.types.Object — the camera
    """
    # Seamless curved backdrop
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 5, 0))
    backdrop = bpy.context.active_object
    backdrop.name = "Backdrop"
    backdrop.rotation_euler = (math.radians(90), 0, 0)

    # Apply a white-gray material
    mat = create_material("BackdropMat", base_color=(0.85, 0.85, 0.85, 1),
                          roughness=0.8)
    backdrop.data.materials.append(mat)

    # Floor
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.name = "Floor"
    floor.data.materials.append(mat)

    # 3-point lighting
    # Key light: front-left, warm white
    add_area_light(location=(4, -3, 6), energy=500, size=3,
                   color=(1.0, 0.95, 0.9))

    # Fill light: front-right, softer, neutral
    add_area_light(location=(-3, -2, 4), energy=200, size=2,
                   color=(1.0, 1.0, 1.0))

    # Rim light: behind-above, slight blue tint
    add_point_light(location=(0, 4, 5), energy=300,
                    color=(0.9, 0.95, 1.0))

    # Background world color
    set_background_color(color=(0.88, 0.88, 0.88, 1), strength=0.5)

    # Camera at 45 degrees
    target = imported_object
    cam = add_camera(location=(5, -5, 4), target=target)

    return cam
