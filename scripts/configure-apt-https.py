#!/usr/bin/env python3
"""Use HTTPS for the Ubuntu APT sources *and* their active mirror+file lists.

GitHub-hosted Ubuntu runners may use deb822 ubuntu.sources with
"URIs: mirror+file:/etc/apt/apt-mirrors.txt". Rewriting sources.list alone
does not affect the URLs actually used by apt. This tool follows those
references and converts the listed HTTP mirrors as well.

Only Ubuntu package sources and files explicitly used as mirror lists are
changed; unrelated third-party repositories are left untouched.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

MIRROR_REF = re.compile(r"mirror\+file:(/{1,3}[^\s#;,]+)")
HTTP_URL = re.compile(r"http://[^\s#;,]+")
SOURCE_SUFFIXES = {".list", ".sources"}


def apt_file(root: Path, absolute: str) -> Path:
    """Map an absolute apt path to an alternate fixture root, if supplied."""
    return root / absolute.lstrip("/")


def ubuntu_url(url: str) -> bool:
    """Limit edits to Ubuntu archives, including regional/cloud mirrors."""
    return "ubuntu.com" in url.lower() or "/ubuntu" in url.lower()


def discover(root: Path) -> tuple[list[Path], list[Path]]:
    apt = root / "etc/apt"
    sources = []
    classic = apt / "sources.list"
    if classic.is_file():
        sources.append(classic)
    source_dir = apt / "sources.list.d"
    if source_dir.is_dir():
        sources.extend(
            sorted(p for p in source_dir.iterdir()
                   if p.is_file() and p.suffix in SOURCE_SUFFIXES)
        )

    mirror_files: set[Path] = set()
    # Common locations on GitHub Ubuntu runner images.
    for name in ("apt-mirrors.txt", "mirrors.txt"):
        candidate = apt / name
        if candidate.is_file():
            mirror_files.add(candidate)
    for source in sources:
        text = source.read_text(encoding="utf-8")
        for match in MIRROR_REF.finditer(text):
            referenced = apt_file(root, match.group(1))
            if not referenced.is_file():
                raise FileNotFoundError(
                    f"APT source {source} references missing mirror list: {referenced}"
                )
            mirror_files.add(referenced)
    return sources, sorted(mirror_files)


def rewrite_source(text: str) -> str:
    # Includes deb822 URIs and traditional deb lines, but not other vendors.
    return HTTP_URL.sub(
        lambda match: "https://" + match.group()[7:]
        if ubuntu_url(match.group()) else match.group(),
        text,
    )


def rewrite_mirrors(text: str) -> str:
    # A mirror+file list consists of actual archive URLs, not apt source stanzas.
    return text.replace("http://", "https://")


def configure(root: Path, *, check: bool = False) -> tuple[int, int]:
    sources, mirrors = discover(root)
    if not sources:
        raise RuntimeError("No APT sources found; refusing to report HTTPS success")
    modified = 0
    converted = 0
    for path in [*sources, *mirrors]:
        before = path.read_text(encoding="utf-8")
        after = rewrite_mirrors(before) if path in mirrors else rewrite_source(before)
        changed = before.count("http://") - after.count("http://")
        if changed:
            print(f"{'NEEDS HTTPS' if check else 'HTTPS'}: {path} ({changed} URLs)")
            if not check:
                path.write_text(after, encoding="utf-8")
            modified += 1
            converted += changed
    if check and modified:
        raise RuntimeError(f"{modified} active APT files still use HTTP")
    if not check:
        # Verify the actual files, including mirror+file references, after edits.
        configure(root, check=True)
    print(f"APT HTTPS {'verified' if check else 'configured'}: "
          f"{len(sources)} source files, {len(mirrors)} mirror lists, "
          f"{converted} URL(s) converted")
    return modified, converted


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("/"),
                        help="APT filesystem root (useful for isolated tests)")
    parser.add_argument("--check", action="store_true",
                        help="Verify active Ubuntu sources and mirrors are HTTPS")
    args = parser.parse_args()
    configure(args.root, check=args.check)


if __name__ == "__main__":
    main()
