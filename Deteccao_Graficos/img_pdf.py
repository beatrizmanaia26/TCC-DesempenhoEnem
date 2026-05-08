import fitz  # pymupdf
from pathlib import Path

# =========================
# PASTAS
# =========================
pdf_dir = Path("arquivos")
output_dir = Path("imagens_extraidas")

output_dir.mkdir(exist_ok=True)

# =========================
# EXTRAÇÃO
# =========================
img_count = 0

for pdf_file in pdf_dir.glob("*.pdf"):
    print(f"Processando: {pdf_file.name}")

    doc = fitz.open(pdf_file)

    for page_index, page in enumerate(doc):

        image_list = page.get_images(full=True)

        for img_index, img in enumerate(image_list):

            xref = img[0]
            base_image = doc.extract_image(xref)

            image_bytes = base_image["image"]
            image_ext = base_image["ext"]

            width = base_image["width"]
            height = base_image["height"]

            #ignora imagens pequenas (muito importante)
            if width < 100 or height < 100:
                continue

            img_count += 1

            image_name = (
                f"{pdf_file.stem}_p{page_index+1}_img{img_index+1}.{image_ext}"
            )

            image_path = output_dir / image_name

            with open(image_path, "wb") as f:
                f.write(image_bytes)

    doc.close()

print(f"\nTotal de imagens salvas: {img_count}")
