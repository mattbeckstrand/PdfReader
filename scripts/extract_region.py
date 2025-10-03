#!/usr/bin/env python3
import base64
import json
import os
import sys
from typing import Any, Dict

try:
    import fitz  # PyMuPDF
except Exception as e:
    print(json.dumps({"ok": False, "error": f"PyMuPDF missing: {e}"}))
    sys.exit(0)

def normalize_text(t: str) -> str:
    return " ".join(t.split())

def contains_math_like(text: str) -> bool:
    if not text:
        return True
    math_chars = set("∑∫√≤≥≈≠∞π·×÷±→←⇔^_{}|$%#→←≥≤≈≃≅≡⊂⊃⊆⊇∈∉∧∨∩∪⊥⟂⇒∀∃∴∵αβγδθλμνξρστωϕφψΩ"
                    "=+−*/^_()[]{}<>")
    symbols = sum(1 for c in text if c in math_chars)
    alnum = sum(1 for c in text if c.isalnum())
    return symbols >= 3 or (alnum and symbols / max(1, len(text)) > 0.15)

def extract_text(pdf_path: str, page_number: int, rect: fitz.Rect) -> str:
    with fitz.open(pdf_path) as doc:
        if page_number < 1 or page_number > len(doc):
            return ""
        page = doc[page_number - 1]
        return page.get_text("text", clip=rect) or ""

def render_region_png(pdf_path: str, page_number: int, rect: fitz.Rect, scale: float = 2.0) -> bytes:
    with fitz.open(pdf_path) as doc:
        page = doc[page_number - 1]
        m = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=m, clip=rect, alpha=False)
        return pix.tobytes("png")

def ocr_mathpix(png_bytes: bytes) -> Dict[str, Any]:
    app_id = os.getenv("MATHPIX_APP_ID")
    app_key = os.getenv("MATHPIX_APP_KEY")
    if not app_id or not app_key:
        return {"ok": False, "error": "MathPix credentials missing"}
    try:
        import requests
        img_b64 = base64.b64encode(png_bytes).decode("ascii")
        payload = {
            "src": f"data:image/png;base64,{img_b64}",
            "formats": ["text", "latex_styled"],
            "rm_spaces": True,
        }
        r = requests.post(
            "https://api.mathpix.com/v3/text",
            json=payload,
            headers={"app_id": app_id, "app_key": app_key},
            timeout=30,
        )
        if r.status_code != 200:
            return {"ok": False, "error": f"MathPix HTTP {r.status_code}"}
        data = r.json()
        text = data.get("text", "")
        latex_blocks = data.get("latex_styled") or []
        latex = "\n\n".join(block.get("latex", "") for block in latex_blocks)
        return {"ok": True, "text": text, "latex": latex, "source": "ocr-mathpix"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def ocr_latexocr(png_bytes: bytes) -> Dict[str, Any]:
    import subprocess
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(png_bytes)
        tmp = f.name
    try:
        # Try latexocr (pix2tex CLI). Keep minimal flags.
        proc = subprocess.run(["latexocr", tmp], capture_output=True, text=True, timeout=60)
        if proc.returncode == 0:
            return {"ok": True, "text": "", "latex": proc.stdout.strip(), "source": "ocr-latexocr"}
        # Fallback to pix2tex CLI name if available
        proc = subprocess.run(["pix2tex", tmp], capture_output=True, text=True, timeout=60)
        if proc.returncode == 0:
            return {"ok": True, "text": "", "latex": proc.stdout.strip(), "source": "ocr-pix2tex"}
        return {"ok": False, "error": proc.stderr.strip() or "latexocr/pix2tex failed"}
    except Exception as e:
        return {"ok": False, "error": str(e)}
    finally:
        try:
            os.unlink(tmp)
        except Exception:
            pass

def main() -> None:
    try:
        args = json.loads(sys.stdin.read()) if not sys.argv[1:] else {
            "pdf_path": sys.argv[1],
            "page_number": int(sys.argv[2]),
            "x": float(sys.argv[3]),
            "y": float(sys.argv[4]),
            "width": float(sys.argv[5]),
            "height": float(sys.argv[6]),
        }
        pdf_path = args["pdf_path"]
        page_number = int(args["page_number"])
        rect = fitz.Rect(args["x"], args["y"], args["x"] + args["width"], args["y"] + args["height"])

        raw = normalize_text(extract_text(pdf_path, page_number, rect))
        if raw and not contains_math_like(raw):
            print(json.dumps({"ok": True, "text": raw, "latex": "", "source": "smart"}))
            return

        # Try OCR only if we have the tools available
        png = render_region_png(pdf_path, page_number, rect)
        res = ocr_mathpix(png)

        # Log MathPix result for debugging
        if not res.get("ok"):
            # Don't try latexocr as fallback - it's not installed
            # Just use text if we have it
            if raw:
                print(json.dumps({"ok": True, "text": raw, "latex": "", "source": "text-fallback"}))
                return
            # No text and MathPix failed
            print(json.dumps({"ok": False, "error": f"MathPix failed: {res.get('error', 'Unknown error')}"}))
            return

        # MathPix succeeded - return the results
        text = normalize_text(res.get("text", ""))
        latex = res.get("latex", "")
        print(json.dumps({"ok": True, "text": text, "latex": latex, "source": res.get("source", "ocr")}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))

if __name__ == "__main__":
    main()


