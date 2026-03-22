from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


BUILD_DIR = Path(__file__).resolve().parent / "build"


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BUILD_DIR), **kwargs)

    def do_GET(self):
        requested = self.translate_path(self.path)
        if self.path.startswith("/static/") or Path(requested).exists():
            return super().do_GET()

        self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 3000), SpaHandler)
    print("Serving Pixelgram frontend at http://127.0.0.1:3000")
    server.serve_forever()
