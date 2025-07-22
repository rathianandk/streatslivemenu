import React, { useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

interface Vendor {
  id: number;
  name: string;
  description: string;
  cuisine: string;
  emoji: string;
  rating: number;
  location: {
    lat: number;
    lng: number;
    address: string;
    heading?: number;
  };
  lastSeen: number;
  speed: number;
  heading: number;
  accuracy: number;
  dishes: any[];
  reviews: any[];
  status?: string;
  estimatedTime?: number;
}

interface GoogleMapProps {
  vendors?: Vendor[];
  selectedVendor?: Vendor | null;
  onVendorSelect?: (vendor: Vendor) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  userLocation?: { lat: number; lng: number };
  lat: number;
  lng: number;
}

const MapComponent: React.FC<GoogleMapProps> = ({
  vendors = [],
  selectedVendor,
  onVendorSelect,
  zoom = 13,
  onZoomChange,
  userLocation = { lat: 37.7749, lng: -122.4194 },
  lat,
  lng
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize the map
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: userLocation.lat, lng: userLocation.lng },
      zoom: zoom,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Add zoom change listener
    map.addListener('zoom_changed', () => {
      const newZoom = map.getZoom();
      if (newZoom && onZoomChange) {
        onZoomChange(newZoom);
      }
    });

    // Create info window
    infoWindowRef.current = new google.maps.InfoWindow();

    return () => {
      // Cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  // Update map center and zoom when props change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [userLocation, zoom]);

  // Update markers when vendors change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add vendor markers with enhanced design
    vendors.forEach(vendor => {
      const isSelected = selectedVendor?.id === vendor.id;
      const isOnline = Date.now() - vendor.lastSeen < 30000;
      const isArrived = isOnline && vendor.speed <= 2;
      
      // Create custom marker with truck emoji and status
      const marker = new google.maps.Marker({
        position: { lat: vendor.location.lat, lng: vendor.location.lng },
        map: mapInstanceRef.current,
        title: `${vendor.name} - ${vendor.cuisine}`,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="60" height="80" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
              <!-- Main marker circle -->
              <circle cx="30" cy="30" r="25" fill="${isSelected ? '#3B82F6' : isArrived ? '#10B981' : '#F97316'}" stroke="white" stroke-width="3"/>
              
              <!-- Truck emoji -->
              <text x="30" y="38" text-anchor="middle" font-size="20" fill="white">🚚</text>
              
              <!-- Status indicator -->
              <circle cx="45" cy="15" r="8" fill="${isArrived ? '#10B981' : isOnline ? '#F59E0B' : '#EF4444'}" stroke="white" stroke-width="2"/>
              <text x="45" y="19" text-anchor="middle" font-size="10" fill="white">${isArrived ? '✓' : isOnline ? '→' : '×'}</text>
              
              <!-- Vendor name label -->
              <rect x="5" y="55" width="50" height="20" rx="10" fill="rgba(0,0,0,0.8)" stroke="white" stroke-width="1"/>
              <text x="30" y="67" text-anchor="middle" font-size="10" fill="white" font-weight="bold">${vendor.name.substring(0, 8)}</text>
              
              <!-- Pointer -->
              <polygon points="25,50 35,50 30,60" fill="${isSelected ? '#3B82F6' : isArrived ? '#10B981' : '#F97316'}"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(60, 80),
          anchor: new google.maps.Point(30, 60)
        }
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onVendorSelect) {
          onVendorSelect(vendor);
        }

        // Show enhanced info window
        if (infoWindowRef.current) {
          const isOnline = Date.now() - vendor.lastSeen < 30000;
          const isArrived = isOnline && vendor.speed <= 2;
          const statusText = isArrived ? 'OPEN NOW' : isOnline ? 'EN ROUTE' : 'OFFLINE';
          const statusColor = isArrived ? '#10B981' : isOnline ? '#F59E0B' : '#EF4444';
          
          const content = `
            <div style="padding: 12px; max-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="font-size: 32px; background: linear-gradient(135deg, #F97316, #EA580C); padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">🚚</div>
                <div>
                  <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #1F2937;">${vendor.name}</h3>
                  <p style="margin: 2px 0; font-size: 14px; color: #6B7280;">${vendor.cuisine} Cuisine</p>
                  <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                    <span style="font-size: 12px; padding: 3px 8px; background: ${statusColor}; color: white; border-radius: 12px; font-weight: bold;">
                      ${statusText}
                    </span>
                  </div>
                </div>
              </div>
              <p style="margin: 8px 0; font-size: 13px; color: #4B5563; line-height: 1.4;">${vendor.description}</p>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 14px;">⭐</span>
                  <span style="font-size: 14px; font-weight: 600; color: #1F2937;">${vendor.rating}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 14px;">🕒</span>
                  <span style="font-size: 14px; color: #6B7280;">${Math.round(vendor.speed)} min away</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 14px;">🍽️</span>
                  <span style="font-size: 14px; color: #6B7280;">${vendor.dishes?.length || 0} dishes</span>
                </div>
              </div>
            </div>
          `;
          
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      markersRef.current.push(marker);
    });
  }, [vendors, selectedVendor, onVendorSelect]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};

const GoogleMapComponent: React.FC<GoogleMapProps> = (props) => {
  const render = (status: Status) => {
    switch (status) {
      case Status.LOADING:
        return (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading Google Maps...</p>
            </div>
          </div>
        );
      case Status.FAILURE:
        return (
          <div className="relative w-full h-full bg-gradient-to-br from-blue-100 via-green-100 to-yellow-100 overflow-hidden">
            {/* Fallback Map Background */}
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full bg-gradient-to-br from-blue-200 to-green-200"></div>
            </div>
            
            {/* Street Grid Overlay */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 400 300">
                {/* Horizontal streets */}
                {[...Array(6)].map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={i * 50 + 25} x2="400" y2={i * 50 + 25} stroke="#374151" strokeWidth="1" />
                ))}
                {/* Vertical streets */}
                {[...Array(8)].map((_, i) => (
                  <line key={`v-${i}`} x1={i * 50 + 25} y1="0" x2={i * 50 + 25} y2="300" stroke="#374151" strokeWidth="1" />
                ))}
              </svg>
            </div>

            {/* Vendor Markers */}
            {props.vendors?.map((vendor, index) => {
              const positions = [
                { left: '65%', top: '35%' }, // Taco Express - top right
                { left: '35%', top: '60%' }, // Seoul Kitchen - bottom left  
                { left: '70%', top: '65%' }  // Burger Bliss - bottom right
              ];
              const position = positions[index] || { left: '50%', top: '50%' };
              const isSelected = props.selectedVendor?.id === vendor.id;
              
              return (
                <div
                  key={vendor.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110 ${
                    isSelected ? 'scale-125 z-20' : 'z-10'
                  }`}
                  style={{
                    left: position.left,
                    top: position.top
                  }}
                  onClick={() => props.onVendorSelect?.(vendor)}
                >
                  <div className={`relative ${
                    isSelected ? 'animate-bounce' : ''
                  }`}>
                    {/* Main Marker */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg border-3 border-white ring-2 ${
                      isSelected ? 'bg-blue-600 ring-blue-400' : 'bg-orange-600 ring-orange-400'
                    }`}>
                      {vendor.emoji}
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ring-1 bg-green-600 ring-green-400"></div>
                    
                    {/* Pulse Animation */}
                    <div className="absolute inset-0 w-12 h-12 rounded-full bg-orange-400 animate-ping opacity-20"></div>
                  </div>
                </div>
              );
            })}

            {/* User Location Marker */}
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30"
              style={{
                left: '50%',
                top: '50%'
              }}
            >
              <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
              <div className="absolute inset-0 w-4 h-4 bg-blue-600 rounded-full animate-ping opacity-75"></div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-blue-600 whitespace-nowrap">You</div>
            </div>

            {/* Error Notice */}
            <div className="absolute top-4 left-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 shadow-md max-w-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-yellow-800 font-semibold text-sm">Map Service Unavailable</p>
                  <p className="text-yellow-700 text-xs">Using fallback map view</p>
                </div>
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button 
                onClick={() => props.onZoomChange?.(Math.min((props.zoom || 13) + 1, 20))}
                className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                title="Zoom In"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button 
                onClick={() => props.onZoomChange?.(Math.max((props.zoom || 13) - 1, 8))}
                className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                title="Zoom Out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                </svg>
              </button>
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
              <div className="text-xs font-semibold text-gray-700 mb-2">Food Trucks</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full ring-1 ring-green-400"></div>
                  <span>Available Now</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full ring-1 ring-blue-400"></div>
                  <span>Your Location</span>
                </div>
              </div>
            </div>
          </div>
        );
      case Status.SUCCESS:
        return <MapComponent {...props} />;
    }
  };

  return (
    <Wrapper
      apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}
      render={render}
      libraries={['places']}
    />
  );
};

export default GoogleMapComponent;
