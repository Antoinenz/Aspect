import { useEffect, useMemo, type ReactElement } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useConnectionStore } from '../store/connectionStore.js';
import { peoplePlaces, type Place } from './peoplePlaces.js';
import { SQUIRCLE } from '../ui/tokens.js';

/** Builds a marker icon — an avatar bubble when a picture exists, else a dot. */
function placeIcon(place: Place): L.DivIcon {
  const inner = place.picture
    ? `<img src="${place.picture}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
    : `<span style="font-weight:700;font-size:13px;color:#15161a">${place.name.charAt(0).toUpperCase()}</span>`;
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#f6f7f9;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;overflow:hidden">${inner}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

/** Imperatively fits the map to the markers whenever they change. */
function FitBounds({ places }: { places: Place[] }): null {
  const map = useMap();
  useEffect(() => {
    if (places.length === 0) return;
    if (places.length === 1) {
      const only = places[0]!;
      map.setView([only.lat, only.lng], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng])), { padding: [48, 48] });
  }, [map, places]);
  return null;
}

export function MapPage(): ReactElement {
  const entities = useConnectionStore((s) => s.entities);
  const registry = useConnectionStore((s) => s.registry);
  const places = useMemo(() => peoplePlaces(entities, registry), [entities, registry]);

  return (
    <div>
      <h1 className="m-0 mb-1 text-[26px] font-extrabold tracking-[-0.5px]">Map</h1>
      <p className="m-0 mb-5 text-[13px] font-medium text-[var(--color-muted)]">
        {places.length > 0
          ? `${places.length} ${places.length === 1 ? 'person' : 'people'} located`
          : 'Where everyone is'}
      </p>

      {places.length === 0 ? (
        <div
          className="flex min-h-[40vh] items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[15px] text-[var(--color-muted)] backdrop-blur-[var(--blur-frost)]"
          style={{ borderRadius: '18px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties}
        >
          No one with location sharing yet. Add a person or device tracker with GPS in Home Assistant.
        </div>
      ) : (
        <div
          className="overflow-hidden border border-[var(--color-border)]"
          style={{ height: '70vh', borderRadius: '18px', cornerShape: `superellipse(${SQUIRCLE})` } as React.CSSProperties}
        >
          <MapContainer
            center={[places[0]!.lat, places[0]!.lng]}
            zoom={13}
            scrollWheelZoom
            style={{ height: '100%', width: '100%', background: 'var(--color-surface)' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {places.map((place) => (
              <Marker key={place.entityId} position={[place.lat, place.lng]} icon={placeIcon(place)}>
                <Popup>{place.name}</Popup>
              </Marker>
            ))}
            <FitBounds places={places} />
          </MapContainer>
        </div>
      )}
    </div>
  );
}
