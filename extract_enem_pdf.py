#!/usr/bin/env python3
import argparse
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

import fitz


QUESTION_RE = re.compile(r"\bQuest[aã]o\s+(\d{1,3})\b", re.IGNORECASE)
SHARED_TEXT_RE = re.compile(
    r"^Texto\s+para\s+as\s+Quest(?:ões|oes)\s+de\s+(\d{1,3})\s+a\s+(\d{1,3})\.?$",
    re.IGNORECASE,
)
WORD_RE = re.compile(
    r"\d+(?:[.,]\d+)*(?:%|[ºª])?|[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[-'][A-Za-zÀ-ÖØ-öø-ÿ]+)?"
)
QUESTION_TITLE_RE = re.compile(r"^Quest[aã]o\s+\d{1,3}\s*$", re.IGNORECASE)
TEXT_SECTION_RE = re.compile(r"^TEXTO\s+[IVXLCDM]+$", re.IGNORECASE)
ALT_WITH_TEXT_RE = re.compile(r"^([A-E])(?:\t|[.)]\s+|\s{2,})(.+)$")
FIGURE_LABEL_RE = re.compile(r"^(Figura|Imagem|Mapa)\s+\d+[A-Za-z]?$", re.IGNORECASE)
DIRECT_CREDIT_RE = re.compile(
    r"^(Dispon[ií]vel em|Dipon[ií]vel em|Acesso em|Fontes?:|Cr[eé]dito:|"
    r"Cr[eé]ditos:|Imagem:|Figura:|Mapa:|Fotografia:|"
    r"Adaptado de|Extra[ií]do de|Reproduzido de)(?=[:\s]|$)",
    re.IGNORECASE,
)
CREDIT_FRAGMENT_RE = re.compile(
    r"\b(?:Dispon[ií]vel em|Dipon[ií]vel em|Acesso em)\b",
    re.IGNORECASE,
)
ENUNCIADO_START_RE = re.compile(
    r"^(?:Ao|Aos|As|No|Na|Nesse|Nessa|Neste|Nesta|Esse|Essa|Qual|Quais|"
    r"De que modo|Considerando|Com base|Segundo|Escrito em|O texto|Os textos|"
    r"A partir)\b",
    re.IGNORECASE,
)
VISUAL_CUE_RE = re.compile(
    r"\b(figura|figuras|imagem|imagens|quadro|quadros|tabela|tabelas|"
    r"gr[aá]fico|gr[aá]ficos|tirinha|tirinhas|charge|charges|cartum|"
    r"cartuns|mapa|mapas|esquema|esquemas|diagrama|diagramas|"
    r"fotografia|fotografias|infogr[aá]fico|infogr[aá]ficos|heredograma|heredogramas)\b",
    re.IGNORECASE,
)
LAYOUT_VISUAL_RE = re.compile(
    r"\b(?:conforme|de acordo com|apresentad[ao]s?|indicad[ao]s?|"
    r"ilustrad[ao]s?|representad[ao]s?)\b.{0,80}"
    r"\b(?:figura|imagem|mapa|gr[aá]fico|esquema|quadro|tabela)\b|"
    r"\b(?:na|no|pela|pelo)\s+(?:figura|mapa|gr[aá]fico|esquema|quadro|tabela)\b|"
    r"\b(?:figura|imagem|mapa|gr[aá]fico|esquema|quadro|tabela)\b.{0,80}"
    r"\b(?:apresenta|mostra|indica|ilustra|representa)\b",
    re.IGNORECASE | re.DOTALL,
)
ORDER_VISUAL_RE = re.compile(r"\b(?:seguir|segue|descrita)\s+esta\s+ordem\b", re.IGNORECASE)
HYDROLOGY_VISUAL_RE = re.compile(
    r"\b(?:evapotranspira[çc][ãa]o|escoamento|infiltra[çc][ãa]o|percola[çc][ãa]o)\b"
    r".{0,500}"
    r"\b(?:evapotranspira[çc][ãa]o|escoamento|infiltra[çc][ãa]o|percola[çc][ãa]o)\b",
    re.IGNORECASE | re.DOTALL,
)
STRUCTURED_VISUAL_RE = re.compile(
    r"\b(?:figura|gr[aá]fico|tabela|esquema)\b|"
    r"\bheredograma\b|"
    r"\b(?:em|no|num|neste|nesse|este|um|uma)\s+quadro\b|"
    r"\bquadro\b.{0,80}\b(?:apresenta|mostra|lista|relaciona)\b",
    re.IGNORECASE | re.DOTALL,
)
NOISE_PATTERNS = [
    re.compile(r"(?:ENEM\s*20\d{2}\s*){2,}", re.IGNORECASE),
    re.compile(r"ENEM20\d{2}(?:ENEM20\d{2})+", re.IGNORECASE),
    re.compile(r"^ENEM20\d{2}$", re.IGNORECASE),
    re.compile(r"^(?:[A-Z]{2}\s*-\s*)?[12][º°o]\s*dia\s*\|\s*Caderno\b", re.IGNORECASE),
    re.compile(r"^[A-Z]{2}\s*•\s*[12][º°o]\s*DIA\s*•\s*CADERNO\b", re.IGNORECASE),
    re.compile(
        r"^•\s*(?:CI[ÊE]NCIAS|MATEM[ÁA]TICA).+•\s*[12][º°o]\s*DIA\s*•\s*CADERNO\b",
        re.IGNORECASE,
    ),
    re.compile(r"LINGUAGENS.*REDA[ÇC][ÃA]O", re.IGNORECASE),
    re.compile(r"^(LINGUAGENS|CI[ÊE]NCIAS|MATEM[ÁA]TICA|PROVA DE)", re.IGNORECASE),
    re.compile(r"^Quest[õo]es de \d{1,3} a \d{1,3}", re.IGNORECASE),
    re.compile(r"^\*?\d{6,}[A-Z]{0,3}\d*\*?$", re.IGNORECASE),
    re.compile(r"\.ind[bd]\s+\d+", re.IGNORECASE),
    re.compile(r"^\d{1,2}$"),
    re.compile(r"Caderno \d+ - [A-ZÁÉÍÓÚÃÕÇ]+ - P[áa]gina \d+", re.IGNORECASE),
    re.compile(r"\|\s*2[º°o]\s*DIA\s*\|", re.IGNORECASE),
    re.compile(r"\|\s*1[º°o]\s*DIA\s*\|", re.IGNORECASE),
]
ESSAY_PAGE_RE = re.compile(
    r"(INSTRU[ÇC][ÕO]ES PARA A REDA[ÇC][ÃA]O|PROPOSTA DE REDA[ÇC][ÃA]O|"
    r"RASCUNHO\s+DA REDA[ÇC][ÃA]O|Transcreva a sua Reda[çc][ãa]o)",
    re.IGNORECASE,
)


