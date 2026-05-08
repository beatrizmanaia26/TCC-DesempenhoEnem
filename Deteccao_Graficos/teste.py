from ultralytics import YOLO

# carregar modelo treinado
model = YOLO("runs/classify/train-4/weights/best.pt")

# prever
results = model.predict("testes/", save=True, project="resultados", name="teste_modelo")

