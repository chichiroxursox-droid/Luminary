"""Cycles render engine setup and execution."""
import os
import bpy


def setup_engine(resolution=1080, samples=128, format='PNG', transparent=False):
    """Configure Cycles renderer with GPU acceleration.

    Args:
        resolution: Vertical resolution in pixels (width = height * 16/9)
        samples: Number of Cycles samples (higher = less noise, slower)
        format: Output format — 'PNG', 'JPEG', or 'EXR'
        transparent: If True, render with transparent background (alpha channel)
    """
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = int(resolution * 16 / 9)
    scene.render.resolution_y = resolution
    scene.render.image_settings.file_format = format
    scene.render.film_transparent = transparent

    if format == 'PNG':
        scene.render.image_settings.color_depth = '16'
    elif format == 'JPEG':
        scene.render.image_settings.color_depth = '8'

    # GPU setup (Apple Silicon / Metal)
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        for device in prefs.devices:
            device.use = True
        scene.cycles.device = 'GPU'
        print("GPU rendering enabled (Metal)")
    except Exception as e:
        print(f"GPU setup failed, using CPU: {e}")
        scene.cycles.device = 'CPU'


def render_still(output_path):
    """Render a single frame and save to disk.

    Args:
        output_path: Full file path for the output image

    Creates parent directories if they don't exist.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    bpy.context.scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered still to {output_path}")


def render_animation(output_prefix, frame_start=1, frame_end=60, fps=30):
    """Render an animation as a sequence of numbered frames.

    Args:
        output_prefix: Path prefix for frames (e.g. '.tmp/renders/frame_')
                       Blender appends frame number and extension automatically.
        frame_start: First frame to render
        frame_end: Last frame to render
        fps: Frames per second

    Output files will be named like: frame_0001.png, frame_0002.png, etc.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_prefix)), exist_ok=True)
    scene = bpy.context.scene
    scene.frame_start = frame_start
    scene.frame_end = frame_end
    scene.render.fps = fps
    scene.render.filepath = output_prefix
    bpy.ops.render.render(animation=True)
    print(f"Rendered {frame_end - frame_start + 1} frames to {output_prefix}*")