@dataclass
class StreamBlock:
    kind: str
    page: int
    column: int
    y: float
    x: float
    bbox: tuple[float, float, float, float]
    text: str = ""


@dataclass
class Question:
    number: int
    language: str = "geral"
    start_page: int = 0
    start_y: float = 0.0
    pages: set[int] = field(default_factory=set)
    text_parts: list[str] = field(default_factory=list)
    image_blocks: list[dict] = field(default_factory=list)

    @property
    def text(self) -> str:
        text = "\n".join(part.strip() for part in self.text_parts if part.strip())
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()


@dataclass
class Alternative:
    label: str
    text: str


def block_text(block: dict) -> str:
    lines = []
    for line in block.get("lines", []):
        spans = [span.get("text", "") for span in line.get("spans", [])]
        line_text = "".join(spans).strip()
        if line_text:
            lines.append(line_text)
    return "\n".join(lines)


def clean_text(text: str) -> str:
    cleaned_lines = []
    for line in text.splitlines():
        line = line.strip()
        line = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", line)
        if not line:
            continue
        if any(pattern.search(line) for pattern in NOISE_PATTERNS):
            continue
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def strip_alternative_marker(line: str) -> str:
    if re.fullmatch(r"[A-E]", line):
        return ""

    match = ALT_WITH_TEXT_RE.match(line)
    if match:
        return match.group(2).strip()

    return line


