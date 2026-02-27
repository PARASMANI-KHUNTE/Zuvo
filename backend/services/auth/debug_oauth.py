
import subprocess
import re
from urllib.parse import urlparse, parse_qs

def get_google_redirect():
    try:
        # Run curl and capture headers
        # Use -i to put headers in stdout, and -v to see connection details in stderr
        result = subprocess.run(
            ['curl.exe', '-is', 'http://localhost:5000/api/v1/auth/google'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout = result.stdout
        
        # Find Location header in stdout
        match = re.search(r'location: (https://accounts.google.com/o/oauth2/v2/auth\S+)', stdout, re.IGNORECASE)
        if not match:
            print("Location header not found in stdout.")
            print("Full stdout extract:")
            print(stdout[:500])
            return

        location = match.group(1).strip()
        print(f"Full Google Auth URL: {location}")
        
        # Parse URL parameters
        parsed_url = urlparse(location)
        params = parse_qs(parsed_url.query)
        
        redirect_uri = params.get('redirect_uri', [''])[0]
        print(f"\nEXTRACTED redirect_uri: {redirect_uri}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_google_redirect()
