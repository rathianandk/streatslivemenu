import React, { useState, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Globe, Radio as RadioIcon } from 'lucide-react';

// Use the Vendor interface from the parent component
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
  vendorType: 'truck' | 'pushcart' | 'stall';
  isStationary: boolean;
  hasFixedAddress: boolean;
  isOnline: boolean;
}

interface GoogleMapProps {
  vendors: Vendor[];
  selectedVendor: Vendor | null;
  onVendorSelect: (vendor: Vendor | null) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  lat?: number;
  lng?: number;
  userLocation?: { lat: number; lng: number };
}

const GoogleMapComponent: React.FC<GoogleMapProps> = ({ 
  vendors = [], 
  selectedVendor, 
  onVendorSelect, 
  zoom = 13,
  onZoomChange,
  userLocation = { lat: 37.7649, lng: -122.4194 }
}) => {
  const [mapReady, setMapReady] = useState(false);
  


  const mapContainerStyle = {
    width: '100%',
    height: '100%'
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: false,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: true,
    styles: [
      {
        featureType: "poi.business",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      }
    ]
  };

  // Center map on vendors if they exist, otherwise use user location
  const center = vendors.length > 0 ? {
    lat: vendors[0].location.lat,
    lng: vendors[0].location.lng
  } : {
    lat: userLocation.lat,
    lng: userLocation.lng
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    setMapReady(true);
  }, []);

  const onUnmount = useCallback(() => {
    setMapReady(false);
  }, []);

  // Create custom truck emoji marker icon
  const createTruckIcon = (vendor: Vendor, isSelected: boolean) => {
    const isOnline = vendor.isOnline;
    const isArrived = isOnline && vendor.speed <= 2;
    
    const fillColor = isSelected 
      ? '#f97316' // orange-500
      : isArrived
        ? '#16a34a' // green-600
        : isOnline
          ? '#2563eb' // blue-600
          : '#6b7280'; // gray-500
    
    const scale = isSelected ? 16 : 14;
    
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: scale,
      fillColor: fillColor,
      fillOpacity: 1,
      strokeColor: 'white',
      strokeWeight: 2,
      labelOrigin: new window.google.maps.Point(0, 0)
    };
  };

  // Function to spread out overlapping markers
  const getAdjustedPosition = (vendor: Vendor, index: number, allVendors: Vendor[]) => {
    const basePosition = vendor.location;
    const minDistance = 0.003; // Minimum distance between markers (roughly 300m)
    
    // Check for overlaps with previous vendors
    let adjustedLat = basePosition.lat;
    let adjustedLng = basePosition.lng;
    
    for (let i = 0; i < index; i++) {
      const otherVendor = allVendors[i];
      const distance = Math.sqrt(
        Math.pow(adjustedLat - otherVendor.location.lat, 2) + 
        Math.pow(adjustedLng - otherVendor.location.lng, 2)
      );
      
      if (distance < minDistance) {
        // Spread markers in a circular pattern around the original position
        const angle = (index * 60) * (Math.PI / 180); // 60 degrees apart
        const offset = minDistance * 1.5;
        adjustedLat = basePosition.lat + Math.cos(angle) * offset;
        adjustedLng = basePosition.lng + Math.sin(angle) * offset;
      }
    }
    
    return { lat: adjustedLat, lng: adjustedLng };
  };

  // Better positioning to ensure trucks are visible
  const getVendorPosition = (vendor: Vendor, index: number) => {
    const positions = [
      { left: '65%', top: '35%' }, // Taco Express - top right
      { left: '35%', top: '60%' }, // Seoul Kitchen - bottom left  
      { left: '70%', top: '65%' }  // Burger Bliss - bottom right
    ];
    return positions[index] || { left: '50%', top: '50%' };
  };

  const calculateETA = (vendorLocation: { lat: number; lng: number }) => {
    const userLocation = { lat: 37.7649, lng: -122.4194 };
    const distance = Math.sqrt(
      Math.pow(vendorLocation.lat - userLocation.lat, 2) + 
      Math.pow(vendorLocation.lng - userLocation.lng, 2)
    ) * 111;
    return Math.round(distance * 60 / 15);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
        {!mapReady && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-lg font-semibold text-gray-700 mb-2">Loading Google Maps...</div>
              <div className="text-sm text-gray-600">Initializing real-time tracking</div>
            </div>
          </div>
        )}
        
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onZoomChanged={() => onZoomChange && onZoomChange(zoom)}
          options={mapOptions}
        >
          {/* User location marker */}
          <Marker
            position={center}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2
            }}
            title="Your Location"
          />

          {/* Truck markers with truck emojis */}
          {vendors.map((vendor, index) => {

            const isSelected = selectedVendor?.id === vendor.id;
            const isOnline = vendor.isOnline;
            const isArrived = isOnline && vendor.speed <= 2;
            const adjustedPosition = getAdjustedPosition(vendor, index, vendors);
            
            return (
              <Marker
                key={vendor.id}
                position={adjustedPosition}
                icon={createTruckIcon(vendor, isSelected)}
                label={{
                  text: '🚚'
                }}
                onClick={() => onVendorSelect && onVendorSelect(vendor)}
                title={`🚚 ${vendor.name} | ${vendor.cuisine} Cuisine | ${isOnline ? (isArrived ? '🟢 OPEN NOW - Ready to serve!' : '🔵 EN ROUTE - Coming your way!') : '⚫ OFFLINE - Currently closed'} | ⭐ ${vendor.rating || 4.5} stars`}
              >
                {isSelected && (
                  <InfoWindow
                    onCloseClick={() => onVendorSelect && onVendorSelect(null)}
                  >
                    <div className="p-0 min-w-[280px]">
                      {/* Header Section */}
                      <div className={`px-4 py-3 rounded-t-lg ${
                        isArrived ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                        : isOnline ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                        : 'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white text-lg leading-tight">{vendor.name}</h3>
                            <p className="text-white/90 text-sm">{vendor.cuisine} Cuisine</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isArrived ? 'bg-white/20 text-white' 
                            : isOnline ? 'bg-white/20 text-white' 
                            : 'bg-white/20 text-white'
                          }`}>
                            {isOnline ? (isArrived ? '🟢 OPEN NOW' : '🔵 EN ROUTE') : '⚫ OFFLINE'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Content Section */}
                      <div className="px-4 py-3 bg-white">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-gray-900">{Math.round(vendor.speed || 0)}</div>
                            <div className="text-xs text-gray-500">km/h</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-gray-900">{calculateETA(vendor.location)}</div>
                            <div className="text-xs text-gray-500">min ETA</div>
                          </div>
                        </div>
                        
                        {/* Rating and Reviews */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">⭐</span>
                            <span className="font-semibold text-gray-900">{vendor.rating || 4.5}</span>
                            <span className="text-gray-500 text-sm">({vendor.reviews?.length || 0} reviews)</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {vendor.vendorType === 'truck' ? '$$$' : vendor.vendorType === 'pushcart' ? '$' : '$$'}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                          <button className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            isOnline 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}>
                            📱 View Menu
                          </button>
                          <button className="flex-1 py-2 px-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                            🗺️ Directions
                          </button>
                        </div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            );
          })}
        </GoogleMap>
      </div>
  );
};

export default GoogleMapComponent;
