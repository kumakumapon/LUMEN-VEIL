"""Regression tests for the actual apt mirror+file layout on Ubuntu runners."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/configure-apt-https.py"
spec = importlib.util.spec_from_file_location("configure_apt_https", SCRIPT)
apt_https = importlib.util.module_from_spec(spec)
spec.loader.exec_module(apt_https)


class AptHttpsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def test_deb822_mirror_file_is_rewritten_not_only_sources(self):
        sources = self.write(
            "etc/apt/sources.list.d/ubuntu.sources",
            "Types: deb\nURIs: mirror+file:/etc/apt/apt-mirrors.txt\n"
            "Suites: noble noble-updates\nComponents: main universe\n"
            "Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n",
        )
        mirrors = self.write(
            "etc/apt/apt-mirrors.txt",
            "http://azure.archive.ubuntu.com/ubuntu/\n"
            "http://archive.ubuntu.com/ubuntu/\n"
            "https://security.ubuntu.com/ubuntu/\n",
        )
        modified, count = apt_https.configure(self.root)
        self.assertEqual((modified, count), (1, 2))
        self.assertIn("mirror+file:/etc/apt/apt-mirrors.txt", sources.read_text())
        self.assertIn("https://azure.archive.ubuntu.com/ubuntu/", mirrors.read_text())
        self.assertNotIn("http://", mirrors.read_text())
        apt_https.configure(self.root, check=True)

    def test_deb822_direct_uri_and_legacy_list(self):
        direct = self.write(
            "etc/apt/sources.list.d/ubuntu.sources",
            "Types: deb\nURIs: http://archive.ubuntu.com/ubuntu/ "
            "http://security.ubuntu.com/ubuntu/\nSuites: noble\n",
        )
        legacy = self.write(
            "etc/apt/sources.list",
            "deb http://jp.archive.ubuntu.com/ubuntu noble main\n",
        )
        self.assertEqual(apt_https.configure(self.root), (2, 3))
        self.assertEqual(direct.read_text().count("https://"), 2)
        self.assertIn("https://jp.archive.ubuntu.com/ubuntu", legacy.read_text())

    def test_custom_mirror_file_and_third_party_repo(self):
        sources = self.write(
            "etc/apt/sources.list.d/ubuntu.sources",
            "URIs: mirror+file:///etc/apt/custom-active-mirrors.txt\n",
        )
        mirrors = self.write(
            "etc/apt/custom-active-mirrors.txt",
            "http://mirror.example.net/ubuntu/\n",
        )
        other = self.write(
            "etc/apt/sources.list.d/vendor.sources",
            "Types: deb\nURIs: http://packages.example.org/repo\n",
        )
        self.assertEqual(apt_https.configure(self.root), (1, 1))
        self.assertIn("https://mirror.example.net/ubuntu/", mirrors.read_text())
        self.assertIn("mirror+file:///", sources.read_text())
        self.assertIn("http://packages.example.org", other.read_text())

    def test_check_fails_until_active_mirror_is_converted(self):
        self.write(
            "etc/apt/sources.list.d/ubuntu.sources",
            "URIs: mirror+file:/etc/apt/mirrors.txt\n",
        )
        self.write("etc/apt/mirrors.txt", "http://archive.ubuntu.com/ubuntu/\n")
        with self.assertRaisesRegex(RuntimeError, "still use HTTP"):
            apt_https.configure(self.root, check=True)
        apt_https.configure(self.root)
        apt_https.configure(self.root, check=True)

    def test_missing_active_mirror_fails_loudly(self):
        self.write(
            "etc/apt/sources.list.d/ubuntu.sources",
            "URIs: mirror+file:/etc/apt/missing.txt\n",
        )
        with self.assertRaises(FileNotFoundError):
            apt_https.configure(self.root)


if __name__ == "__main__":
    unittest.main()