def is_alternative_line(line: str) -> bool:
    return bool(re.fullmatch(r"[A-E]", line) or ALT_WITH_TEXT_RE.match(line))


def alternative_marker(
    line: str,
    expected_label: str | None = None,
    allow_single_space: bool = False,
) -> tuple[str, str] | None:
    if re.fullmatch(r"[A-E]", line):
        label = line
        text = ""
    else:
        match = ALT_WITH_TEXT_RE.match(line)
        if match:
            label = match.group(1)
            text = match.group(2).strip()
        elif allow_single_space:
            if expected_label:
                match = re.match(rf"^({expected_label})\s+\S", line)
            else:
                match = re.match(r"^([A-E])\s+\S", line)

            if not match:
                return None

            label = match.group(1)
            text = line[1:].strip()
        else:
            return None

    if expected_label and label != expected_label:
        return None
    return label, text


def next_label(label: str) -> str | None:
    if label == "E":
        return None
    return chr(ord(label) + 1)


def has_strict_marker(lines: list[str], label: str, start_index: int) -> bool:
    return any(
        alternative_marker(line, label, allow_single_space=False)
        for line in lines[start_index:]
    )


def extract_alternatives(text: str) -> list[Alternative]:
    alternatives: list[Alternative] = []
    current_label: str | None = None
    current_lines: list[str] = []
    expected_label = "A"
    lines = [item.strip() for item in text.splitlines() if item.strip()]

    for index, line in enumerate(lines):
        marker = None
        if current_label is not None:
            marker = alternative_marker(line, expected_label=None, allow_single_space=True)
        elif expected_label is not None:
            allow_single_space = current_label is not None or not has_strict_marker(
                lines, expected_label, index + 1
            )
            marker = alternative_marker(line, expected_label, allow_single_space)
        if marker:
            if current_label is not None:
                alternatives.append(
                    Alternative(current_label, "\n".join(current_lines).strip())
                )

            current_label, first_line = marker
            current_lines = [first_line] if first_line else []
            expected_label = next_label(current_label)
            continue

        if current_label is not None:
            current_lines.append(strip_alternative_marker(line))

    if current_label is not None:
        alternatives.append(Alternative(current_label, "\n".join(current_lines).strip()))

    alternatives_by_label = {alternative.label: alternative for alternative in alternatives}
    if set(alternatives_by_label) != set("ABCDE"):
        return []

    return [alternatives_by_label[label] for label in "ABCDE"]


def line_starts_bibliographic_reference(line: str) -> bool:
    if re.search(r"\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}\s*,\s*[A-Z]\.", line):
        return True
    if re.search(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ-]+\.\s+.+\b(?:19|20)\d{2}", line):
        return True
    if re.search(
        r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 &'’.-]{3,}\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]\s*[a-zà-öø-ÿ]",
        line,
    ):
        return True
    return False


def line_ends_bibliographic_reference(line: str) -> bool:
    lowered = line.lower()
    if "(adaptado)" in lowered or "(fragmento)" in lowered:
        return True
    if re.search(r"\bs/d\.?\s*$", lowered):
        return True
    if re.search(r"\bs\.d\.?\s*$", lowered):
        return True
    return bool(re.search(r"\b(?:19|20)\d{2}\.?\s*$", line))


