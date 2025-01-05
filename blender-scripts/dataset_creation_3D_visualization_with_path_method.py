import bpy
import os
import random
import bpy_extras.object_utils

# Paths for HDR images, saving datasets, and texture folders
hdr_folder_path = "D:/projects/blender/hdrs/"
textures_folder_path = "D:/projects/blender/textures/"
output_base_path = "D:/projects/blender/dataset/"


# Ensure HDR and texture folders exist
if not os.path.exists(hdr_folder_path):
    raise Exception(f"HDR folder does not exist: {hdr_folder_path}")

if not os.path.exists(textures_folder_path):
    raise Exception(f"Textures folder does not exist: {textures_folder_path}")

# List of curve paths
curve_names = ["BezierCurve1", "BezierCurve2", "BezierCurve3", "BezierCurve4", "BezierCurve5", "BezierCurve6", "BezierCurve7", "BezierCurve8"]  # Replace with your actual curve names

  
# Function to calculate bounding box in YOLO format
def get_yolo_bounding_box(obj, scene):
    min_x, min_y = 1.0, 1.0
    max_x, max_y = 0.0, 0.0
    has_visible_vertex = False

    for vertex in obj.data.vertices:
        world_vertex = obj.matrix_world @ vertex.co
        co_2d = bpy_extras.object_utils.world_to_camera_view(scene, scene.camera, world_vertex)
        if 0.0 <= co_2d.x <= 1.0 and 0.0 <= co_2d.y <= 1.0 and co_2d.z > 0.0:
            has_visible_vertex = True
            min_x = min(min_x, co_2d.x)
            min_y = min(min_y, co_2d.y)
            max_x = max(max_x, co_2d.x)
            max_y = max(max_y, co_2d.y)

    if not has_visible_vertex:
        return None

    bbox_x = (min_x + max_x) / 2
    bbox_y = (min_y + max_y) / 2
    bbox_w = max_x - min_x
    bbox_h = max_y - min_y
    bbox_y = 1.0 - bbox_y

    bbox_x = max(0.0, min(1.0, bbox_x))
    bbox_y = max(0.0, min(1.0, bbox_y))
    bbox_w = max(0.0, min(1.0, bbox_w))
    bbox_h = max(0.0, min(1.0, bbox_h))

    return bbox_x, bbox_y, bbox_w, bbox_h

# Function to create a new material with a random set of textures
def create_random_material_from_folder(object, textures_folder):
    texture_folders = [os.path.join(textures_folder, d) for d in os.listdir(textures_folder) if os.path.isdir(os.path.join(textures_folder, d))]
    selected_texture_folder = random.choice(texture_folders)
    
    # Look for specific texture maps in the selected folder
    base_color_texture = None
    normal_texture = None
    roughness_texture = None
    metallic_texture = None
    displacement_texture = None

    for file_name in os.listdir(selected_texture_folder):
        file_path = os.path.join(selected_texture_folder, file_name)
        if "base_color" in file_name.lower():
            base_color_texture = file_path
        elif "normal" in file_name.lower():
            normal_texture = file_path
        elif "roughness" in file_name.lower():
            roughness_texture = file_path
        elif "metallic" in file_name.lower():
            metallic_texture = file_path
        elif "displacement" in file_name.lower():
            displacement_texture = file_path

    # Create a new material
    material = bpy.data.materials.new(name="RandomTextureMaterial")
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]

    # Apply Base Color Texture
    if base_color_texture:
        tex_image_node = material.node_tree.nodes.new("ShaderNodeTexImage")
        tex_image_node.image = bpy.data.images.load(base_color_texture)
        material.node_tree.links.new(bsdf.inputs['Base Color'], tex_image_node.outputs['Color'])

    # Apply Normal Map
    if normal_texture:
        normal_map_node = material.node_tree.nodes.new("ShaderNodeNormalMap")
        normal_tex_image_node = material.node_tree.nodes.new("ShaderNodeTexImage")
        normal_tex_image_node.image = bpy.data.images.load(normal_texture)
        material.node_tree.links.new(normal_map_node.inputs['Color'], normal_tex_image_node.outputs['Color'])
        material.node_tree.links.new(bsdf.inputs['Normal'], normal_map_node.outputs['Normal'])

    # Apply Roughness Map
    if roughness_texture:
        roughness_tex_image_node = material.node_tree.nodes.new("ShaderNodeTexImage")
        roughness_tex_image_node.image = bpy.data.images.load(roughness_texture)
        material.node_tree.links.new(bsdf.inputs['Roughness'], roughness_tex_image_node.outputs['Color'])

    # Apply Metallic Map
    if metallic_texture:
        metallic_tex_image_node = material.node_tree.nodes.new("ShaderNodeTexImage")
        metallic_tex_image_node.image = bpy.data.images.load(metallic_texture)
        material.node_tree.links.new(bsdf.inputs['Metallic'], metallic_tex_image_node.outputs['Color'])

    # Apply Displacement Map
    if displacement_texture:
        displacement_tex_image_node = material.node_tree.nodes.new("ShaderNodeTexImage")
        displacement_tex_image_node.image = bpy.data.images.load(displacement_texture)
        displacement_node = material.node_tree.nodes.new("ShaderNodeDisplacement")
        material.node_tree.links.new(displacement_node.inputs['Height'], displacement_tex_image_node.outputs['Color'])
        material.node_tree.links.new(material.node_tree.nodes["Material Output"].inputs['Displacement'], displacement_node.outputs['Displacement'])

    # Assign the material to the object
    if object.data.materials:
        object.data.materials[0] = material
    else:
        object.data.materials.append(material)

