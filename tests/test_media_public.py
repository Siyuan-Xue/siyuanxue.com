import importlib.util
import io
from email.message import Message
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('media_public', Path(__file__).resolve().parents[1] / 'ops/verify-media.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Response(io.BytesIO):
    status = 200

class PublicMediaTest(unittest.TestCase):
    def test_combined_cache_headers_and_bytes_are_checked(self):
        response = Response(b'image')
        response.headers = Message()
        response.headers['Content-Length'] = '5'
        response.headers['Content-Type'] = 'image/webp'
        response.headers['Cache-Control'] = 'max-age=31536000'
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        digest = module.hashlib.sha256(b'image').hexdigest()
        module.verify_response(response, (digest, 5), 'webp', False)
        response.seek(0)
        with self.assertRaises(ValueError): module.verify_response(response, ('0' * 64, 5), 'webp', False)
        with self.assertRaises(ValueError): module.verify_response(response, (digest, 6), 'webp', True)

if __name__ == '__main__': unittest.main()