def countable_text(text: str) -> str:
    source_lines = [line.strip() for line in text.splitlines()]
    lines = []
    skipping_reference = False

    for index, line in enumerate(source_lines):
        if not line or QUESTION_TITLE_RE.match(line) or SHARED_TEXT_RE.match(line):
            continue

        if any(pattern.search(line) for pattern in NOISE_PATTERNS):
            continue

        if skipping_reference:
            if ENUNCIADO_START_RE.match(line):
                skipping_reference = False
            else:
                if TEXT_SECTION_RE.match(line):
                    skipping_reference = False
                    continue
                if line_ends_bibliographic_reference(line):
                    skipping_reference = False
                continue

        if skipping_reference:
            if TEXT_SECTION_RE.match(line):
                skipping_reference = False
                continue
            if line_ends_bibliographic_reference(line):
                skipping_reference = False
            continue

        if TEXT_SECTION_RE.match(line):
            continue

        if lines:
            alternative_with_text = ALT_WITH_TEXT_RE.match(line)
            single_marker = re.fullmatch(r"[A-E]", line)
            next_non_empty = next(
                (item.strip() for item in source_lines[index + 1 :] if item.strip()),
                "",
            )
            if alternative_with_text or (
                single_marker
                and re.match(
                    rf"^{re.escape(line)}(?:\t|[.)]\s+|\s{{2,}}).+",
                    next_non_empty,
                )
            ):
                break

        if DIRECT_CREDIT_RE.search(line):
            continue

        if CREDIT_FRAGMENT_RE.search(line):
            if not line_ends_bibliographic_reference(line):
                skipping_reference = True
            continue

        if FIGURE_LABEL_RE.match(line):
            continue

        if line_starts_bibliographic_reference(line):
            if not line_ends_bibliographic_reference(line):
                skipping_reference = True
            continue

        next_lines = source_lines[index + 1 : index + 3]
        if any(DIRECT_CREDIT_RE.search(item.strip()) for item in next_lines) and (
            line_starts_bibliographic_reference(line)
            or line_ends_bibliographic_reference(line)
            or re.search(r"\b(?:1[5-9]\d{2}|20\d{2})\b", line)
        ):
            skipping_reference = True
            continue

        if ":" in line and any("(adaptado)" in item.lower() for item in next_lines):
            skipping_reference = True
            continue

        if "(adaptado)" in line.lower() and re.search(
            r"\b(n\.|v\.|ed\.|www\.|http|revista|jornal|química nova|enem|inep)\b",
            line,
            re.IGNORECASE,
        ):
            continue

        lines.append(line)

    return "\n".join(lines)


def block_column(page_width: float, bbox: tuple[float, float, float, float]) -> int:
    x0, _, x1, _ = bbox
    center = (x0 + x1) / 2
    return 0 if center < page_width / 2 else 1


def is_relevant_image(page_rect: fitz.Rect, bbox: tuple[float, float, float, float]) -> bool:
    x0, y0, x1, y1 = bbox
    width = x1 - x0
    height = y1 - y0
    area = width * height

    if area < 3000:
        return False
    if width < 20 or height < 20:
        return False
    if width < 30 and height > page_rect.height * 0.6:
        return False
    if y1 < 80 or y0 > page_rect.height - 35:
        return False
    if width > page_rect.width * 0.92 and height < 45:
        return False
    return True


def extract_blocks(pdf_path: Path) -> list[StreamBlock]:
    doc = fitz.open(pdf_path)
    stream = []

    def question_numbers(blocks: list[StreamBlock]) -> list[int]:
        numbers = []
        for block in blocks:
            if block.kind != "text":
                continue
            numbers.extend(int(match.group(1)) for match in QUESTION_RE.finditer(block.text))
        return numbers

    def inversion_count(numbers: list[int]) -> int:
        return sum(
            1
            for left_index, left in enumerate(numbers)
            for right in numbers[left_index + 1 :]
            if left > right
        )

    for page_index, page in enumerate(doc, start=1):
        if ESSAY_PAGE_RE.search(page.get_text()):
            continue

        page_width = page.rect.width
        page_blocks = []
        for raw_block in page.get_text("dict").get("blocks", []):
            bbox = tuple(raw_block["bbox"])
            column = block_column(page_width, bbox)

            if raw_block.get("type") == 0:
                text = clean_text(block_text(raw_block))
                if text:
                    page_blocks.append(
                        StreamBlock(
                            kind="text",
                            page=page_index,
                            column=column,
                            y=bbox[1],
                            x=bbox[0],
                            bbox=bbox,
                            text=text,
                        )
                    )
            elif raw_block.get("type") == 1 and is_relevant_image(page.rect, bbox):
                page_blocks.append(
                    StreamBlock(
                        kind="image",
                        page=page_index,
                        column=column,
                        y=bbox[1],
                        x=bbox[0],
                        bbox=bbox,
                    )
                )

        visual_blocks = sorted(page_blocks, key=lambda block: (block.column, block.y, block.x))
        native_numbers = question_numbers(page_blocks)
        visual_numbers = question_numbers(visual_blocks)

        if (
            len(native_numbers) > 1
            and inversion_count(visual_numbers) < inversion_count(native_numbers)
        ):
            stream.extend(visual_blocks)
        else:
            stream.extend(page_blocks)

    return stream