# Set up rendering

random_blur_length = random.uniform(0.01, 0.08)

# Set the random motion blur length
bpy.context.scene.eevee.motion_blur_shutter = random_blur_length # Adjust shutter for blur length
bpy.context.scene.eevee.motion_blur_position = 'CENTER'  # Center the blur on the frame
bpy.context.scene.eevee.motion_blur_steps = 1



# Get start and end frames from the current scene
start_frame = bpy.context.scene.frame_start
end_frame = bpy.context.scene.frame_end

# Get the drone object (assuming it's the only selected object in the scene)
if not bpy.context.selected_objects:
    raise Exception("No object selected for rendering.")
drone = bpy.context.selected_objects[0]

# Iterate over each HDR file and corresponding curve in the list
for i, hdr_file in enumerate(os.listdir(hdr_folder_path)):
    if hdr_file.endswith(('.hdr', '.exr')):
        hdr_path = os.path.join(hdr_folder_path, hdr_file)
        curve_name = curve_names[i % len(curve_names)]  # Cycle through curves if more HDRs than curves
        curve = bpy.data.objects.get(curve_name)
        
        if curve is None:
            raise Exception(f"Curve '{curve_name}' not found in the scene.")

        # Ensure the curve has path animation enabled
        if not curve.data.use_path:
            curve.data.use_path = True

        # Set the total length of the path animation
        curve.data.path_duration = end_frame - start_frame + 1

        # Keyframe the curve’s eval_time for motion blur
        curve.data.eval_time = 0  # Start at the beginning of the path
        curve.data.keyframe_insert(data_path="eval_time", frame=start_frame)

        curve.data.eval_time = curve.data.path_duration  # End at the end of the path
        curve.data.keyframe_insert(data_path="eval_time", frame=end_frame)

        # Create a new output folder for this HDR
        hdr_name = os.path.splitext(hdr_file)[0]
        hdr_output_base_path = os.path.join(output_base_path, hdr_name)

        # Set HDR as the environment texture
        bpy.context.scene.world.use_nodes = True
        env_node = bpy.context.scene.world.node_tree.nodes.get("Environment Texture")
        if not env_node:
            env_node = bpy.context.scene.world.node_tree.nodes.new(type="ShaderNodeTexEnvironment")
        env_node.image = bpy.data.images.load(hdr_path)
        bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
        bpy.context.scene.world.node_tree.links.new(env_node.outputs['Color'], bpy.context.scene.world.node_tree.nodes['Background'].inputs['Color'])

        # Create folders for saving images and labels
        images_path = os.path.join(hdr_output_base_path, "images")
        labels_path = os.path.join(hdr_output_base_path, "labels")
        os.makedirs(images_path, exist_ok=True)
        os.makedirs(labels_path, exist_ok=True)

        # Assign a random material to the drone
        create_random_material_from_folder(drone, textures_folder_path)

        # Remove any existing follow path constraints from the drone
        drone.constraints.clear()

        # Add follow path constraint to the drone
        follow_path_constraint = drone.constraints.new(type='FOLLOW_PATH')
        follow_path_constraint.target = curve
        follow_path_constraint.use_curve_follow = True  # Ensure the drone follows the curve's orientation

        # Animate the drone along the path
        for frame in range(start_frame, end_frame + 1):
            bpy.context.scene.frame_set(frame)
            
            # Adjust the curve's evaluation time to move the drone along the path
            curve.data.eval_time = (frame - start_frame) / (end_frame - start_frame) * curve.data.path_duration
            
            # Calculate bounding box before rendering
            bbox = get_yolo_bounding_box(drone, bpy.context.scene)
            
            if bbox:
                # Render the image only if the drone is visible
                image_file = os.path.join(images_path, f"{frame:04d}.png")
                bpy.context.scene.render.filepath = image_file
                bpy.ops.render.render(write_still=True)

                # Save the bounding box in YOLO format
                label_file = os.path.join(labels_path, f"{frame:04d}.txt")
                with open(label_file, 'w') as f:
                    bbox_x, bbox_y, bbox_w, bbox_h = bbox
                    f.write(f"1 {bbox_x:.6f} {bbox_y:.6f} {bbox_w:.6f} {bbox_h:.6f}\n")
            else:
                print(f"Frame {frame} skipped: Object not in camera view.")


        # Clean up the follow path constraint after rendering this HDR
        drone.constraints.remove(follow_path_constraint)
