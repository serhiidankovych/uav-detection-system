import bpy
import os
import random
import bpy_extras.object_utils
from mathutils import Vector

# Paths for HDR images, saving datasets, and texture folders
hdr_folder_path = "D:/projects/blender/hdrs/"
textures_folder_path = "D:/projects/blender/textures/"
output_base_path = "D:/projects/blender/dataset/"


# Ensure HDR and texture folders exist
if not os.path.exists(hdr_folder_path):
    raise Exception(f"HDR folder does not exist: {hdr_folder_path}")

if not os.path.exists(textures_folder_path):
    raise Exception(f"Textures folder does not exist: {textures_folder_path}")

def get_yolo_bounding_box(obj, scene):
    """
    Calculate a  YOLO-format bounding box for an object in the scene.
    
    Args:
        obj (bpy.types.Object): The object to calculate bounding box for
        scene (bpy.types.Scene): The current Blender scene
    
    Returns:
        tuple or None: (bbox_x, bbox_y, bbox_w, bbox_h) or None if object not visible
    """
    # Get the camera and render resolution
    camera = scene.camera
    render_width = scene.render.resolution_x
    render_height = scene.render.resolution_y

    # Get the bounding box corners of the object in world space
    bbox_corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]

    # Project 3D bounding box corners to 2D screen space
    screen_points = []
    visible_points = []
    for corner in bbox_corners:
        co_2d = bpy_extras.object_utils.world_to_camera_view(scene, camera, corner)
        
        # Check if point is in front of the camera and within screen bounds
        if (co_2d.z > 0 and 
            0.0 <= co_2d.x <= 1.0 and 
            0.0 <= co_2d.y <= 1.0):
            screen_points.append((co_2d.x, 1 - co_2d.y))  # Flip Y coordinate
            visible_points.append(corner)

    # If no points are visible, return None
    if not screen_points:
        return None

    # Calculate bounding box in normalized coordinates
    min_x = max(0.0, min(point[0] for point in screen_points))
    max_x = min(1.0, max(point[0] for point in screen_points))
    min_y = max(0.0, min(point[1] for point in screen_points))
    max_y = min(1.0, max(point[1] for point in screen_points))

    # Calculate YOLO format bbox (center x, center y, width, height)
    bbox_x = (min_x + max_x) / 2
    bbox_y = (min_y + max_y) / 2
    bbox_w = max_x - min_x
    bbox_h = max_y - min_y

    return bbox_x, bbox_y, bbox_w, bbox_h

def setup_camera_tracking(camera, target):
    """
    Set up camera tracking constraint to follow the target object.
    
    Args:
        camera (bpy.types.Object): Camera object
        target (bpy.types.Object): Target object to track
    """
    # Remove existing Track To constraints
    for constraint in camera.constraints:
        if constraint.type == 'TRACK_TO':
            camera.constraints.remove(constraint)
    
    # Add a new Track To constraint
    track_to = camera.constraints.new(type='TRACK_TO')
    track_to.target = target
    track_to.track_axis = 'TRACK_NEGATIVE_Z'
    track_to.up_axis = 'UP_Y'

def generate_drone_dataset():
    """
    Generate a dataset of drone images with YOLO annotations.
    """
    # Get start and end frames from the current scene
    start_frame = bpy.context.scene.frame_start
    end_frame = bpy.context.scene.frame_end

    # Get the drone object (assuming it's the only selected object in the scene)
    if not bpy.context.selected_objects:
        raise Exception("No object selected for rendering.")
    drone = bpy.context.selected_objects[0]

    # Ensure the camera follows the drone
    camera = bpy.context.scene.camera
    if not camera:
        raise Exception("No camera found in the scene.")

    # Set up camera tracking
    setup_camera_tracking(camera, drone)

    # Iterate over each HDR file
    for i, hdr_file in enumerate(os.listdir(hdr_folder_path)):
        if hdr_file.endswith(('.hdr', '.exr')):
            hdr_path = os.path.join(hdr_folder_path, hdr_file)

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
            bpy.context.scene.world.node_tree.links.new(
                env_node.outputs['Color'], 
                bpy.context.scene.world.node_tree.nodes['Background'].inputs['Color']
            )

            # Create folders for saving images and labels
            images_path = os.path.join(hdr_output_base_path, "images")
            labels_path = os.path.join(hdr_output_base_path, "labels")
            os.makedirs(images_path, exist_ok=True)
            os.makedirs(labels_path, exist_ok=True)

            # Track successful renderings
            rendered_images = []
            annotation_frames = []

            # Animate the drone with controlled movement
            for frame in range(start_frame, end_frame + 1):
                bpy.context.scene.frame_set(frame)

                # Randomly move and rotate the drone
                # Calculate a position far from the camera
                distance_from_camera = random.uniform(15, 150)  # Set the minimum and maximum distance
                
                # Calculate the new position relative to the camera
                camera_location = camera.location
                drone.location = (
                    camera_location.x + distance_from_camera * random.uniform(-1, 1),  # X offset
                    camera_location.y + distance_from_camera * random.uniform(-1, 1),  # Y offset
                    random.uniform(30, 80)  # Z (always in the sky)
                )

                # Random rotation
                drone.rotation_euler = (
                    random.uniform(0, 3.14),  # X rotation
                    random.uniform(0, 3.14),  # Y rotation
                    random.uniform(0, 3.14)  # Z rotation
                )

                # Calculate bounding box before rendering
                bbox = get_yolo_bounding_box(drone, bpy.context.scene)

                if bbox:
                    # Render the image only if the drone is visible
                    image_file = os.path.join(images_path, f"{len(rendered_images):04d}.png")
                    bpy.context.scene.render.filepath = image_file
                    bpy.ops.render.render(write_still=True)

                    # Save the bounding box in YOLO format
                    rendered_images.append(frame)
                    annotation_frames.append(bbox)

            # Write annotation files for all successfully rendered images
            for idx, bbox in enumerate(annotation_frames):
                label_file = os.path.join(labels_path, f"{idx:04d}.txt")
                with open(label_file, 'w') as f:
                    bbox_x, bbox_y, bbox_w, bbox_h = bbox
                    f.write(f"1 {bbox_x:.6f} {bbox_y:.6f} {bbox_w:.6f} {bbox_h:.6f}\n")

            print(f"Generated {len(rendered_images)} images and annotations for {hdr_name}")

def main():
    """
    Main function to run the drone dataset generation.
    """
    try:
        generate_drone_dataset()
        print("Dataset generation completed successfully!")
    except Exception as e:
        print(f"Error during dataset generation: {e}")

# Only run the script if it's being run directly in Blender
if __name__ == "__main__":
    main()