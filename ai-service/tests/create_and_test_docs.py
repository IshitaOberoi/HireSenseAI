import os
import sys
import zipfile
import pypdf
from pypdf import PdfWriter

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.pipelines.parser import extract_text_from_pdf, extract_text_from_docx, parse_resume_document
from app.pipelines.models import ParsedResumeSchema
from app.providers.llm_provider import GroqLLMProvider, LlmProviderError
from app.core.config import settings

def create_sample_pdf(filepath: str):
    # Create a minimal valid PDF using raw PDF stream
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        b"4 0 obj << /Length 205 >> stream\n"
        b"BT\n"
        b"/F1 12 Tf\n"
        b"72 712 Td (Alex Mercer) Tj\n"
        b"0 -20 Td (alex.mercer@example.com) Tj\n"
        b"0 -20 Td (Senior Software Engineer) Tj\n"
        b"0 -20 Td (Skills: Java, Spring Boot, Python, PostgreSQL, Docker, Redis) Tj\n"
        b"0 -20 Td (Experience: Software Engineer at Stripe 2022 to Present) Tj\n"
        b"ET\n"
        b"endstream\n"
        b"endobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"xref\n"
        b"0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000246 00000 n \n"
        b"0000000503 00000 n \n"
        b"trailer << /Size 6 /Root 1 0 R >>\n"
        b"startxref\n"
        b"580\n"
        b"%%EOF\n"
    )
    with open(filepath, "wb") as f:
        f.write(pdf_content)

def create_sample_docx(filepath: str):
    # Create a minimal valid docx zip archive
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
        '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
        '  <Default Extension="xml" ContentType="application/xml"/>\n'
        '  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>\n'
        '</Types>'
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
        '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>\n'
        '</Relationships>'
    )
    doc_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n'
        '  <w:body>\n'
        '    <w:p><w:r><w:t>Candidate: Jordan Lee</w:t></w:r></w:p>\n'
        '    <w:p><w:r><w:t>Role: Backend Platform Engineer</w:t></w:r></w:p>\n'
        '    <w:p><w:r><w:t>Skills: Go, Kubernetes, Terraform, PostgreSQL</w:t></w:r></w:p>\n'
        '    <w:p><w:r><w:t>Experience: Platform Engineer at Vercel (2023 - Present)</w:t></w:r></w:p>\n'
        '  </w:body>\n'
        '</w:document>'
    )
    with zipfile.ZipFile(filepath, "w") as docx:
        docx.writestr("[Content_Types].xml", content_types)
        docx.writestr("_rels/.rels", rels)
        docx.writestr("word/document.xml", doc_xml)

def main():
    print("=== Testing Real Document Extraction ===")
    pdf_path = "test_sample.pdf"
    docx_path = "test_sample.docx"
    pdf_upper_path = "test_sample_upper.PDF"

    try:
        # 1. Test PDF Extraction
        create_sample_pdf(pdf_path)
        pdf_text = extract_text_from_pdf(pdf_path)
        print("PDF Extracted Text:\n", pdf_text.strip())
        assert "Alex Mercer" in pdf_text
        assert "Spring Boot" in pdf_text
        print("PASS: PDF text extraction verified.")

        # 2. Test Case-Insensitive Extension (.PDF)
        create_sample_pdf(pdf_upper_path)
        pdf_upper_text = parse_resume_document(pdf_upper_path)
        assert "Alex Mercer" in pdf_upper_text
        print("PASS: Case-insensitive .PDF extension parsing verified.")

        # 3. Test DOCX Extraction
        create_sample_docx(docx_path)
        docx_text = extract_text_from_docx(docx_path)
        print("DOCX Extracted Text:\n", docx_text.strip())
        assert "Jordan Lee" in docx_text
        assert "Kubernetes" in docx_text
        print("PASS: DOCX text extraction verified.")

        # 4. Test Failure Handling on Invalid / Missing Groq Key
        print("\n=== Testing Failure Handling on Invalid / Missing Groq Credentials ===")
        settings.AI_MOCK_MODE = False
        settings.GROQ_API_KEY = "gsk_invalid_test_key_12345"
        provider = GroqLLMProvider()
        try:
            provider.generate_structured("system prompt", pdf_text, ParsedResumeSchema)
            print("FAIL: Expected LlmProviderError on invalid key, but succeeded.")
        except LlmProviderError as e:
            print(f"PASS: Caught expected LlmProviderError on invalid key: {e}")

    finally:
        # Cleanup
        for path in [pdf_path, docx_path, pdf_upper_path]:
            if os.path.exists(path):
                os.remove(path)

if __name__ == "__main__":
    main()
