type Props = {
  latitude: number | null;
  longitude: number | null;
};

export const DEFAULT_MAP_REGION = {
  latitude: 41.3111,
  longitude: 69.2797,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

/**
 * Web — haqiqiy DOM iframe (RN View + createElement balandlik bermas edi).
 * Google Maps embed; ochilmasa OpenStreetMap zaxira.
 */
export function OnboardingMap({ latitude, longitude }: Props) {
  const lat = latitude ?? DEFAULT_MAP_REGION.latitude;
  const lng = longitude ?? DEFAULT_MAP_REGION.longitude;
  const googleSrc = `https://maps.google.com/maps?q=${lat}%2C${lng}&z=15&hl=uz&output=embed`;
  const osmDelta = 0.02;
  const osmSrc =
    `https://www.openstreetmap.org/export/embed.html?bbox=` +
    `${lng - osmDelta}%2C${lat - osmDelta * 0.7}%2C${lng + osmDelta}%2C${lat + osmDelta * 0.7}` +
    `&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#E8EEF4",
      }}
    >
      <iframe
        title="Google Maps"
        src={googleSrc}
        style={{ border: 0, width: "100%", height: "100%", display: "block" }}
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        onError={(e) => {
          const el = e.currentTarget;
          if (el.src !== osmSrc) el.src = osmSrc;
        }}
      />
    </div>
  );
}