def split_questions(blocks: list[StreamBlock]) -> list[Question]:
    questions = []
    current: Question | None = None

    for block in blocks:
        if block.kind == "text":
            pending_lines = []
            for line in block.text.splitlines():
                match = QUESTION_RE.search(line)
                if match:
                    if current and pending_lines:
                        current.pages.add(block.page)
                        current.text_parts.append("\n".join(pending_lines))
                        pending_lines = []
                    current = Question(
                        number=int(match.group(1)),
                        start_page=block.page,
                        start_y=block.y,
                    )
                    questions.append(current)

                if current:
                    pending_lines.append(line)

            if current and pending_lines:
                current.pages.add(block.page)
                current.text_parts.append("\n".join(pending_lines))

        elif block.kind == "image" and current:
            if block.page == current.start_page and block.y < current.start_y - 8:
                continue

            current.pages.add(block.page)
            x0, y0, x1, y1 = block.bbox
            current.image_blocks.append(
                {
                    "page": block.page,
                    "bbox": [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)],
                    "area": round((x1 - x0) * (y1 - y0), 2),
                }
            )

    return questions


def mark_language_options(questions: list[Question]) -> None:
    option_counts = {number: 0 for number in range(1, 6)}
    for question in questions:
        if question.number not in option_counts:
            continue

        option_counts[question.number] += 1
        question.language = "inglês" if option_counts[question.number] == 1 else "espanhol"


def redistribute_shared_texts(questions: list[Question]) -> None:
    shared_ranges: list[tuple[int, int, str]] = []

    for question in questions:
        lines = question.text.splitlines()
        for index, line in enumerate(lines):
            match = SHARED_TEXT_RE.match(line.strip())
            if not match:
                continue

            start = int(match.group(1))
            end = int(match.group(2))
            shared_text = "\n".join(lines[index:]).strip()
            if not shared_text:
                continue

            shared_ranges.append((start, end, shared_text))
            kept_text = "\n".join(lines[:index]).strip()
            question.text_parts = [kept_text] if kept_text else []
            break

    for start, end, shared_text in shared_ranges:
        for question in questions:
            if start <= question.number <= end and question.language == "geral":
                question.text_parts.insert(0, shared_text)


def question_stats(question: Question) -> dict:
    statement_counted_text = countable_text(question.text)
    alternatives = extract_alternatives(question.text)
    alternatives_counted_text = "\n".join(
        alternative.text for alternative in alternatives if alternative.text
    )
    counted_text = "\n".join(
        part for part in [statement_counted_text, alternatives_counted_text] if part
    )
    words = WORD_RE.findall(counted_text)
    visual_cues = sorted(
        {match.group(0).lower() for match in VISUAL_CUE_RE.finditer(statement_counted_text)}
    )
    has_visual = bool(
        question.image_blocks
        or LAYOUT_VISUAL_RE.search(statement_counted_text)
        or ORDER_VISUAL_RE.search(statement_counted_text)
        or HYDROLOGY_VISUAL_RE.search(statement_counted_text)
        or STRUCTURED_VISUAL_RE.search(statement_counted_text)
    )
    return {
        "question": question.number,
        "language": question.language,
        "pages": sorted(question.pages),
        "word_count": len(words),
        "has_image": has_visual,
        "image_count": len(question.image_blocks),
        "images": question.image_blocks,
        "visual_cues": visual_cues,
        "text": question.text,
        "counted_text": counted_text,
        "alternatives": [
            {"letra": alternative.label, "texto": alternative.text}
            for alternative in alternatives
        ],
        "alternatives_counted_text": alternatives_counted_text,
    }


