from ultralytics import YOLO

# modelo de classificação
model = YOLO("yolov8s-cls.pt")

model.train(
    data="dataset",
    epochs=30,
    imgsz=224,
    batch=64,
    device=0   # GPU
)
