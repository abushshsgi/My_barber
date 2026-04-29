"""Small production helpers for HTTP responses."""


class CrossOriginResourcePolicyMiddleware:
    """
    Allow cross-origin <img> / subresource loads from the API host (Railway)
    without Firefox Opaque Response Blocking on media and static files.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        path = request.path
        if path.startswith("/media/") or path.startswith("/static/"):
            response["Cross-Origin-Resource-Policy"] = "cross-origin"
        return response
