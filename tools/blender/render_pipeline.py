"""
Blender Modular Render Pipeline
Usage: blender -b --factory-startup -P tools/blender/render_pipeline.py -- [flags]

Examples:
  # Product shot with studio lighting
  blender -b --factory-startup -P tools/blender/render_pipeline.py -- \
    --input jellyfish.glb --preset studio --output .tmp/renders/jellyfish.png

  # Dark moody render
  blender -b --factory-startup -P tools/blender/render_pipeline.py -- \
    --input jellyfish.glb --preset dark_void --output .tmp/renders/dark.png

  # 120-frame orbit animation
  blender -b --factory-startup -P tools/blender/render_pipeline.py -- \
    --input jellyfish.glb --preset dark_void --output .tmp/renders/frame_ \
    --animate --camera-orbit --frames 1-120

  # No model — renders preset environment only
  blender -b --factory-startup -P tools/blender/render_pipeline.py -- \
    --preset dark_void --output .tmp/renders/void.png
"""
import sys
import os
import bpy

# Add script directory to Python path so lib/ and presets/ are importable
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import argparse
from lib.engine import setup_engine, render_still, render_animation
from lib.importer import import_model
from lib.camera import setup_orbit
from presets import studio, dark_void, outdoor

# --- Parse CLI arguments ---
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
parser = argparse.ArgumentParser(description="Blender modular render pipeline")
parser.add_argument('--input', type=str, default=None,
                    help="Path to GLB/FBX/OBJ model (optional)")
parser.add_argument('--preset', type=str, default='studio',
                    choices=['studio', 'dark_void', 'outdoor'],
                    help="Lighting preset (default: studio)")
parser.add_argument('--output', type=str, required=True,
                    help="Output path (still: filename, animation: frame prefix)")
parser.add_argument('--animate', action='store_true',
                    help="Render animation frame sequence instead of still")
parser.add_argument('--frames', type=str, default='1-60',
                    help="Frame range for animation, e.g. 1-120 (default: 1-60)")
parser.add_argument('--fps', type=int, default=30,
                    help="Frames per second (default: 30)")
parser.add_argument('--camera-orbit', action='store_true',
                    help="Auto-orbit camera around object during animation")
parser.add_argument('--orbit-radius', type=float, default=5.0,
                    help="Camera orbit radius (default: 5.0)")
parser.add_argument('--orbit-height', type=float, default=3.0,
                    help="Camera orbit height (default: 3.0)")
parser.add_argument('--resolution', type=int, default=1080,
                    help="Vertical resolution in pixels (default: 1080)")
parser.add_argument('--samples', type=int, default=128,
                    help="Cycles samples (default: 128)")
parser.add_argument('--format', type=str, default='PNG',
                    choices=['PNG', 'JPEG', 'EXR'],
                    help="Output format (default: PNG)")
parser.add_argument('--transparent', action='store_true',
                    help="Render with transparent background")
args = parser.parse_args(argv)

# Parse frame range
frame_start, frame_end = 1, 60
if '-' in args.frames:
    parts = args.frames.split('-')
    frame_start = int(parts[0])
    frame_end = int(parts[1])

# --- Pipeline execution ---

# Step 1: Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Step 2: Setup render engine
setup_engine(resolution=args.resolution, samples=args.samples,
             format=args.format, transparent=args.transparent)

# Step 3: Import model (if provided)
imported_object = None
if args.input:
    imported_object = import_model(args.input)

# Step 4: Apply preset
PRESETS = {
    'studio': studio,
    'dark_void': dark_void,
    'outdoor': outdoor,
}
preset_module = PRESETS[args.preset]
preset_module.apply(imported_object=imported_object)

# Step 5: Setup camera orbit (if animating with orbit)
if args.animate and args.camera_orbit and imported_object:
    setup_orbit(target=imported_object, radius=args.orbit_radius,
                height=args.orbit_height, frame_start=frame_start,
                frame_end=frame_end)

# Step 6: Render
if args.animate:
    render_animation(output_prefix=args.output, frame_start=frame_start,
                     frame_end=frame_end, fps=args.fps)
else:
    render_still(output_path=args.output)
