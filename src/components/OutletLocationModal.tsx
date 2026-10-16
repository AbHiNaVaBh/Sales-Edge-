import React, { useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import {
  X,
  MapPin,
  Navigation,
  Phone,
  Store,
  Warehouse,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Compass,
  Layers,
  Copy,
  Check,
  Clock,
  Award,
  ArrowRight,
  Route,
} from 'lucide-react';
import type { Customer } from '../types/index.ts';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyAn0qvMjx8YaVqR9ALjk-b752kWGHBb7Gk';

interface OutletLocationModalProps {
  outlet: Customer;
  allOutlets?: Customer[];
  onClose: () => void;
  onEnterStore?: (outlet: Customer) => void;
  onTakeOrder?: (outlet: Customer) => void;
}

export const OutletLocationModal: React.FC<OutletLocationModalProps> = ({
  outlet,
  allOutlets = [],
  onClose,
  onEnterStore,
  onTakeOrder,
}) => {
  const [activeOutlet, setActiveOutlet] = useState<Customer>(outlet);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [showAllMarkers, setShowAllMarkers] = useState<boolean>(allOutlets.length > 1);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(outlet.id);

  const coords = activeOutlet.locationCoords || { lat: 28.6189, lng: 77.214 };

  const handleCopyCoords = () => {
    const coordStr = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    navigator.clipboard.writeText(coordStr);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  const handleOpenGoogleMapsDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&destination_place_id=&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const isWholesale = activeOutlet.type === 'wholesaler';

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/50">
                  GPS Outlet Geolocation
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Geofence: {activeOutlet.geofenceDistanceMeters}m</span>
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2 mt-0.5">
                <span>{activeOutlet.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-normal">
                  {activeOutlet.routeBeat}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {allOutlets.length > 1 && (
              <button
                type="button"
                onClick={() => setShowAllMarkers(!showAllMarkers)}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  showAllMarkers
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>{showAllMarkers ? 'All Beat Outlets (On)' : 'Show Beat Route'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close GPS Map"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Viewport Area */}
        <div className="relative w-full h-[380px] sm:h-[440px] md:h-[480px] bg-slate-100 flex-1">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
            <Map
              internalUsageAttributionIds={['gmp_git_agentskills_v1']}
              mapId="DEMO_MAP_ID"
              defaultCenter={coords}
              center={coords}
              defaultZoom={16}
              zoom={16}
              mapTypeId={mapType}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
            >
              {/* Primary Outlet Marker */}
              <AdvancedMarker
                position={coords}
                title={activeOutlet.name}
                onClick={() => setSelectedMarkerId(activeOutlet.id)}
              >
                <div className="relative flex flex-col items-center cursor-pointer group">
                  {/* Pulsing geofence radar */}
                  <div className="absolute -inset-2 bg-emerald-500/30 rounded-full animate-ping pointer-events-none"></div>
                  
                  {/* Pin bubble */}
                  <div className="relative z-10 px-2.5 py-1 bg-slate-900 text-white rounded-full text-[11px] font-bold shadow-lg border-2 border-emerald-400 flex items-center gap-1.5 whitespace-nowrap">
                    {isWholesale ? (
                      <Warehouse className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    ) : (
                      <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span>{activeOutlet.name}</span>
                  </div>
                  
                  {/* Pin stem */}
                  <div className="w-0.5 h-3 bg-emerald-500"></div>
                  <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full border-2 border-white shadow-xs"></div>
                </div>
              </AdvancedMarker>

              {/* Other Beat Outlets on Map if Beat Route enabled */}
              {showAllMarkers &&
                allOutlets
                  .filter((o) => o.id !== activeOutlet.id && o.locationCoords)
                  .map((other) => {
                    const otherCoords = other.locationCoords!;
                    const isOtherVisited = other.visitStatus === 'visited';
                    const isOtherInStore = other.visitStatus === 'in_store';
                    
                    const pinColor = isOtherVisited
                      ? '#10b981' // emerald
                      : isOtherInStore
                      ? '#3b82f6' // blue
                      : '#f59e0b'; // amber

                    return (
                      <AdvancedMarker
                        key={other.id}
                        position={otherCoords}
                        title={other.name}
                        onClick={() => {
                          setActiveOutlet(other);
                          setSelectedMarkerId(other.id);
                        }}
                      >
                        <Pin
                          background={pinColor}
                          borderColor="#ffffff"
                          glyphColor="#ffffff"
                          scale={0.9}
                        />
                      </AdvancedMarker>
                    );
                  })}

              {/* InfoWindow for Selected Marker */}
              {selectedMarkerId && (
                <InfoWindow
                  position={coords}
                  onCloseClick={() => setSelectedMarkerId(null)}
                >
                  <div className="p-1 max-w-xs text-xs text-slate-800">
                    <div className="font-bold text-sm text-slate-900">{activeOutlet.name}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{activeOutlet.address}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200">
                      <span className="font-semibold text-emerald-700">
                        {activeOutlet.geofenceDistanceMeters}m away
                      </span>
                      <span className="font-bold text-slate-700">{activeOutlet.hulClubTier}</span>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>

          {/* Floating Map Controls Overlay (Satellite / Roadmap Toggle & Coords) */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
            <div className="bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setMapType('roadmap')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  mapType === 'roadmap'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Street Map
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  mapType === 'satellite'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Satellite (Aerial)
              </button>
            </div>
          </div>

          {/* Geofence Radar Badge Overlay */}
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-slate-900/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 text-xs flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-semibold">GPS Lock: {activeOutlet.geofenceDistanceMeters}m away</span>
            </div>
          </div>
        </div>

        {/* Bottom Readable Outlet Details & Navigation Controls */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            
            {/* Column 1: Store & Owner Contact */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Outlet & Proprietor
              </span>
              <div className="font-extrabold text-slate-900 text-sm">
                {activeOutlet.name}
              </div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <span>Proprietor: {activeOutlet.ownerName}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={`tel:${activeOutlet.phone}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold text-[11px] transition-colors"
                >
                  <Phone className="w-3 h-3 text-emerald-700" />
                  <span>Call {activeOutlet.phone}</span>
                </a>
                <span className="text-slate-400">·</span>
                <span className="text-[11px] font-mono text-slate-500">
                  GST: {activeOutlet.gstin}
                </span>
              </div>
            </div>

            {/* Column 2: Full Address & Coordinates */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Physical Location & Coordinates
              </span>
              <div className="text-slate-800 font-medium leading-snug">
                {activeOutlet.address}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                <span className="font-mono text-[11px] text-slate-600">
                  {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°
                </span>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                >
                  {copiedCoords ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy GPS</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Column 3: Commercial & Performance Snapshot */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Beat & Credit Status
              </span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Route:</span>
                <span className="font-semibold text-slate-800">{activeOutlet.routeBeat}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Outstanding:</span>
                <span className="font-bold text-rose-600">
                  Rs. {activeOutlet.outstandingBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Perfect Store:</span>
                <span className="font-bold text-blue-700">
                  {activeOutlet.perfectStoreScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleOpenGoogleMapsDirections}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Navigation className="w-4 h-4 text-blue-600" />
              <span>Turn-by-Turn Navigation (Google Maps)</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {onTakeOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTakeOrder(activeOutlet);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Take Order</span>
                </button>
              )}

              {onEnterStore && activeOutlet.visitStatus === 'pending' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEnterStore(activeOutlet);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Enter Store & Check-In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