def question_summary(question: Question) -> dict:
    stats = question_stats(question)
    return {
        "questao": stats["question"],
        "idioma": stats["language"],
        "texto": stats["text"],
        "texto_contado": stats["counted_text"],
        "alternativas": stats["alternatives"],
        "tem_imagem": stats["has_image"],
        "quantidade_palavras": stats["word_count"],
    }


def write_md(path: Path, stats: list[dict]) -> None:
    lines = ["# Questões extraídas", ""]
    for item in stats:
        image_status = "sim" if item["tem_imagem"] else "não"
        lines.extend(
            [
                f"## Questão {item['questao']}",
                "",
                f"- Idioma: {item['idioma']}",
                f"- Palavras: {item['quantidade_palavras']}",
                f"- Tem imagem: {image_status}",
                "",
                "### Texto extraído",
                "",
                item["texto"],
                "",
                "### Texto contado",
                "",
                item["texto_contado"] or "_Nenhum texto contado._",
                "",
            ]
        )
    path.write_text("\n".join(lines), encoding="utf-8")


def discover_pdfs(input_path: Path) -> list[Path]:
    if input_path.is_dir():
        return sorted(input_path.rglob("*.pdf"))
    return [input_path]


def extract_pdfs(pdf_paths: list[Path], output_stem: str, out_dir: Path) -> int:
    blocks = []
    for pdf_path in pdf_paths:
        blocks.extend(extract_blocks(pdf_path))
    questions = split_questions(blocks)
    mark_language_options(questions)
    redistribute_shared_texts(questions)
    summaries = [question_summary(question) for question in questions]

    write_md(out_dir / f"{output_stem}.md", summaries)
    (out_dir / f"{output_stem}.json").write_text(
        json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"{output_stem}: {len(summaries)} questões")
    print(f"  MD:   {out_dir / f'{output_stem}.md'}")
    print(f"  JSON: {out_dir / f'{output_stem}.json'}")
    return len(summaries)


def extraction_groups(input_path: Path) -> list[tuple[str, Path, list[Path]]]:
    if not input_path.is_dir():
        return [(input_path.stem, Path(), [input_path])]

    direct_pdfs = sorted(input_path.glob("*.pdf"))
    if direct_pdfs:
        return [(pdf_path.stem, Path(), [pdf_path]) for pdf_path in direct_pdfs]

    groups = []
    for child in sorted(item for item in input_path.iterdir() if item.is_dir()):
        pdfs = sorted(child.rglob("*.pdf"))
        if pdfs:
            groups.append((child.name, child.relative_to(input_path), pdfs))
    return groups


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extrai texto, presença de imagem e contagem de palavras por questão."
    )
    parser.add_argument(
        "input",
        type=Path,
        nargs="?",
        default=Path("enems"),
        help="PDF ou pasta com PDFs. Padrão: enems",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("extracted"),
        help="Diretório de saída. Padrão: extracted",
    )
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    groups = extraction_groups(args.input)
    if not groups:
        raise SystemExit(f"Nenhum PDF encontrado em {args.input}")

    total = 0
    total_pdfs = 0
    for output_stem, relative_out_dir, pdfs in groups:
        total_pdfs += len(pdfs)
        pdf_out_dir = args.out_dir / relative_out_dir
        if relative_out_dir != Path():
            pdf_out_dir.mkdir(parents=True, exist_ok=True)
        total += extract_pdfs(pdfs, output_stem, pdf_out_dir)

    print(f"Total de PDFs: {total_pdfs}")
    print(f"Total de arquivos de saída: {len(groups) * 2}")
    print(f"Total de questões: {total}")


if __name__ == "__main__":
    main()
