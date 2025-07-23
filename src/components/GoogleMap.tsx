import React, { useState } from 'react';
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
  onVendorSelect: (vendor: Vendor) => void;
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
  zoom = 13
}) => {
  const [mapReady, setMapReady] = useState(true);

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
    <div className="relative w-full h-full bg-gradient-to-br from-blue-400 via-green-400 to-blue-500 overflow-hidden">
      {!mapReady && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg font-semibold text-gray-700 mb-2">Loading Google Maps...</div>
            <div className="text-sm text-gray-600">Initializing real-time tracking</div>
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${40 / zoom * 13}px ${40 / zoom * 13}px`
        }}></div>
      </div>
      
      <div className="absolute inset-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
        <div className="bg-black/20 text-white p-3 md:p-4 border-b border-white/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-3">
              <Globe className="w-4 md:w-5 h-4 md:h-5" />
              <div>
                <span className="text-sm md:text-lg font-bold">Google Maps - Live Tracking</span>
                <div className="text-xs opacity-80">
                  {selectedVendor ? `Focused on ${selectedVendor.name}` : 'Overview Mode'} • Zoom {zoom}x
                </div>
              </div>
            </div>
            {selectedVendor && (
              <div className="bg-orange-500/80 px-2 md:px-3 py-1 md:py-2 rounded-lg">
                <div className="text-xs opacity-90">ETA</div>
                <div className="font-bold text-sm md:text-base">{calculateETA(selectedVendor.location)} min</div>
              </div>
            )}
          </div>
        </div>
        
        <div className="relative h-full text-white overflow-hidden">
          <div className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2" style={{ left: '40%', top: '60%' }}>
            <div className="relative">
              <div className="w-3 md:w-4 h-3 md:h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
              <div className="absolute -inset-1 md:-inset-2 bg-blue-400 rounded-full opacity-30 animate-ping"></div>
              <div className="absolute top-4 md:top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                <span className="hidden sm:inline">Your Location</span>
                <span className="sm:hidden">You</span>
              </div>
            </div>
          </div>

          {/* Truck markers with truck emojis */}
          {vendors.map((vendor, index) => {
            const position = getVendorPosition(vendor, index);
            const isSelected = selectedVendor?.id === vendor.id;
            const isOnline = vendor.isOnline;
            const isArrived = isOnline && vendor.speed <= 2;
            
            return (
              <div
                key={vendor.id}
                className={`absolute cursor-pointer transition-all duration-1000 hover:scale-110 z-10 ${
                  isSelected ? 'scale-150 z-30' : 'z-10'
                }`}
                style={{
                  left: position.left,
                  top: position.top,
                  transform: `translate(-50%, -50%)`,
                  transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onClick={() => onVendorSelect && onVendorSelect(vendor)}
              >
                <div className={`relative ${isSelected ? 'animate-pulse' : ''}`}>
                  {vendor.speed > 5 && (
                    <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent rounded-full animate-pulse"></div>
                  )}
                  
                  {isArrived && (
                    <div className="absolute -inset-6 bg-green-400/20 rounded-full animate-pulse"></div>
                  )}
                  
                  {/* Main truck icon - always shows truck emoji */}
                  <div className={`w-10 md:w-12 h-10 md:h-12 rounded-full flex items-center justify-center text-white font-bold shadow-xl transform transition-all ${
                    isSelected 
                      ? 'bg-orange-500 ring-4 ring-orange-300 scale-110' 
                      : isArrived
                        ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-400'
                        : isOnline
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-gray-500'
                  }`}>
                    <span className="text-lg md:text-xl" style={{ transform: `rotate(${vendor.location.heading || 0}deg)` }}>
                      🚚
                    </span>
                  </div>
                  
                  <div className={`absolute -top-1 -right-1 w-3 md:w-4 h-3 md:h-4 rounded-full border-2 border-white ${
                    isArrived ? 'bg-green-500 animate-pulse' : isOnline ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  
                  {vendor.speed > 5 && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 md:w-5 h-4 md:h-5 flex items-center justify-center animate-pulse">
                      ↗
                    </div>
                  )}
                  
                  {isArrived && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 md:w-5 h-4 md:h-5 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  
                  {/* ALWAYS show info for arrived trucks */}
                  {isArrived && (
                    <div className="absolute top-14 md:top-16 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 text-xs md:text-sm px-3 md:px-4 py-2 md:py-3 rounded-lg shadow-lg border-2 border-green-400 whitespace-nowrap z-50">
                      <div className="font-bold text-green-700 mb-1">{vendor.name}</div>
                      <div className="text-gray-600 text-xs">{vendor.cuisine} Cuisine</div>
                      <div className="flex items-center gap-1 mt-1 justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-700 font-medium text-xs">OPEN NOW</span>
                      </div>
                    </div>
                  )}
                  
                  {isSelected && !isArrived && (
                    <div className="absolute top-12 md:top-16 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs md:text-sm px-3 md:px-4 py-2 md:py-3 rounded-lg whitespace-nowrap border border-orange-400 z-40">
                      <div className="font-bold text-orange-300">{vendor.name}</div>
                      <div className="text-xs opacity-75 space-y-1">
                        <div>Speed: {Math.round(vendor.speed || 0)} km/h</div>
                        <div>Accuracy: ±{Math.round(vendor.accuracy || 0)}m</div>
                        <div className="text-orange-300">ETA: {calculateETA(vendor.location)} min</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 bg-black/40 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 text-xs md:text-sm border border-white/20">
            <div className="font-bold mb-2 flex items-center gap-2">
              <RadioIcon className="w-3 md:w-4 h-3 md:h-4 text-green-400" />
              <span className="hidden sm:inline">Live Tracking Stats</span>
              <span className="sm:hidden">Live Stats</span>
            </div>
            <div className="space-y-1 text-xs">
              <div>Arrived: <span className="text-green-400 font-bold">{vendors.filter(v => v.isOnline && v.speed <= 2).length}</span></div>
              <div>Active: <span className="text-blue-400 font-bold">{vendors.filter(v => v.isOnline).length}</span></div>
              <div className="hidden sm:block">Total: <span className="text-purple-400 font-bold">{vendors.length}</span></div>
              <div className="hidden sm:block">Zoom: <span className="text-yellow-400 font-bold">{zoom}x</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapComponent;
