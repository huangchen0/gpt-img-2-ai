from pathlib import Path
import shutil
import subprocess


ROOT_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT_DIR / "public"
BRAND_DIR = PUBLIC_DIR / "brand"
TMP_DIR = ROOT_DIR / ".tmp-brand"

LOGO_SOURCE = BRAND_DIR / "logo-source.svg"
PREVIEW_SOURCE = BRAND_DIR / "preview-source.svg"


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def ensure_tools() -> None:
    for tool in ("sips", "cwebp", "swift"):
        if shutil.which(tool) is None:
            raise RuntimeError(f"Required tool not found: {tool}")


def render_png(source: Path, target: Path, width: int, height: int) -> None:
    run(
        "sips",
        "-z",
        str(height),
        str(width),
        "-s",
        "format",
        "png",
        str(source),
        "--out",
        str(target),
    )


def render_webp(source: Path, target: Path) -> None:
    run("cwebp", "-quiet", "-q", "92", str(source), "-o", str(target))


def render_favicon(source: Path, target: Path) -> None:
    favicon_png = TMP_DIR / "favicon-256.png"
    render_png(source, favicon_png, 256, 256)
    run("sips", "-s", "format", "ico", str(favicon_png), "--out", str(target))


def process_logo() -> None:
    logo_png = PUBLIC_DIR / "logo.png"
    logo_webp = PUBLIC_DIR / "logo.webp"
    favicon_ico = PUBLIC_DIR / "favicon.ico"
    apple_touch_icon = PUBLIC_DIR / "apple-touch-icon.png"

    render_png(LOGO_SOURCE, logo_png, 512, 512)
    render_webp(logo_png, logo_webp)
    render_favicon(logo_png, favicon_ico)
    render_png(logo_png, apple_touch_icon, 180, 180)


def process_preview() -> None:
    preview_png = PUBLIC_DIR / "preview.png"
    preview_webp = PUBLIC_DIR / "preview.webp"

    render_png(PREVIEW_SOURCE, preview_png, 1200, 630)
    render_webp(preview_png, preview_webp)

    shutil.copy2(preview_png, ROOT_DIR / "preview.png")
    shutil.copy2(preview_webp, ROOT_DIR / "preview.webp")


if __name__ == "__main__":
    ensure_tools()
    TMP_DIR.mkdir(exist_ok=True)

    process_logo()
    process_preview()

    print("Brand assets generated from in-repo sources.")
