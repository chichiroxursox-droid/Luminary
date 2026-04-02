"""Camera positioning, tracking, and orbit animation."""
import bpy
import math


def add_camera(location=(7, -7, 5), target=None):
    """Add a camera to the scene, optionally tracking a target object.

    Args:
        location: (x, y, z) camera position
        target: bpy.types.Object to track, or None

    Returns:
        bpy.types.Object (the camera object)
    """
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("Camera")
    cam_obj = bpy.data.objects.new("Camera", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    cam_obj.location = location

    if target:
        constraint = cam_obj.constraints.new(type='TRACK_TO')
        constraint.target = target
        constraint.track_axis = 'TRACK_NEGATIVE_Z'
        constraint.up_axis = 'UP_Y'

    return cam_obj


def setup_orbit(target, radius=5.0, height=3.0, frame_start=1, frame_end=60):
    """Set up a camera orbit animation around a target object.

    Creates a BezierCircle path and constrains the camera to follow it,
    producing a smooth 360-degree orbit over the frame range.

    Args:
        target: bpy.types.Object to orbit around
        radius: Distance from target center
        height: Camera height above target origin
        frame_start: First frame of animation
        frame_end: Last frame of animation

    Returns:
        bpy.types.Object (the camera object)
    """
    scene = bpy.context.scene

    # Create circular path
    bpy.ops.curve.primitive_bezier_circle_add(radius=radius, location=(0, 0, height))
    path = bpy.context.active_object
    path.name = "CameraPath"

    # Set path animation duration
    path.data.path_duration = frame_end - frame_start

    # Create camera
    cam_data = bpy.data.cameras.new("OrbitCamera")
    cam_obj = bpy.data.objects.new("OrbitCamera", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # Follow Path constraint
    follow = cam_obj.constraints.new(type='FOLLOW_PATH')
    follow.target = path
    follow.use_curve_follow = True
    follow.forward_axis = 'FORWARD_Y'
    follow.up_axis = 'UP_Z'

    # Animate the path offset
    follow.offset = 0
    follow.keyframe_insert(data_path="offset", frame=frame_start)
    follow.offset = -100  # -100 = full 360 degrees
    follow.keyframe_insert(data_path="offset", frame=frame_end)

    # Track target
    track = cam_obj.constraints.new(type='TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    # Set scene frame range
    scene.frame_start = frame_start
    scene.frame_end = frame_end

    return cam_obj
