import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from 'react-leaflet';
import {
  ArrowLeftRight,
  Car,
  Church,
  Copy,
  ExternalLink,
  Handshake,
  Languages,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  MapPinned,
  Navigation,
  Route,
  ShieldCheck,
  Store,
  TrainFront,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { divIcon, type LatLngExpression } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import 'leaflet/dist/leaflet.css';

import { auth } from '../../firebase';
import {
  getNextGenMissionMap,
  type MissionMapData,
  type MissionMapLocation,
  type MissionMapLocationType,
} from '../../services/nextGenMissionMap';
import GoogleMissionRouteMap from './GoogleMissionRouteMap';

const NEXTGEN_MAP_EMAIL = 'nextgen@montreal.ca';
const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
const DEFAULT_MAP_CENTER: LatLngExpression = [
  45.53,
  -73.7,
];

const LOCATION_VISUALS: Record<
  MissionMapLocationType,
  { color: string; icon: LucideIcon; label: string }
> = {
  church: {
    color: '#2563eb',
    icon: Church,
    label: 'Church',
  },
  evangelism: {
    color: '#16803c',
    icon: Handshake,
    label: 'Evangelism spot',
  },
  servant: {
    color: '#7c3aed',
    icon: UserRound,
    label: 'Servant',
  },
  home: {
    color: '#7c3aed',
    icon: UserRound,
    label: 'Servant',
  },
  transit: {
    color: '#d97706',
    icon: TrainFront,
    label: 'Metro / transit',
  },
  mall: {
    color: '#0f766e',
    icon: Store,
    label: 'Shopping location',
  },
  other: {
    color: '#64748b',
    icon: MapPin,
    label: 'Other',
  },
};

function googleMapsUrl(location: MissionMapLocation) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location.address,
  )}`;
}

function appleMapsUrl(location: MissionMapLocation) {
  const query = encodeURIComponent(location.name);
  const address = encodeURIComponent(location.address);
  return `https://maps.apple.com/?q=${query}&address=${address}`;
}

function locationTypeLabel(type: MissionMapLocationType) {
  return LOCATION_VISUALS[type].label;
}

function createLocationMarkerIcon(
  location: MissionMapLocation,
  selected: boolean,
) {
  const visual = LOCATION_VISUALS[location.type];
  const Icon = visual.icon;
  const size = selected ? 44 : 38;
  const iconMarkup = renderToStaticMarkup(
    <Icon color="white" size={selected ? 23 : 20} strokeWidth={2.5} />,
  );

  return divIcon({
    className: '',
    html: `<div style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;background:${visual.color};border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,.3)">${iconMarkup}</div>`,
    iconAnchor: [size / 2, size],
    iconSize: [size, size],
    popupAnchor: [0, -size + 4],
  });
}

function LocationTypeBadge({
  type,
  size = 18,
}: {
  type: MissionMapLocationType;
  size?: number;
}) {
  const visual = LOCATION_VISUALS[type];
  const Icon = visual.icon;

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-white"
      style={{
        backgroundColor: visual.color,
        height: size + 14,
        width: size + 14,
      }}
    >
      <Icon size={size} strokeWidth={2.5} />
    </span>
  );
}

