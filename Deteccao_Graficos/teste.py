from ultralytics import YOLO

# carregar modelo treinado
model = YOLO("runs/classify/train/weights/best.pt")

# prever
results = model.predict("testes/")

print(results)
