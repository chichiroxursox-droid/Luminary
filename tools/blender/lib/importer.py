"""3D model importer with auto-center and auto-scale."""
import os
import bpy
from mathutils import Vector


def import_model(filepath):
    """Import a 3D model (GLB/FBX/OBJ) into the scene.

    After import, the model is centered at the origin and scaled to fit
    within a 2-unit bounding box (roughly -1 to +1 on each axis).

    Args:
        filepath: Path to the model file (.glb, .gltf, .fbx, or .obj)

    Returns:
        bpy.types.Object — the imported object (or parent if multiple objects)

    Raises:
        FileNotFoundError: If filepath doesn't exist
        ValueError: If file extension is not supported
    """
    filepath = os.path.abspath(filepath)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Model not found: {filepath}")

    ext = os.path.splitext(filepath)[1].lower()

    # Track which objects exist before import
    before = set(bpy.data.objects.keys())

    if ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=filepath)
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=filepath)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=filepath)
    else:
        raise ValueError(f"Unsupported format: {ext} (use .glb, .gltf, .fbx, or .obj)")

    # Find newly imported objects
    after = set(bpy.data.objects.keys())
    new_names = after - before
    new_objects = [bpy.data.objects[n] for n in new_names]

    if not new_objects:
        print(f"Warning: no objects imported from {filepath}")
        return None

    # Find mesh objects (skip empties, armatures, etc. for bounding box)
    mesh_objects = [o for o in new_objects if o.type == 'MESH']
    if not mesh_objects:
        mesh_objects = new_objects  # fallback to all objects

    # Calculate combined bounding box
    all_coords = []
    for obj in mesh_objects:
        for corner in obj.bound_box:
            world_coord = obj.matrix_world @ Vector(corner)
            all_coords.append(world_coord)

    if not all_coords:
        return new_objects[0]

    min_corner = Vector((min(c.x for c in all_coords),
                         min(c.y for c in all_coords),
                         min(c.z for c in all_coords)))
    max_corner = Vector((max(c.x for c in all_coords),
                         max(c.y for c in all_coords),
                         max(c.z for c in all_coords)))

    # Center at origin
    center = (min_corner + max_corner) / 2
    for obj in new_objects:
        obj.location -= center

    # Scale to fit in 2-unit box
    dimensions = max_corner - min_corner
    max_dim = max(dimensions.x, dimensions.y, dimensions.z)
    if max_dim > 0:
        scale_factor = 2.0 / max_dim
        for obj in new_objects:
            obj.scale *= scale_factor

    # Apply transforms
    bpy.ops.object.select_all(action='DESELECT')
    for obj in new_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = new_objects[0]
    bpy.ops.object.transform_apply(location=True, scale=True, rotation=True)

    print(f"Imported {filepath}: {len(new_objects)} objects, scaled to fit 2-unit box")
    return new_objects[0]
