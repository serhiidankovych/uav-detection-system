# UAV Detection System 🚁  

An advanced drone detection system combining a Next.js web interface, deep learning models, and synthetic dataset generation using Blender. This project is designed to detect  UAVs (Unmanned Aerial Vehicles) in real-time, offering high accuracy and adaptability across various scenarios.  

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  ![Python](https://img.shields.io/badge/python-3.8%2B-blue)  ![Next.js](https://img.shields.io/badge/Next.js-13.0%2B-black)  

---

## 📋 Table of Contents

- [🎯 System Overview](#-system-overview)
  - [Features](#-features)
  - [Building Blocks of the UAV Detection System](#️-building-blocks-of-the-uav-detection-system)

- [🎨 Dataset Generation](#-dataset-generation)
  - [Blender Pipeline](#blender-pipeline)

- [🧠 Model Training & Testing](#-model-training--testing)
  - [Training Results](#training-results)
  - [Testing Results](#testing-results)
  - [Ground Truth Comparisons](#ground-truth-comparisons)

- [🤝 Contributing](#-contributing)

- [📄 License](#-license)

- [🔗 Additional Resources](#-additional-resources)


---

## 🎯 System Overview  

The UAV Detection System is a comprehensive solution for detecting rones. It integrates state-of-the-art computer vision models with a user-friendly web interface, providing a versatile tool for drone surveillance in diverse environments.  

### ✨ Features  

**Detection Modes**:  
  - Photo analysis  
  - Video processing  
  - Real-time camera stream detection  

![image](https://github.com/user-attachments/assets/846358bf-42a8-4b17-b521-8402f44a0b7e)


### 🛠️ Building Blocks of the UAV Detection System

1. **Data Pipeline**:  
   - Synthetic data generation with Blender  
   - Augmentation for enhanced model robustness  

2. **Model**:  
   - YOLO-based architectures fine-tuned for UAV detection  

3. **Web Interface**:  
   - Next.js for real-time visualization and user interaction   

---

## 🎨 Dataset Generation  

### Blender Pipeline  

![image](https://github.com/user-attachments/assets/655fc449-2417-42c8-8a8c-ee260a3d9d58)


The dataset creation process employs Blender for rendering diverse and realistic UAV scenarios:  

| **Category**            | **Details**                                                                                 |
|--------------------------|---------------------------------------------------------------------------------------------|
| **Scene Setup**          | 3 UAV models, 50 unique environments, 25 flight paths, variable lighting and weather conditions |
| **Generation Parameters** | **Resolution**: 1920x1080, **Classes**: 3, **Total Images**: 2,331                         |

---

## 🧠 Model Training & Testing

The model training pipeline uses a YOLOv10-based architecture optimized for drone detection. Metrics, checkpoints, and configurations are saved for reproducibility.  

### Training Results  

![Training Results](https://github.com/user-attachments/assets/444a1b79-105b-4df3-ad46-cddb025a2100)  

### Testing Results  


| Metric       | Performance on Test Data | Performance on Validation Data | Difference in Performance |
|--------------|--------------------------|--------------------------------|---------------------------|
| mAP50        | 0.9825                   | 0.98966                        | -0.00716                  |
| mAP50-95     | 0.6912                   | 0.75729                        | -0.06609                  |


### Ground Truth Comparisons  

<table>
  <tr>
    <td align="center"><b>Ground Truth vs Test Images</b><br>
      <img src="https://github.com/user-attachments/assets/2d2b7c4e-0c54-4dd4-82a9-115dae0edab8" alt="GT vs Test" width="600">
    </td>
    <td align="center"><b>Ground Truth vs Real Images</b><br>
      <img src="https://github.com/user-attachments/assets/356a9e88-c323-4feb-b446-cf4f1af10d61" alt="GT vs Real" width="600">
    </td>
  </tr>
</table>

---


## 🤝 Contributing  

Contributions are welcome! Please fork the repository, create a branch, and submit a pull request.  

1. Fork the repository  
2. Create a feature branch (`git checkout -b feature-name`)  
3. Commit your changes (`git commit -m 'Add feature'`)  
4. Push to the branch (`git push origin feature-name`)  
5. Open a pull request  

---

## 📄 License  

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.  

---

## 🔗 Additional Resources  

- [Dataset on Roboflow](https://universe.roboflow.com/ai-jbsna/drone3-c8zgs/dataset/18)  