function googleDirectionsUrl(
  from: MissionMapLocation,
  to: MissionMapLocation,
) {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&travelmode=driving`;
}

export default function MontrealMissionTripMap({
  onClose,
}: {
  onClose: () => void;
}) {
  const [firebaseUser, authLoading] = useAuthState(auth);
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [mapData, setMapData] =
    useState<MissionMapData | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [selectedLocationId, setSelectedLocationId] =
    useState<string | null>(null);
  const [copiedLocationId, setCopiedLocationId] =
    useState<string | null>(null);
  const [routeFromId, setRouteFromId] = useState('');
  const [routeToId, setRouteToId] = useState('');

  const normalizedUserEmail =
    firebaseUser?.email?.trim().toLowerCase() || '';
  const isMapAccount = Boolean(normalizedUserEmail);

  useEffect(() => {
    if (!firebaseUser || !isMapAccount) {
      return undefined;
    }

    const controller = new AbortController();
    void Promise.resolve()
      .then(() => {
        setMapLoading(true);
        setMapError('');
        return getNextGenMissionMap(
          firebaseUser,
          controller.signal,
        );
      })
      .then(data => {
        setMapData(data);
        setSelectedLocationId(
          currentId =>
            currentId || data.locations[0]?.id || null,
        );
        setRouteFromId(
          currentId =>
            currentId || data.locations[0]?.id || '',
        );
      })
      .catch(error => {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return;
        }

        setMapData(null);
        setMapError(
          error instanceof Error
            ? error.message
            : 'The mission map could not be loaded.',
        );
      })
      .finally(() => setMapLoading(false));

    return () => controller.abort();
  }, [firebaseUser, isMapAccount]);

  const locationsById = useMemo(
    () =>
      new Map(
        (mapData?.locations || []).map(location => [
          location.id,
          location,
        ]),
      ),
    [mapData],
  );

  const selectedLocation = selectedLocationId
    ? locationsById.get(selectedLocationId) || null
    : null;

  const legendTypes = useMemo(
    () =>
      Array.from(
        new Set(
          (mapData?.locations || []).map(
            location => location.type,
          ),
        ),
      ),
    [mapData],
  );

  const plannedRoute = useMemo(() => {
    if (!routeFromId || !routeToId) {
      return null;
    }

    const from = locationsById.get(routeFromId);
    const to = locationsById.get(routeToId);

    if (!from || !to || from.id === to.id) {
      return null;
    }

    return { from, to };
  }, [locationsById, routeFromId, routeToId]);

  const mapCenter = useMemo<LatLngExpression>(() => {
    if (!mapData?.locations.length) {
      return DEFAULT_MAP_CENTER;
    }

    const totals = mapData.locations.reduce(
      (result, location) => ({
        latitude: result.latitude + location.latitude,
        longitude: result.longitude + location.longitude,
      }),
      { latitude: 0, longitude: 0 },
    );

    return [
      totals.latitude / mapData.locations.length,
      totals.longitude / mapData.locations.length,
    ];
  }, [mapData]);

  const handleSignIn = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setLoginError('');
    setIsSigningIn(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        NEXTGEN_MAP_EMAIL,
        password,
      );
      setPassword('');
    } catch {
      setLoginError(
        'The Montréal Mission Trip email or password is incorrect.',
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCopyAddress = async (
    location: MissionMapLocation,
  ) => {
    try {
      await navigator.clipboard.writeText(location.address);
      setCopiedLocationId(location.id);
      window.setTimeout(() => {
        setCopiedLocationId(currentId =>
          currentId === location.id ? null : currentId,
        );
      }, 1800);
    } catch {
      setMapError('The address could not be copied.');
    }
  };

  const renderLocationActions = (
    location: MissionMapLocation,
    compact = false,
  ) => (
    <div
      className={`grid gap-2 ${
        compact ? 'grid-cols-1' : 'sm:grid-cols-3'
      }`}
    >
      <button
        type="button"
        onClick={() => handleCopyAddress(location)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:border-[#8b1e1e] hover:text-[#8b1e1e]"
      >
        <Copy size={15} />
        {copiedLocationId === location.id
          ? 'Copied'
          : 'Copy address'}
      </button>
      <a
        href={appleMapsUrl(location)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-sm font-bold text-white hover:bg-gray-800"
      >
        <Navigation size={15} />
        Apple Maps
      </a>
      <a
        href={googleMapsUrl(location)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16803c] px-3 py-2 text-sm font-bold text-white hover:bg-[#11652f]"
      >
        <ExternalLink size={15} />
        Google Maps
      </a>
    </div>
  );

  return (
    <section className="max-w-6xl mx-auto mt-8 overflow-hidden rounded-[30px] border border-[rgba(139,30,30,0.12)] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
      <header className="flex items-start justify-between gap-4 bg-[#3f0f0f] p-6 text-white">
        <div className="flex items-start gap-3">
          <MapPinned size={26} className="mt-0.5 shrink-0" />
          <div>
            <h2 className="text-2xl font-bold">
              Montréal Mission Trip Map
            </h2>
            <p className="mt-1 text-sm text-white/75">
              Private trip locations, simplified routes, and navigation.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close mission map"
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <X size={22} />
        </button>
      </header>

      {authLoading ? (
        <div className="flex min-h-[320px] items-center justify-center gap-3 text-gray-500">
          <Loader2 size={22} className="animate-spin" />
          Checking Firebase login...
        </div>
      ) : firebaseUser && !isMapAccount ? (
        <div className="mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-amber-700">
            <ShieldCheck size={29} />
          </div>
          <h3 className="text-2xl font-bold text-[#641414]">
            Different Firebase account detected
          </h3>
          <p className="mt-3 text-gray-600">
            You are signed in as{' '}
            <strong>{firebaseUser.email || 'an unknown account'}</strong>.
            Sign out before using the dedicated mission-trip login.
          </p>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#8b1e1e] px-6 py-3 font-bold text-white hover:bg-[#641414]"
          >
            <LogOut size={17} />
            Sign out and switch account
          </button>
        </div>
      ) : !firebaseUser ? (
        <form
          onSubmit={handleSignIn}
          className="mx-auto max-w-xl space-y-5 p-8"
        >
          <div className="text-center">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#f8eeee] text-[#8b1e1e]">
              <LockKeyhole size={29} />
            </div>
            <h3 className="text-2xl font-bold text-[#641414]">
              Mission Trip Login
            </h3>
            <p className="mt-2 text-gray-500">
              This map requires its dedicated Firebase account.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Email
            </span>
            <input
              type="email"
              value={NEXTGEN_MAP_EMAIL}
              readOnly
              className="w-full rounded-2xl border border-gray-100 bg-stone-100 px-5 py-4 font-bold text-gray-600 outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 outline-none focus:border-[#8b1e1e] focus:ring-2 focus:ring-[#8b1e1e]/15"
            />
          </label>

          {loginError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSigningIn}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8b1e1e] px-6 py-4 font-bold text-white shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] disabled:opacity-60"
          >
            {isSigningIn ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LockKeyhole size={18} />
            )}
            {isSigningIn ? 'Signing in...' : 'Open Mission Map'}
          </button>
        </form>
      ) : mapLoading ? (
        <div className="flex min-h-[420px] items-center justify-center gap-3 text-gray-500">
          <Loader2 size={22} className="animate-spin" />
          Loading protected trip locations...
        </div>
      ) : mapError || !mapData ? (
        <div className="mx-auto max-w-2xl p-8 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-700">
            {mapError || 'The mission map is unavailable.'}
          </div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-bold text-gray-700 hover:border-[#8b1e1e] hover:text-[#8b1e1e]"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      ) : (
        <div className="p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck size={19} />
              Authorized as {firebaseUser.email}
            </div>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-green-900 shadow-sm hover:bg-green-100"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="relative overflow-hidden rounded-[24px] border border-gray-200 bg-stone-100 shadow-inner">
              {plannedRoute && GOOGLE_MAPS_API_KEY ? (
                <GoogleMissionRouteMap
                  apiKey={GOOGLE_MAPS_API_KEY}
                  from={plannedRoute.from}
                  to={plannedRoute.to}
                />
              ) : (
                <>
                  <MapContainer
                    center={mapCenter}
                    zoom={11}
                    minZoom={9}
                    maxZoom={17}
                    scrollWheelZoom
                    className="h-[560px] w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {mapData.locations.map(location => (
                      <Marker
                        key={location.id}
                        position={[
                          location.latitude,
                          location.longitude,
                        ]}
                        icon={createLocationMarkerIcon(
                          location,
                          selectedLocationId === location.id,
                        )}
                        eventHandlers={{
                          click: () =>
                            setSelectedLocationId(location.id),
                        }}
                      >
                        <Popup minWidth={230}>
                          <div className="space-y-3">
                            <div>
                              <strong className="text-base">
                                {location.name}
                              </strong>
                              <p className="mt-1 text-sm text-gray-600">
                                {location.address}
                              </p>
                            </div>
                            {renderLocationActions(location, true)}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>

                  <div className="pointer-events-none absolute right-3 top-3 z-[1000] max-w-[190px] rounded-2xl border border-white/70 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                      Map legend
                    </p>
                    <div className="space-y-2">
                      {legendTypes.map(type => (
                        <div
                          key={type}
                          className="flex items-center gap-2 text-xs font-bold text-gray-700"
                        >
                          <LocationTypeBadge type={type} size={14} />
                          <span>{locationTypeLabel(type)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
                <div className="mb-4 flex items-center gap-2 text-blue-900">
                  <Route size={20} />
                  <h3 className="font-bold">Join two locations</h3>
                </div>

                <div className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-blue-700/70">
                      From
                    </span>
                    <select
                      value={routeFromId}
                      onChange={event =>
                        setRouteFromId(event.target.value)
                      }
                      className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-500"
                    >
                      {mapData.locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setRouteFromId(routeToId);
                      setRouteToId(routeFromId);
                    }}
                    disabled={!routeToId}
                    aria-label="Swap route locations"
                    className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-blue-100 bg-white text-blue-800 shadow-sm hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeftRight size={17} />
                  </button>

                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-blue-700/70">
                      To
                    </span>
                    <select
                      value={routeToId}
                      onChange={event =>
                        setRouteToId(event.target.value)
                      }
                      className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-500"
                    >
                      <option value="">Choose a destination</option>
                      {mapData.locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {routeFromId && routeToId && !plannedRoute && (
                  <p className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-amber-800">
                    Choose two different locations.
                  </p>
                )}

                {plannedRoute && !GOOGLE_MAPS_API_KEY && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                    Google routing is ready in the app, but the deployment
                    still needs the website-restricted{' '}
                    <code>VITE_GOOGLE_MAPS_API_KEY</code> environment
                    variable.
                  </div>
                )}

                {plannedRoute && GOOGLE_MAPS_API_KEY && (
                  <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm font-bold text-blue-950">
                      The map now shows Google’s road path, distance,
                      and current traffic-aware ETA.
                    </p>
                    <a
                      href={googleDirectionsUrl(
                        plannedRoute.from,
                        plannedRoute.to,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      <Navigation size={16} />
                      Open live route in Google Maps
                    </a>
                    <button
                      type="button"
                      onClick={() => setRouteToId('')}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-50"
                    >
                      Return to all locations
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-gray-100 bg-stone-50 p-5">
                <div className="mb-4 flex items-center gap-2 text-[#641414]">
                  <MapPinned size={20} />
                  <h3 className="font-bold">Mission locations</h3>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {mapData.locations.map(location => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setSelectedLocationId(location.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
                        selectedLocationId === location.id
                          ? 'border-[#8b1e1e] bg-white shadow-sm'
                          : 'border-transparent bg-transparent hover:bg-white'
                      }`}
                    >
                      <LocationTypeBadge
                        type={location.type}
                        size={15}
                      />
                      <span>
                        <span className="block font-bold text-gray-900">
                          {location.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          {locationTypeLabel(location.type)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedLocation && (
                <div className="rounded-[24px] border border-[rgba(139,30,30,0.12)] bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <LocationTypeBadge
                      type={selectedLocation.type}
                      size={18}
                    />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {locationTypeLabel(selectedLocation.type)}
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-[#641414]">
                        {selectedLocation.name}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {selectedLocation.address}
                      </p>
                    </div>
                  </div>

                  {selectedLocation.notes && (
                    <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm leading-relaxed text-gray-600">
                      {selectedLocation.notes}
                    </p>
                  )}

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    {selectedLocation.languages.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Languages size={16} className="mt-0.5 shrink-0" />
                        <span>
                          {selectedLocation.languages.join(', ')}
                        </span>
                      </div>
                    )}
                    {selectedLocation.parking && (
                      <div className="flex items-start gap-2">
                        <Car size={16} className="mt-0.5 shrink-0" />
                        <span>{selectedLocation.parking}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    {renderLocationActions(selectedLocation)}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                <Route size={18} className="shrink-0" />
                Google traffic changes continuously, so displayed routes
                and ETAs can update between requests.
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
