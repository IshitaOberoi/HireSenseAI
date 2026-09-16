import os
import subprocess
import logging
import tempfile
from pypdf import PdfReader
import docx2txt

logger = logging.getLogger("hiresense-ai.parser")

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text from PDF, falling back to OCR if standard text extraction yields empty results.
    """
    logger.info(f"Extracting text from PDF: {file_path}")
    text = ""
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        logger.error(f"Error during standard PDF text extraction: {e}")

    # Fallback to OCR if standard extraction is empty or too short (scanned PDF)
    if len(text.strip()) < 50:
        logger.info("Standard PDF text extraction returned empty or very short text. Falling back to OCR...")
        text = extract_text_via_ocr(file_path)
        
    return text

def extract_text_from_docx(file_path: str) -> str:
    """
    Extracts text from DOCX using docx2txt.
    """
    logger.info(f"Extracting text from DOCX: {file_path}")
    try:
        return docx2txt.process(file_path)
    except Exception as e:
        logger.error(f"Error during DOCX text extraction: {e}")
        raise e

def extract_text_via_ocr(file_path: str) -> str:
    """
    Uses Tesseract OCR as a fallback to extract text from a scanned PDF.
    Uses an isolated temporary directory to ensure all generated page images
    and intermediate files are reliably cleaned up.
    """
    if not os.path.isfile(file_path):
        logger.error(f"File not found for OCR: {file_path}")
        return ""

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            output_prefix = os.path.join(temp_dir, "page")
            logger.info(f"Converting PDF pages to images using pdftoppm in {temp_dir}: {file_path}")
            subprocess.run(["pdftoppm", "-png", "-r", "150", file_path, output_prefix], check=True)
            
            extracted_text = ""
            files = sorted([os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if f.startswith("page") and f.endswith(".png")])
            
            for img_path in files:
                logger.info(f"Running Tesseract OCR on page image: {img_path}")
                txt_output = os.path.splitext(img_path)[0]
                subprocess.run(["tesseract", img_path, txt_output], check=True)
                
                txt_file = txt_output + ".txt"
                if os.path.isfile(txt_file):
                    with open(txt_file, "r", encoding="utf-8", errors="replace") as f:
                        extracted_text += f.read() + "\n"
                
            return extracted_text
    except Exception as e:
        logger.error(f"OCR Fallback failed: {e}. Returning empty string.")
        return ""

def parse_resume_document(file_path: str) -> str:
    """
    Identifies the file type and calls the appropriate parser.
    Handles case-insensitive extensions (.pdf, .PDF, .docx, .DOCX).
    """
    lower_path = file_path.lower()
    if lower_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif lower_path.endswith(".docx"):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type for parsing: {file_path}")
