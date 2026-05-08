import pymupdf  # Previously known as fitz

doc = pymupdf.open("fuvest2025_primeira_fase_prova_V1.pdf")

for i, page in enumerate(doc):
    # Get a list of images on the current page
    image_list = page.get_images(full=True)

    for img_index, img in enumerate(image_list):
        xref = img[0]  # Get the image XREF

        # Extract image dictionary containing binary data and metadata
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]  # e.g., 'png', 'jpeg'

        # Save image to disk
        image_name = f"page{i+1}_img{img_index+1}.{image_ext}"
        with open(image_name, "wb") as f:
            f.write(image_bytes)

doc.close()
