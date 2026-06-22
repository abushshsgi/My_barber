from salons.mock.cover_urls import is_mock_salon, mock_gallery_urls, resolve_salon_cover_url


def serialize_mock_gallery_images(salon) -> list[dict]:
    if not is_mock_salon(salon) or not salon.slug:
        return []
    return [
        {"id": -(i + 1), "image": url, "sort_order": i}
        for i, url in enumerate(mock_gallery_urls(salon.slug))
    ]
