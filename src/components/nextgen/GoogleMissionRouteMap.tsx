import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { Loader2, Route } from 'lucide-react';

import type { MissionMapLocation } from '../../services/nextGenMissionMap';

let configuredApiKey: string | null = null;

function configureGoogleMaps(apiKey: string) {
  if (configuredApiKey) return;

  setOptions({
    key: apiKey,
    v: 'weekly',
    language: 'en',
    region: 'CA',
    authReferrerPolicy: 'origin',
  });
  configuredApiKey = apiKey;
}

function fallbackDistance(distanceMeters?: number) {
  if (!distanceMeters) return 'Distance unavailable';
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function fallbackDuration(durationMillis?: number | null) {
  if (!durationMillis) return 'ETA unavailable';
  return `${Math.max(1, Math.round(durationMillis / 60000))} min`;
}

export default function GoogleMissionRouteMap({
  apiKey,
  from,
  to,
}: {
  apiKey: string;
  from: MissionMapLocation;
  to: MissionMapLocation;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const [routeSummary, setRouteSummary] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    if (!mapElementRef.current) return undefined;

    let cancelled = false;
    let map: google.maps.Map | null = null;
    let polylines: google.maps.Polyline[] = [];

    setRouteSummary(null);
    setRouteError('');
    configureGoogleMaps(apiKey);

    const loadRoute = async () => {
      try {
        const [mapsLibrary, routesLibrary, coreLibrary] =
          await Promise.all([
            importLibrary('maps'),
            importLibrary('routes'),
            importLibrary('core'),
          ]);

        if (cancelled || !mapElementRef.current) return;

        map = new mapsLibrary.Map(mapElementRef.current, {
          center: {
            lat: (from.latitude + to.latitude) / 2,
            lng: (from.longitude + to.longitude) / 2,
          },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          clickableIcons: false,
        });

        const { routes } =
          await routesLibrary.Route.computeRoutes({
            origin: {
              lat: from.latitude,
              lng: from.longitude,
            },
            destination: {
              lat: to.latitude,
              lng: to.longitude,
            },
            travelMode: 'DRIVING',
            routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
            trafficModel: 'bestguess',
            language: 'en-CA',
            region: 'CA',
            units: coreLibrary.UnitSystem.METRIC,
            fields: [
              'path',
              'distanceMeters',
              'durationMillis',
              'staticDurationMillis',
              'localizedValues',
            ],
          });

        if (cancelled) return;

        const route = routes?.[0];

        if (!route?.path?.length) {
          throw new Error('Google returned no driving route.');
        }

        polylines = route.createPolylines({
          polylineOptions: {
            strokeColor: '#2563eb',
            strokeOpacity: 0.92,
            strokeWeight: 7,
          },
        });
        polylines.forEach(polyline => polyline.setMap(map));

        const bounds = new coreLibrary.LatLngBounds();
        route.path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds, 56);

        setRouteSummary({
          distance:
            route.localizedValues?.distance ||
            fallbackDistance(route.distanceMeters),
          duration:
            route.localizedValues?.duration ||
            fallbackDuration(route.durationMillis),
        });
      } catch (error) {
        if (cancelled) return;

        console.error('Google mission route failed:', error);
        setRouteError(
          'Google could not calculate this route. Check that Maps JavaScript API, Routes API, billing, and website restrictions are configured for this domain.',
        );
      }
    };

    void loadRoute();

    return () => {
      cancelled = true;
      polylines.forEach(polyline => polyline.setMap(null));
      if (map) google.maps.event.clearInstanceListeners(map);
    };
  }, [apiKey, from, to]);

  return (
    <div className="relative h-[560px] w-full bg-stone-100">
      <div ref={mapElementRef} className="h-full w-full" />

      <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-2xl border border-white/70 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-700 text-white">
            <Route size={18} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
              Google traffic-aware route
            </p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {from.name} → {to.name}
            </p>
            {!routeSummary && !routeError && (
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={15} className="animate-spin" />
                Calculating with Google Maps…
              </p>
            )}
            {routeSummary && (
              <p className="mt-2 text-lg font-bold text-blue-950">
                {routeSummary.distance} · {routeSummary.duration}
              </p>
            )}
          </div>
        </div>

        {routeError && (
          <p className="mt-3 max-w-xl rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {routeError}
          </p>
        )}
      </div>
    </div>
  );
}
