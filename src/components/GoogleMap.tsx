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

    // Add vendor markers
    vendors.forEach(vendor => {
      const marker = new google.maps.Marker({
        position: { lat: vendor.location.lat, lng: vendor.location.lng },
        map: mapInstanceRef.current,
        title: vendor.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="${selectedVendor?.id === vendor.id ? '#3B82F6' : '#F97316'}" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" font-size="16" fill="white">${vendor.emoji}</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20)
        }
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onVendorSelect) {
          onVendorSelect(vendor);
        }

        // Show info window
        if (infoWindowRef.current) {
          const content = `
            <div style="padding: 8px; max-width: 200px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 20px;">${vendor.emoji}</span>
                <div>
                  <h3 style="margin: 0; font-size: 16px; font-weight: bold;">${vendor.name}</h3>
                  <p style="margin: 0; font-size: 12px; color: #666;">${vendor.cuisine}</p>
                </div>
              </div>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">${vendor.description}</p>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                <span style="font-size: 12px;">⭐ ${vendor.rating}</span>
                <span style="font-size: 12px;">📍 ${vendor.speed} min away</span>
                <span style="font-size: 12px; padding: 2px 6px; background: ${vendor.speed <= 2 ? '#dcfce7' : '#dbeafe'}; color: ${vendor.speed <= 2 ? '#166534' : '#1e40af'}; border-radius: 4px;">
                  ${vendor.speed <= 2 ? 'OPEN' : 'En Route'}
                </span>
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
          <div className="flex items-center justify-center h-full bg-red-50">
            <div className="text-center">
              <p className="text-red-600 font-semibold">Failed to load Google Maps</p>
              <p className="text-red-500 text-sm">Please check your API key and internet connection</p>
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
