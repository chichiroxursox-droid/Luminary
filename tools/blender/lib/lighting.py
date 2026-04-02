"""Light creation helpers and world background setup."""
import bpy


def add_light(light_type, location, energy, **kwargs):
    """Add a light to the scene.

    Args:
        light_type: 'POINT', 'AREA', 'SUN', or 'SPOT'
        location: (x, y, z) tuple
        energy: Light power in watts
        **kwargs: Additional bpy.types.Light properties (e.g. size, color, angle)

    Returns:
        bpy.types.Object (the light object)
    """
    light_data = bpy.data.lights.new("Light", type=light_type)
    light_data.energy = energy
    for key, val in kwargs.items():
        setattr(light_data, key, val)
    light_obj = bpy.data.objects.new("Light", light_data)
    bpy.context.collection.objects.link(light_obj)
    light_obj.location = location
    return light_obj


def add_area_light(location, energy=500, size=3, color=(1, 1, 1)):
    """Add an area light (soft shadows, good for product shots)."""
    light = add_light('AREA', location, energy, size=size, color=color)
    return light


def add_point_light(location, energy=200, color=(1, 1, 1)):
    """Add a point light (omnidirectional)."""
    light = add_light('POINT', location, energy, color=color)
    return light


def add_sun_light(rotation, energy=5, color=(1, 1, 1)):
    """Add a sun light (parallel rays, good for outdoor scenes)."""
    light = add_light('SUN', (0, 0, 0), energy, color=color)
    light.rotation_euler = rotation
    return light


def set_background_color(color=(0.02, 0.02, 0.05, 1), strength=1.0):
    """Set a solid color world background."""
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = color
    bg.inputs['Strength'].default_value = strength


def set_sky_background():
    """Set a procedural sky background (outdoor scenes)."""
    world = bpy.data.worlds.new("SkyWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    sky = nodes.new('ShaderNodeTexSky')
    sky.sky_type = 'HOSEK_WILKIE'
    sky.sun_direction = (0.5, 0.5, 0.707)  # ~45 degree elevation

    bg = nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = 1.0

    output = nodes.new('ShaderNodeOutputWorld')

    links.new(sky.outputs['Color'], bg.inputs['Color'])
    links.new(bg.outputs['Background'], output.inputs['Surface'])
