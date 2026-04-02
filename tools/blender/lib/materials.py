"""PBR material builder for Blender Cycles."""
import bpy


def create_material(name, base_color=(0.8, 0.8, 0.8, 1), metallic=0, roughness=0.5,
                    transmission=0, ior=1.45, emission_color=None, emission_strength=0):
    """Create a PBR material using Principled BSDF.

    Args:
        name: Material name
        base_color: RGBA tuple (0-1 range)
        metallic: 0 (dielectric) to 1 (metal)
        roughness: 0 (mirror) to 1 (diffuse)
        transmission: 0 (opaque) to 1 (glass)
        ior: Index of refraction (glass=1.45, water=1.33, ice=1.31)
        emission_color: RGBA tuple for glow, or None
        emission_strength: Emission intensity (0 = no glow)

    Returns:
        bpy.types.Material
    """
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    output = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['IOR'].default_value = ior

    if transmission > 0:
        bsdf.inputs['Transmission Weight'].default_value = transmission
    if emission_color and emission_strength > 0:
        bsdf.inputs['Emission Color'].default_value = emission_color
        bsdf.inputs['Emission Strength'].default_value = emission_strength

    return mat
