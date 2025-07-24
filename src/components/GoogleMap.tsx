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
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "transit",
        elementType: "labels.icon",
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
    
    const scale = isSelected ? 12 : 10;
    
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
          options={mapOptions}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onZoomChanged={() => onZoomChange && onZoomChange(zoom)}
        >
          {/* User location marker */}
          <Marker
            position={center}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
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
            
            return (
              <Marker
                key={vendor.id}
                position={vendor.location}
                icon={createTruckIcon(vendor, isSelected)}
                label={{
                  text: '🚚',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'white'
                }}
                onClick={() => onVendorSelect && onVendorSelect(vendor)}
                title={`${vendor.name} - ${isOnline ? (isArrived ? 'OPEN NOW' : 'EN ROUTE') : 'OFFLINE'}`}
              >
                {isSelected && (
                  <InfoWindow
                    onCloseClick={() => onVendorSelect && onVendorSelect(null)}
                  >
                    <div className="p-2">
                      <div className="font-bold text-gray-900">{vendor.name}</div>
                      <div className="text-sm text-gray-600">{vendor.cuisine} Cuisine</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Speed: {Math.round(vendor.speed || 0)} km/h
                      </div>
                      <div className="text-xs text-gray-500">
                        ETA: {calculateETA(vendor.location)} min
                      </div>
                      <div className={`text-xs font-medium mt-1 ${
                        isArrived ? 'text-green-600' : isOnline ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {isOnline ? (isArrived ? 'OPEN NOW' : 'EN ROUTE') : 'OFFLINE'}
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
