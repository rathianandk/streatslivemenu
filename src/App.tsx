import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, MapPin, Menu, User, Navigation, ArrowLeft, Edit, Trash2, Save, X, Clock, Star, Filter, ZoomIn, ZoomOut, Target, Timer, Utensils, DollarSign, TrendingUp, RadioIcon, Globe, Play, Pause, MessageCircle, Send, StarIcon } from 'lucide-react';
import { apiService, ApiVendor } from './services/api';
import GoogleMapComponent from './components/GoogleMap';

// TypeScript interfaces
interface Review {
  id: number;
  userName: string;
  rating: number;
  text: string;
  date: string;
  timestamp: number;
}

interface Dish {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

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
  dishes: Dish[];
  reviews: Review[];
  status?: string;
  estimatedTime?: number;
  // Hybrid Location Model properties
  vendorType: 'truck' | 'pushcart' | 'stall'; // Different vendor types
  isStationary: boolean; // True for push carts, false for trucks
  hasFixedAddress: boolean; // False for address-less push carts
  isOnline: boolean; // Controlled by "Go Live Now" button
}

interface User {
  id: number;
  name: string;
  email: string;
}

// Mock Location Service
class LocationService {
  isConnected: boolean;
  subscribers: Set<(data: any) => void>;
  simulationActive: boolean;
  simulationInterval: NodeJS.Timeout | null;

  constructor() {
    this.isConnected = false;
    this.subscribers = new Set();
    this.simulationActive = false;
    this.simulationInterval = null;
  }
  
  connect() {
    this.isConnected = true;
    this.notifySubscribers({ type: 'connected' });
  }
  
  subscribe(callback: (data: any) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  notifySubscribers(data: any) {
    this.subscribers.forEach(callback => callback(data));
  }
  
  updateLocation(vendorId: number, location: any) {
    this.notifySubscribers({
      type: 'vendor_location_update',
      vendorId,
      location,
      timestamp: Date.now()
    });
  }
  
  startSimulation(vendors: Vendor[], updateCallback: (vendorId: number, location: any) => void) {
    if (this.simulationInterval) return;
    
    this.simulationActive = true;
    this.simulationInterval = setInterval(() => {
      vendors.forEach(vendor => {
        const deltaLat = (Math.random() - 0.5) * 0.002;
        const deltaLng = (Math.random() - 0.5) * 0.002;
        
        const newLocation = {
          lat: vendor.location.lat + deltaLat,
          lng: vendor.location.lng + deltaLng,
          heading: Math.random() * 360,
          speed: Math.random() * 30 + 5,
          accuracy: Math.random() * 10 + 5
        };
        
        updateCallback(vendor.id, newLocation);
      });
    }, 3000);
  }
  
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
      this.simulationActive = false;
    }
  }
  
  toggleSimulation(vendors: Vendor[], updateCallback: (vendorId: number, location: any) => void) {
    if (this.simulationActive) {
      this.stopSimulation();
      return false;
    } else {
      this.startSimulation(vendors, updateCallback);
      return true;
    }
  }
}

// Mark My Spot Component for Push Cart Vendors
interface MarkMySpotProps {
  onClose: () => void;
  onMarkLocation: (lat: number, lng: number, openUntil: string) => void;
  vendorName: string;
}

const MarkMySpotModal = ({ onClose, onMarkLocation, vendorName }: MarkMySpotProps) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [openUntil, setOpenUntil] = useState('');
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [ampm, setAmpm] = useState('PM');
  const [timeError, setTimeError] = useState('');

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setIsGettingLocation(false);
      },
      (error) => {
        setLocationError('Unable to get your location. Please try again.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Validate numeric time inputs
  const validateTimeInputs = () => {
    setTimeError('');
    
    const hourNum = parseInt(hours);
    const minuteNum = parseInt(minutes || '0');
    
    // Validate hour range (1-12)
    if (!hours || hourNum < 1 || hourNum > 12) {
      setTimeError('Please enter a valid hour (1-12)');
      return null;
    }
    
    // Validate minute range (0-59)
    if (minutes && (minuteNum < 0 || minuteNum > 59)) {
      setTimeError('Please enter valid minutes (0-59)');
      return null;
    }
    
    // Convert to 24-hour format
    let hour24 = hourNum;
    if (ampm === 'PM' && hourNum !== 12) hour24 += 12;
    if (ampm === 'AM' && hourNum === 12) hour24 = 0;
    
    // Create future date with the specified time
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(hour24, minuteNum, 0, 0);
    
    // If the time is earlier than current time, assume it's for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    // Check if it's too far in the future (more than 24 hours)
    const maxTime = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    if (targetTime > maxTime) {
      setTimeError('Please select a time within the next 24 hours.');
      return null;
    }
    
    return targetTime;
  };
  
  const handleTimeSubmit = () => {
    const validatedTime = validateTimeInputs();
    if (validatedTime) {
      setOpenUntil(validatedTime.toISOString());
      setShowTimeInput(false);
      setHours('');
      setMinutes('');
    }
  };

  const handleMarkSpot = () => {
    if (currentLocation && openUntil) {
      onMarkLocation(currentLocation.lat, currentLocation.lng, openUntil);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">📍 Mark My Spot</h2>
              <p className="opacity-90 text-sm">{vendorName}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Set Your Push Cart Location
            </h3>
            <p className="text-gray-600 text-sm">
              Tap "Get My Location" to mark where your push cart is currently stationed.
              This will help customers find you easily!
            </p>
          </div>

          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{locationError}</p>
            </div>
          )}

          {currentLocation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <MapPin className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Location Found!</p>
                  <p className="text-sm">
                    Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cool Operating Hours Selector */}
          {currentLocation && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-5">
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">⏰</div>
                <h4 className="font-bold text-gray-900 mb-1">When will you close?</h4>
                <p className="text-sm text-gray-600">Let customers know your operating hours</p>
              </div>
              
              {!showTimeInput ? (
                <button
                  onClick={() => setShowTimeInput(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-4 rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg"
                >
                  <Clock className="w-5 h-5" />
                  {openUntil ? `Open until ${new Date(openUntil).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', hour12: true})}` : 'Set Operating Hours'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border-2 border-orange-200 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      🕰️ Set your closing time:
                    </label>
                    
                    {/* Time inputs styled like Add Dish modal price field */}
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        placeholder="12"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-medium"
                        autoFocus
                      />
                      <span className="text-lg font-bold text-gray-400">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="00"
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center font-medium"
                      />
                      
                      {/* AM/PM Toggle styled like Add Dish category selector */}
                      <div className="flex bg-gray-100 rounded-lg p-1 ml-2">
                        <button
                          type="button"
                          onClick={() => setAmpm('AM')}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                            ampm === 'AM'
                              ? 'bg-white text-orange-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setAmpm('PM')}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                            ampm === 'PM'
                              ? 'bg-white text-orange-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          PM
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      📝 Example: 4:30 PM, 11:15 AM, 2:00 PM
                    </div>
                    
                    {timeError && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                        ⚠️ {timeError}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleTimeSubmit}
                      disabled={!hours}
                      className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                        hours
                          ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      ✓ Confirm Time
                    </button>
                    <button
                      onClick={() => {
                        setShowTimeInput(false);
                        setHours('');
                        setMinutes('');
                        setTimeError('');
                      }}
                      className="px-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGettingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Getting Location...
                </>
              ) : (
                <>
                  <Target className="w-5 h-5" />
                  Get My Location
                </>
              )}
            </button>

            {currentLocation && (
              <button
                onClick={handleMarkSpot}
                disabled={!openUntil}
                className={`w-full py-4 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-bold text-lg shadow-lg ${
                  openUntil 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:shadow-xl transform hover:scale-105' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {openUntil ? (
                  <>
                    <div className="text-2xl">🎉</div>
                    <span>Go Live Now!</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>Set Operating Hours First</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <div className="text-yellow-600 mt-0.5">💡</div>
              <div className="text-yellow-700 text-sm">
                <p className="font-semibold mb-1">Tip for Push Cart Vendors:</p>
                <p>Make sure you're at your selling location before marking your spot. This location will be shown to customers until you update it again.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add New Vendor Modal Component
interface AddVendorModalProps {
  onClose: () => void;
  onAddVendor: (vendor: Vendor) => void;
}

const AddVendorModal = ({ onClose, onAddVendor }: AddVendorModalProps) => {
  const [newVendor, setNewVendor] = useState({
    name: '',
    description: '',
    cuisine: '',
    emoji: '🚚',
    address: '',
    vendorType: 'truck' as 'truck' | 'pushcart' | 'stall'
  });

  const emojiOptions = ['🌮', '🍜', '🍔', '🍕', '🍣', '🧇', '☕', '🍦', '🥙', '🍝', '🍲', '🚚', '🛒', '🏪'];
  const cuisineOptions = ['Mexican', 'Asian', 'American', 'Italian', 'Japanese', 'Mediterranean', 'Indian', 'Thai', 'Chinese', 'BBQ', 'Desserts', 'Coffee'];
  
  // Vendor type configurations
  const vendorTypeOptions = [
    {
      value: 'truck',
      label: '🚚 Food Truck',
      description: 'Mobile food truck with GPS tracking',
      defaultEmoji: '🚚',
      requiresAddress: true
    },
    {
      value: 'pushcart',
      label: '🛒 Push Cart',
      description: 'Mobile cart that marks location manually',
      defaultEmoji: '🛒',
      requiresAddress: false
    },
    {
      value: 'stall',
      label: '🏪 Food Stall',
      description: 'Fixed location food stall',
      defaultEmoji: '🏪',
      requiresAddress: true
    }
  ];
  
  const currentVendorType = vendorTypeOptions.find(type => type.value === newVendor.vendorType);
  
  const handleVendorTypeChange = (vendorType: 'truck' | 'pushcart' | 'stall') => {
    const typeConfig = vendorTypeOptions.find(type => type.value === vendorType);
    setNewVendor({
      ...newVendor,
      vendorType,
      emoji: typeConfig?.defaultEmoji || '🚚',
      address: typeConfig?.requiresAddress ? newVendor.address : 'Location varies (mobile vendor)'
    });
  };

  const handleSubmit = () => {
    if (!newVendor.name || !newVendor.description || !newVendor.cuisine) return;
    
    // Determine vendor properties based on type
    const isStationary = newVendor.vendorType === 'pushcart' || newVendor.vendorType === 'stall';
    const hasFixedAddress = newVendor.vendorType !== 'pushcart';
    const speed = isStationary ? 0 : Math.random() * 5; // Stationary vendors don't move
    
    const vendor = {
      id: Date.now(),
      name: newVendor.name,
      description: newVendor.description,
      cuisine: newVendor.cuisine,
      emoji: newVendor.emoji,
      rating: 4.0 + Math.random() * 1.0,
      location: { 
        lat: 37.7749 + (Math.random() - 0.5) * 0.02,
        lng: -122.4194 + (Math.random() - 0.5) * 0.02,
        address: newVendor.address || (hasFixedAddress ? 'San Francisco, CA' : 'Location varies')
      },
      lastSeen: Date.now(),
      speed: speed,
      heading: Math.random() * 360,
      accuracy: Math.random() * 10 + 5,
      dishes: [],
      reviews: [],
      // Hybrid Location Model properties
      vendorType: newVendor.vendorType,
      isStationary: isStationary,
      hasFixedAddress: hasFixedAddress,
      isOnline: false // New vendors start offline
    };
    
    onAddVendor(vendor);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 md:p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg md:text-xl font-bold">Add New {currentVendorType?.label || 'Vendor'}</h2>
              <p className="opacity-90 text-sm md:text-base">Join the StreetEats network</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {/* Vendor Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Type</label>
            <div className="grid grid-cols-1 gap-2">
              {vendorTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleVendorTypeChange(option.value as 'truck' | 'pushcart' | 'stall')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    newVendor.vendorType === option.value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.defaultEmoji}</span>
                    <div>
                      <div className="font-semibold">{option.label}</div>
                      <div className="text-sm opacity-75">{option.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {currentVendorType?.value === 'truck' ? 'Truck' : currentVendorType?.value === 'pushcart' ? 'Cart' : 'Stall'} Name
            </label>
            <input
              type="text"
              placeholder="e.g., Mario's Pizza Palace"
              value={newVendor.name}
              onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              placeholder="Brief description of your food truck..."
              value={newVendor.description}
              onChange={(e) => setNewVendor({ ...newVendor, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine Type</label>
              <select
                value={newVendor.cuisine}
                onChange={(e) => setNewVendor({ ...newVendor, cuisine: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select cuisine</option>
                {cuisineOptions.map(cuisine => (
                  <option key={cuisine} value={cuisine}>{cuisine}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Truck Icon</label>
              <div className="grid grid-cols-6 gap-1">
                {emojiOptions.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setNewVendor({ ...newVendor, emoji })}
                    className={`p-2 text-xl rounded-lg border-2 hover:bg-gray-50 transition-colors ${
                      newVendor.emoji === emoji ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Starting Location</label>
            <input
              type="text"
              placeholder="e.g., Downtown SF, Mission District"
              value={newVendor.address}
              onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={!newVendor.name || !newVendor.description || !newVendor.cuisine}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Food Truck
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Review Modal Component
interface ReviewModalProps {
  vendor: Vendor;
  onClose: () => void;
  onAddReview: (vendorId: number, review: Review) => void;
}

const ReviewModal = ({ vendor, onClose, onAddReview }: ReviewModalProps) => {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [userName, setUserName] = useState('');

  const handleSubmitReview = () => {
    if (!reviewText.trim() || !userName.trim()) return;
    
    const newReview = {
      id: Date.now(),
      userName,
      rating,
      text: reviewText,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now()
    };
    
    onAddReview(vendor.id, newReview);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 md:p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg md:text-xl font-bold">Write a Review</h2>
              <p className="opacity-90 text-sm md:text-base">{vendor?.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 transition-colors ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  <StarIcon className={`w-6 h-6 ${star <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">({rating} {rating === 1 ? 'star' : 'stars'})</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
            <textarea
              placeholder="Share your experience with this food truck..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="text-xs text-gray-500 mt-1">{reviewText.length}/500 characters</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleSubmitReview}
              disabled={!reviewText.trim() || !userName.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Submit Review
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Menu Builder Component
interface MenuBuilderProps {
  vendor: Vendor;
  onUpdateVendor: (vendor: Vendor) => void;
  onClose: () => void;
}

const MenuBuilder = ({ vendor, onUpdateVendor, onClose }: MenuBuilderProps) => {
  const [dishes, setDishes] = useState(vendor?.dishes || []);
  const [newDish, setNewDish] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main'
  });

  const handleAddDish = () => {
    if (!newDish.name || !newDish.price) return;
    
    const dish = {
      ...newDish,
      id: Date.now(),
      price: parseFloat(newDish.price),
      available: true
    };
    
    const updatedDishes = [...dishes, dish];
    setDishes(updatedDishes);
    onUpdateVendor({ ...vendor, dishes: updatedDishes });
    
    setNewDish({ name: '', description: '', price: '', category: 'Main' });
  };

  const handleDeleteDish = (dishId: number) => {
    const updatedDishes = dishes.filter((dish: Dish) => dish.id !== dishId);
    setDishes(updatedDishes);
    onUpdateVendor({ ...vendor, dishes: updatedDishes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 md:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg md:text-2xl font-bold">Menu Builder</h2>
              <p className="opacity-90 text-sm md:text-base">{vendor?.name} - Manage your dishes</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Add New Dish</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Dish name"
                value={newDish.name}
                onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
              />
              <input
                type="number"
                placeholder="Price"
                step="0.01"
                value={newDish.price}
                onChange={(e) => setNewDish({ ...newDish, price: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
              />
              <select
                value={newDish.category}
                onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
              >
                <option value="Main">Main Course</option>
                <option value="Sides">Sides</option>
                <option value="Drinks">Drinks</option>
                <option value="Desserts">Desserts</option>
              </select>
              <button
                onClick={handleAddDish}
                className="bg-orange-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Dish</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
            <textarea
              placeholder="Description"
              value={newDish.description}
              onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
              className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              rows={2}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Current Menu ({dishes.length} items)</h3>
            {dishes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No dishes yet. Add your first dish above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dishes.map(dish => (
                  <div key={dish.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 text-sm md:text-base">{dish.name}</h4>
                      <span className="font-bold text-orange-600 text-sm md:text-base">${dish.price}</span>
                    </div>
                    <p className="text-gray-600 text-xs md:text-sm mb-3">{dish.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {dish.category}
                      </span>
                      <button
                        onClick={() => handleDeleteDish(dish.id)}
                        className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// GoogleMapProps interface now defined in ./components/GoogleMap.tsx

// Mock GoogleMapComponent removed - now using real Google Maps component from ./components/GoogleMap

// Vendor Dashboard Component
interface VendorDashboardProps {
  currentVendor: Vendor;
  onUpdateVendor: (vendor: Vendor) => void;
  onBack: () => void;
}

const VendorDashboard = ({ currentVendor, onUpdateVendor, onBack }: VendorDashboardProps) => {
  const [activeTab, setActiveTab] = useState('menu');
  const [showMenuBuilder, setShowMenuBuilder] = useState(false);
  const [showMarkMySpot, setShowMarkMySpot] = useState(false);


  const handleMarkLocation = (lat: number, lng: number, openUntil: string) => {
    const updatedVendor = {
      ...currentVendor,
      location: {
        ...currentVendor.location,
        lat,
        lng
      },
      openUntil: openUntil, // Store operating hours
      isStationary: true,
      vendorType: currentVendor.vendorType || 'pushcart', // Preserve vendor type
      hasFixedAddress: currentVendor.hasFixedAddress || false, // Preserve fixed address status
      isOnline: true // Set online when "Go Live Now" is clicked
    };
    onUpdateVendor(updatedVendor);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showMenuBuilder && (
        <MenuBuilder
          vendor={currentVendor}
          onUpdateVendor={onUpdateVendor}
          onClose={() => setShowMenuBuilder(false)}
        />
      )}
      
      {showMarkMySpot && (
        <MarkMySpotModal
          vendorName={currentVendor.name}
          onClose={() => setShowMarkMySpot(false)}
          onMarkLocation={handleMarkLocation}
        />
      )}


      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Back to Customer Map</span>
                <span className="sm:hidden">Back</span>
              </button>
              
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">{currentVendor?.name}</h1>
                <p className="text-sm text-gray-600">{currentVendor?.cuisine} • Vendor Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Mark My Spot button for all vendors */}
              <button
                onClick={() => setShowMarkMySpot(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Mark My Spot</span>
                <span className="sm:hidden">📍</span>
              </button>
              
              {/* Go Offline button - only show when online */}
              {currentVendor?.isOnline && (
                <button
                  onClick={() => {
                    const updatedVendor = {
                      ...currentVendor,
                      isOnline: false
                    };
                    onUpdateVendor(updatedVendor);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <span className="hidden sm:inline">Go Offline</span>
                  <span className="sm:hidden">🔴</span>
                </button>
              )}
              
              <div className={`flex items-center gap-2 text-xs md:text-sm px-3 py-2 rounded-full ${
                currentVendor?.isOnline 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg border-2 border-green-300' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  currentVendor?.isOnline 
                    ? 'bg-white animate-pulse' 
                    : 'bg-gray-400'
                }`}></div>
                {currentVendor?.isOnline 
                  ? 'Online' 
                  : 'Offline'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'menu'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Utensils className="w-4 h-4 inline mr-2" />
              Menu Management
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'location'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MapPin className="w-4 h-4 inline mr-2" />
              Live Location
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Menu Management</h2>
                  <p className="text-gray-600 mt-1">Manage your dishes, pricing, and availability</p>
                </div>
                <button
                  onClick={() => setShowMenuBuilder(true)}
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-5 h-5" />
                  <span className="hidden sm:inline">Edit Full Menu</span>
                  <span className="sm:hidden">Edit Menu</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-gray-900">{currentVendor?.dishes?.length || 0}</div>
                <div className="text-gray-600 text-sm">Total Dishes</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-green-600">{currentVendor?.dishes?.filter((d: Dish) => d.available).length || 0}</div>
                <div className="text-gray-600 text-sm">Available Now</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-blue-600">{new Set(currentVendor?.dishes?.map((d: Dish) => d.category)).size || 0}</div>
                <div className="text-gray-600 text-sm">Categories</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-purple-600">
                  ${currentVendor?.dishes?.length ? (currentVendor.dishes.reduce((sum: number, d: Dish) => sum + d.price, 0) / currentVendor.dishes.length).toFixed(2) : '0.00'}
                </div>
                <div className="text-gray-600 text-sm">Avg Price</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Current Menu</h3>
                <p className="text-gray-600 text-sm mt-1">Quick overview of your menu items</p>
              </div>
              <div className="p-6">
                {currentVendor?.dishes?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentVendor.dishes.map((dish: Dish) => (
                      <div key={dish.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{dish.name}</h4>
                          <span className="font-bold text-orange-600">${dish.price}</span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{dish.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {dish.category}
                          </span>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            dish.available 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {dish.available ? 'Available' : 'Sold Out'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No menu items yet</h3>
                    <p className="text-gray-600 mb-4">Start building your menu to attract customers</p>
                    <button
                      onClick={() => setShowMenuBuilder(true)}
                      className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Create Your First Dish
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-6">
            {/* Mark My Spot Section - Available for All Vendors */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <div className="text-3xl">📍</div>
                    <h2 className="text-2xl font-bold">Vendor Location</h2>
                  </div>
                  <p className="text-purple-100 mb-2">
                    Set your location to help customers find you!
                  </p>
                  <p className="text-sm text-purple-200">
                    Tap "Mark My Spot" when you're ready to serve customers at your current location.
                  </p>
                </div>
                <button
                  onClick={() => setShowMarkMySpot(true)}
                  className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-50 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-3 min-w-fit"
                >
                  <MapPin className="w-6 h-6" />
                  Mark My Spot
                </button>
              </div>

            </div>
            
            {/* Location Tracking Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentVendor?.vendorType === 'pushcart' ? 'Location Status' : 'Live Location Tracking'}
                  </h2>
                  <p className="text-gray-600">
                    {currentVendor?.vendorType === 'pushcart' 
                      ? 'Monitor your stationary location visibility'
                      : 'Monitor your truck\'s real-time location and customer reach'}
                  </p>
                </div>
                
                {currentVendor?.vendorType === 'truck' && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-full ${
                    currentVendor?.speed > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      currentVendor?.speed > 0 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                    }`}></div>
                    {currentVendor?.speed > 0 ? 'Moving' : 'Stationary'}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {currentVendor?.vendorType === 'pushcart' 
                      ? (currentVendor?.isOnline ? '📍' : '❌')
                      : `${Math.round(currentVendor?.speed || 0)} km/h`}
                  </div>
                  <div className="text-gray-600">
                    {currentVendor?.vendorType === 'pushcart' ? 'Location Set' : 'Current Speed'}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">±{Math.round(currentVendor?.accuracy || 0)}m</div>
                  <div className="text-gray-600">GPS Accuracy</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 text-sm">
                    {currentVendor?.location?.address || 'Location not set'}
                  </div>
                  <div className="text-gray-600">Current Location</div>
                </div>
              </div>
              
              {/* Additional Push Cart Features */}
              {currentVendor?.vendorType === 'pushcart' && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 mt-0.5">💡</div>
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Push Cart Tips:</h3>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Mark your spot when you're ready to serve customers</li>
                        <li>• Update your location if you move to a new spot</li>
                        <li>• Your location helps customers find you easily</li>
                        <li>• No fixed address? No problem - just mark your current spot!</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-gray-900">247</div>
                <div className="text-gray-600">Orders Today</div>
                <div className="text-xs text-green-600 mt-1">↗ +18% vs yesterday</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-gray-900">$1,847</div>
                <div className="text-gray-600">Revenue Today</div>
                <div className="text-xs text-green-600 mt-1">↗ +23% vs yesterday</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-gray-900">{currentVendor?.rating}⭐</div>
                <div className="text-gray-600">Average Rating</div>
                <div className="text-xs text-blue-600 mt-1">→ {currentVendor?.reviews?.length || 0} reviews</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showMenuOnly, setShowMenuOnly] = useState(false);
  const [showReviewsOnly, setShowReviewsOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mapZoom, setMapZoom] = useState(13);
  const [simulationActive, setSimulationActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [showMenuBuilder, setShowMenuBuilder] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cartQuantities, setCartQuantities] = useState<{[dishId: number]: number}>({});
  const [isVendorMode, setIsVendorMode] = useState(true);
  
  const locationServiceRef = useRef(new LocationService());
  
  // Load vendors from SQLite database
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Load vendors from database on component mount
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const apiVendors = await apiService.getVendors();
        // Convert API vendors to app vendor format
        const convertedVendors: Vendor[] = apiVendors.map(apiVendor => ({
          id: apiVendor.id,
          name: apiVendor.name,
          description: apiVendor.description,
          cuisine: apiVendor.cuisine,
          emoji: apiVendor.emoji,
          rating: apiVendor.rating,
          location: apiVendor.location,
          lastSeen: apiVendor.lastSeen,
          speed: apiVendor.speed,
          heading: apiVendor.heading,
          accuracy: apiVendor.accuracy,
          status: apiVendor.status || 'active',
          estimatedTime: apiVendor.estimatedTime || 0,
          dishes: apiVendor.dishes,
          reviews: apiVendor.reviews,
          // Hybrid Location Model properties
          vendorType: (apiVendor.vendorType as 'truck' | 'pushcart' | 'stall') || 'truck',
          isStationary: apiVendor.isStationary || false,
          hasFixedAddress: apiVendor.hasFixedAddress !== false,
          isOnline: Boolean(apiVendor.isOnline) // Convert database value (0/1) to boolean, controlled by "Go Live Now" button
        }));
        console.log('🔍 Debug - Main vendors:', convertedVendors.map(v => ({
          name: v.name,
          vendorType: v.vendorType,
          isStationary: v.isStationary,
          isOnline: v.isOnline
        })));
        console.log('🔍 Debug - Raw API vendors isOnline:', apiVendors.map(v => ({ name: v.name, isOnline: v.isOnline, type: typeof v.isOnline, converted: Boolean(v.isOnline) })));
        console.log('🔍 Debug - Converted vendors isOnline:', convertedVendors.map(v => ({ name: v.name, isOnline: v.isOnline, type: typeof v.isOnline })));
        setVendors(convertedVendors);
      } catch (error) {
        console.error('Failed to load vendors:', error);
        // Seed database if empty
        try {
          await apiService.seedDatabase();
          const seededVendors = await apiService.getVendors();
          const convertedVendors: Vendor[] = seededVendors.map(apiVendor => ({
            id: apiVendor.id,
            name: apiVendor.name,
            description: apiVendor.description,
            cuisine: apiVendor.cuisine,
            emoji: apiVendor.emoji,
            rating: apiVendor.rating,
            location: apiVendor.location,
            lastSeen: apiVendor.lastSeen,
            speed: apiVendor.speed,
            heading: apiVendor.heading,
            accuracy: apiVendor.accuracy,
            status: apiVendor.status || 'active',
            estimatedTime: apiVendor.estimatedTime || 0,
            dishes: apiVendor.dishes,
            reviews: apiVendor.reviews,
            // Hybrid Location Model properties
            vendorType: (apiVendor.vendorType as 'truck' | 'pushcart' | 'stall') || 'truck',
            isStationary: apiVendor.isStationary || false,
            hasFixedAddress: apiVendor.hasFixedAddress !== false,
            isOnline: Boolean(apiVendor.isOnline) // Convert database value (0/1) to boolean, controlled by "Go Live Now" button
          }));
          console.log('🔍 Debug - Seeded vendors:', convertedVendors.map(v => ({
            name: v.name,
            vendorType: v.vendorType,
            isStationary: v.isStationary
          })));
          setVendors(convertedVendors);
        } catch (seedError) {
          console.error('Failed to seed database:', seedError);
        }
      }
    };
    loadVendors();
  }, []);

  useEffect(() => {
    const locationService = locationServiceRef.current;
    locationService.connect();
    
    const unsubscribe = locationService.subscribe((data: any) => {
      if (data.type === 'vendor_location_update') {
        updateVendorLocation(data.vendorId, data.location);
      }
    });
    
    return () => { unsubscribe(); };
  }, []);

  const updateVendorLocation = (vendorId: number, location: { lat: number; lng: number; heading: number; speed: number; accuracy: number }) => {
    setVendors(prevVendors => 
      prevVendors.map(vendor => 
        vendor.id === vendorId 
          ? { 
              ...vendor, 
              location: { ...vendor.location, ...location },
              lastSeen: Date.now(),
              speed: location.speed || vendor.speed,
              heading: location.heading || vendor.heading,
              accuracy: location.accuracy || vendor.accuracy
            }
          : vendor
      )
    );
  };

  const handleToggleSimulation = () => {
    const locationService = locationServiceRef.current;
    const isActive = locationService.toggleSimulation(vendors, updateVendorLocation);
    setSimulationActive(isActive);
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowMenuOnly(false);
    setShowReviewsOnly(false);
    setMapZoom(16);
  };

  const handleMenuOnlyView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowMenuOnly(true);
    setShowReviewsOnly(false);
    setMapZoom(16);
  };

  // Cart quantity management functions for dishes
  const addToCart = (dishId: number) => {
    setCartQuantities(prev => ({
      ...prev,
      [dishId]: (prev[dishId] || 0) + 1
    }));
  };

  const removeFromCart = (dishId: number) => {
    setCartQuantities(prev => {
      const newQuantities = { ...prev };
      if (newQuantities[dishId] && newQuantities[dishId] > 1) {
        newQuantities[dishId]--;
      } else {
        delete newQuantities[dishId];
      }
      return newQuantities;
    });
  };

  const clearFromCart = (dishId: number) => {
    setCartQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[dishId];
      return newQuantities;
    });
  };

  const handleReviewsOnlyView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowReviewsOnly(true);
    setShowMenuOnly(false);
    setMapZoom(16);
  };

  const handleUpdateVendor = async (updatedVendor: Vendor) => {
    try {
      // Update vendor in database with all fields including Hybrid Location Model data
      await apiService.updateVendor(updatedVendor.id, {
        name: updatedVendor.name,
        description: updatedVendor.description,
        cuisine: updatedVendor.cuisine,
        emoji: updatedVendor.emoji,
        rating: updatedVendor.rating,
        location: updatedVendor.location,
        // Hybrid Location Model fields
        vendorType: updatedVendor.vendorType,
        isStationary: updatedVendor.isStationary,
        hasFixedAddress: updatedVendor.hasFixedAddress,
        isOnline: updatedVendor.isOnline
      });
      
      // Update dishes in database if they changed
      const existingVendor = vendors.find(v => v.id === updatedVendor.id);
      if (existingVendor && updatedVendor.dishes) {
        // Handle dish updates (simplified - in production you'd want more sophisticated diff logic)
        for (const dish of updatedVendor.dishes) {
          if (dish.id && dish.id > 0) {
            // Update existing dish
            await apiService.updateDish(dish.id, dish);
          } else {
            // Add new dish
            await apiService.addDish(updatedVendor.id, dish);
          }
        }
      }
      
      console.log(`📝 Vendor ${updatedVendor.name} updated in database`);
    } catch (error) {
      console.error('Failed to update vendor in database:', error);
      console.log(`📝 Vendor ${updatedVendor.name} updated locally only`);
    }
    
    // Update local state regardless of database success
    setVendors(vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v));
    if (selectedVendor?.id === updatedVendor.id) {
      setSelectedVendor(updatedVendor);
    }
    if (currentVendor?.id === updatedVendor.id) {
      setCurrentVendor(updatedVendor);
    }
    if (currentUser?.id === updatedVendor.id) {
      // Convert Vendor to User for currentUser state
      const user: User = {
        id: updatedVendor.id,
        name: updatedVendor.name,
        email: `${updatedVendor.name.toLowerCase().replace(/\s+/g, '')}@streeteats.com`
      };
      setCurrentUser(user);
    }
  };

  const handleAddReview = async (vendorId: number, newReview: Review) => {
    try {
      // Add review to database
      const apiReview = await apiService.addReview(vendorId, {
        userName: newReview.userName,
        rating: newReview.rating,
        text: newReview.text,
        date: newReview.date,
        timestamp: newReview.timestamp
      });
      
      // Update local state
      const updatedVendors = vendors.map(vendor => {
        if (vendor.id === vendorId) {
          const updatedReviews = [...(vendor.reviews || []), {
            id: apiReview.id,
            userName: apiReview.userName,
            rating: apiReview.rating,
            text: apiReview.text,
            date: apiReview.date,
            timestamp: apiReview.timestamp
          }];
          const newRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0) / updatedReviews.length;
          
          return {
            ...vendor,
            reviews: updatedReviews,
            rating: Math.round(newRating * 10) / 10
          };
        }
        return vendor;
      });
      
      setVendors(updatedVendors);
      
      if (selectedVendor?.id === vendorId) {
        const updatedVendor = updatedVendors.find(v => v.id === vendorId);
        setSelectedVendor(updatedVendor || null);
      }
      
      console.log(`⭐ Review added to database for vendor ${vendorId}`);
    } catch (error) {
      console.error('Failed to add review to database:', error);
      // Fallback to local state only
      const updatedVendors = vendors.map(vendor => {
        if (vendor.id === vendorId) {
          const updatedReviews = [...(vendor.reviews || []), newReview];
          const newRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0) / updatedReviews.length;
          
          return {
            ...vendor,
            reviews: updatedReviews,
            rating: Math.round(newRating * 10) / 10
          };
        }
        return vendor;
      });
      
      setVendors(updatedVendors);
      
      if (selectedVendor?.id === vendorId) {
        const updatedVendor = updatedVendors.find(v => v.id === vendorId);
        setSelectedVendor(updatedVendor || null);
      }
      
      console.log(`⭐ Review added locally for vendor ${vendorId}`);
    }
  };

  const handleAddVendor = async (newVendor: Vendor) => {
    try {
      const apiVendor = await apiService.createVendor({
        name: newVendor.name,
        description: newVendor.description,
        cuisine: newVendor.cuisine,
        emoji: newVendor.emoji,
        rating: newVendor.rating,
        location: newVendor.location
      });
      
      // Convert API vendor back to app format
      const convertedVendor: Vendor = {
        id: apiVendor.id,
        name: apiVendor.name,
        description: apiVendor.description,
        cuisine: apiVendor.cuisine,
        emoji: apiVendor.emoji,
        rating: apiVendor.rating,
        location: apiVendor.location,
        lastSeen: apiVendor.lastSeen,
        speed: apiVendor.speed,
        heading: apiVendor.heading,
        accuracy: apiVendor.accuracy,
        status: 'active',
        estimatedTime: 0,
        dishes: [],
        reviews: [],
        // Hybrid Location Model properties
        vendorType: 'truck', // Default to truck for API vendors
        isStationary: false, // Trucks are mobile by default
        hasFixedAddress: true, // API vendors have addresses by default
        isOnline: false // New vendors start offline
      };
      
      setVendors([...vendors, convertedVendor]);
      console.log(`🚚 New vendor added to database: ${convertedVendor.name}`);
    } catch (error) {
      console.error('Failed to add vendor to database:', error);
      // Fallback to local state only
      setVendors([...vendors, newVendor]);
      console.log(`🚚 New vendor added locally: ${newVendor.name}`);
    }
  };

  const handleVendorLogin = (vendorId: number) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      // Convert Vendor to User for login
      const user: User = {
        id: vendor.id,
        name: vendor.name,
        email: `${vendor.name.toLowerCase().replace(/\s+/g, '')}@streeteats.com`
      };
      setCurrentUser(user);
      setCurrentVendor(vendor);
      setCurrentView('dashboard');
    }
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteModal(true);
  };

  const confirmDeleteVendor = async () => {
    if (!vendorToDelete) return;
    
    try {
      // Call API to delete vendor
      await apiService.deleteVendor(vendorToDelete.id);
      
      // Remove from local state with smooth animation
      setVendors(vendors.filter(v => v.id !== vendorToDelete.id));
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setVendorToDelete(null);
      
      console.log(`🗑️ Vendor deleted: ${vendorToDelete.name}`);
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      // Still remove from local state if API fails
      setVendors(vendors.filter(v => v.id !== vendorToDelete.id));
      setShowDeleteModal(false);
      setVendorToDelete(null);
    }
  };

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (currentView === 'dashboard' && currentUser && currentVendor) {
    return (
      <VendorDashboard
        currentVendor={currentVendor}
        onUpdateVendor={handleUpdateVendor}
        onBack={() => {
          setCurrentView('landing');
          setCurrentUser(null);
          setCurrentVendor(null);
        }}
      />
    );
  }

  if (currentView === 'vendor-login') {
    return (
      <>
        {/* Cool Delete Confirmation Modal */}
        {showDeleteModal && vendorToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100">
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <Trash2 className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Vendor</h3>
                  <p className="text-gray-600">Are you sure you want to permanently delete this vendor?</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{vendorToDelete.emoji}</span>
                    <div>
                      <div className="font-bold text-gray-900">{vendorToDelete.name}</div>
                      <div className="text-sm text-gray-600">{vendorToDelete.cuisine} • {vendorToDelete.dishes?.length || 0} dishes</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="text-sm text-red-800">
                      <strong>Warning:</strong> This will permanently delete all vendor data, including menu items and reviews. This action cannot be undone.
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setVendorToDelete(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteVendor}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              🚚 <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">StreetEats Pro</span>
            </h1>
            <p className="text-gray-600 text-sm md:text-base">Vendor Dashboard • Menu Management & Live Tracking</p>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 mb-4">Select Your Food Truck:</h3>
            {vendors.map(vendor => {
              console.log(`🔍 Vendor Hub - ${vendor.name}: isOnline=${vendor.isOnline}, type=${typeof vendor.isOnline}`);
              return (
              <div
                key={vendor.id}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1" onClick={() => handleVendorLogin(vendor.id)}>
                    <span className="text-2xl md:text-3xl mr-3 md:mr-4">{vendor.emoji}</span>
                    <div>
                      <div className="font-bold text-gray-900 text-sm md:text-base">{vendor.name}</div>
                      <div className="text-xs md:text-sm text-gray-600">{vendor.cuisine} • {vendor.dishes?.length || 0} dishes</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-gray-500">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                        vendor.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          vendor.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`}></div>
                        {vendor.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVendor(vendor);
                      }}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                      title="Delete Vendor"
                    >
                      <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          
          <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
            <button
              onClick={() => setCurrentView('landing')}
              className="w-full text-center text-orange-600 hover:text-orange-700 font-medium transition-colors text-sm md:text-base"
            >
              ← Back to Customer Map
            </button>
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {showAddVendorModal && (
        <AddVendorModal
          onClose={() => setShowAddVendorModal(false)}
          onAddVendor={handleAddVendor}
        />
      )}

      {showReviewModal && currentVendor && (
        <ReviewModal
          vendor={currentVendor}
          onClose={() => setShowReviewModal(false)}
          onAddReview={handleAddReview}
        />
      )}

      {showMenuBuilder && currentVendor && (
        <MenuBuilder
          vendor={currentVendor}
          onUpdateVendor={handleUpdateVendor}
          onClose={() => setShowMenuBuilder(false)}
        />
      )}

      <header className="bg-white shadow-sm border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4 gap-4">
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900">
                🚚 <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">StreetEats Live</span>
              </h1>
              <div className="text-xs md:text-sm text-gray-500">Hackathon Edition</div>
              <div className={`flex items-center gap-2 text-xs px-2 md:px-3 py-1 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className="hidden sm:inline">
                  {connectionStatus === 'connected' ? 'Firebase Connected' : 'Offline Mode'}
                </span>
                <span className="sm:hidden">
                  {connectionStatus === 'connected' ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 lg:max-w-lg lg:mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search food trucks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 md:py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* User/Vendor Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                <button
                  onClick={() => setIsVendorMode(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    !isVendorMode
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Customer</span>
                </button>
                <button
                  onClick={() => setIsVendorMode(true)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    isVendorMode
                      ? 'bg-white text-orange-600 shadow-sm border border-orange-200'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">Vendor</span>
                </button>
              </div>
              
              {/* Vendor-only buttons */}
              {isVendorMode && (
                <>
                  <button 
                    onClick={() => setShowAddVendorModal(true)}
                    className="bg-green-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm md:text-base"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Vendor</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                  
                  <button 
                    onClick={() => setCurrentView('vendor-login')}
                    className="bg-orange-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm md:text-base shadow-md"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="hidden sm:inline">Vendor Hub</span>
                    <span className="sm:hidden">Hub</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 md:p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <RadioIcon className="w-4 md:w-5 h-4 md:h-5" />
                <span className="font-medium text-sm md:text-base">Real-time Control</span>
              </div>
              <button
                onClick={handleToggleSimulation}
                className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm md:text-base ${
                  simulationActive 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {simulationActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {simulationActive ? 'Stop Live Demo' : 'Start Live Demo'}
                </span>
                <span className="sm:hidden">
                  {simulationActive ? 'Stop' : 'Start'} Demo
                </span>
              </button>
            </div>
            <div className="text-xs md:text-sm">
              Arrived: <span className="font-bold text-green-300">{vendors.filter(v => Date.now() - v.lastSeen < 30000 && v.speed <= 2).length}</span> • 
              Moving: <span className="font-bold text-blue-300">{vendors.filter(v => Date.now() - v.lastSeen < 30000 && v.speed > 2).length}</span> • 
              Zoom: <span className="font-bold">{mapZoom}x</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 h-80 lg:h-auto min-h-80 lg:min-h-0">
          <GoogleMapComponent
            vendors={filteredVendors}
            selectedVendor={selectedVendor}
            onVendorSelect={handleVendorSelect}
            zoom={mapZoom}
            onZoomChange={setMapZoom}
            lat={37.7749}
            lng={-122.4194}
            userLocation={{ lat: 37.7749, lng: -122.4194 }}
          />
        </div>

        <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-96 lg:max-h-none overflow-y-auto">
          {selectedVendor ? (
            <div className="flex-1 flex flex-col">
              {showMenuOnly ? (
                // Menu-only view
                <div className="flex-1 flex flex-col">
                  <div className="p-4 md:p-6 border-b border-gray-200 bg-orange-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedVendor.emoji}</span>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{selectedVendor.name}</h2>
                          <p className="text-gray-600 text-sm">{selectedVendor.cuisine} Menu</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowMenuOnly(false)}
                          className="px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Full Details
                        </button>
                        <button onClick={() => {
                          setSelectedVendor(null);
                          setShowMenuOnly(false);
                          setMapZoom(13);
                        }} className="p-2 hover:bg-gray-100 rounded-lg">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                        {selectedVendor.rating}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {selectedVendor.location.address}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedVendor.speed <= 2 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {selectedVendor.speed <= 2 ? 'OPEN NOW' : 'En Route'}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-orange-600" />
                      Menu ({selectedVendor.dishes?.length || 0} items)
                    </h3>
                    
                    {selectedVendor.dishes?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedVendor.dishes.map(dish => (
                          <div key={dish.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-900 text-base">{dish.name}</h4>
                              <span className="font-bold text-orange-600 text-lg">${dish.price}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{dish.description}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                {dish.category}
                              </span>
                              {cartQuantities[dish.id] ? (
                                <div className="flex items-center gap-2 bg-orange-100 rounded-lg px-2 py-1">
                                  <button
                                    onClick={() => clearFromCart(dish.id)}
                                    className="text-red-600 hover:text-red-700 transition-colors p-1"
                                    title="Remove from cart"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <span className="text-orange-700 font-semibold min-w-[1.5rem] text-center">
                                    {cartQuantities[dish.id]}
                                  </span>
                                  <button
                                    onClick={() => addToCart(dish.id)}
                                    className="text-orange-600 hover:text-orange-700 transition-colors p-1"
                                    title="Add to cart"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(dish.id)}
                                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition-colors"
                                  title="Add to cart"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add to Order
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Utensils className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-semibold mb-2">No Menu Available</h4>
                        <p className="text-sm">This truck hasn't added their menu yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : showReviewsOnly ? (
                // Reviews-only view
                <div className="flex-1 flex flex-col">
                  <div className="p-4 md:p-6 border-b border-gray-200 bg-blue-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedVendor.emoji}</span>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{selectedVendor.name}</h2>
                          <p className="text-gray-600 text-sm">Customer Reviews ({selectedVendor.reviews?.length || 0})</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowReviewsOnly(false)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Full Details
                        </button>
                        <button onClick={() => {
                          setSelectedVendor(null);
                          setShowReviewsOnly(false);
                          setMapZoom(13);
                        }} className="p-2 hover:bg-gray-100 rounded-lg">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                        {selectedVendor.rating} average rating
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {selectedVendor.reviews?.length || 0} reviews
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="space-y-4">
                      {selectedVendor.reviews && selectedVendor.reviews.length > 0 ? (
                        selectedVendor.reviews.slice().reverse().map((review, index) => (
                          <div key={review.id || index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {review.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">{review.userName}</p>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < review.rating
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                    <span className="text-sm text-gray-600 ml-1">({review.rating}/5)</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-gray-500">{review.date}</span>
                            </div>
                            {review.text && (
                              <p className="text-gray-700 text-sm leading-relaxed">{review.text}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <h4 className="text-lg font-semibold mb-2">No Reviews Yet</h4>
                          <p className="text-sm">Be the first to leave a review!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Full vendor details view
                <div className="flex-1 flex flex-col">
                  <div className="p-4 md:p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{selectedVendor.name}</h2>
                        <p className="text-gray-600 text-sm md:text-base">{selectedVendor.description}</p>
                      </div>
                      <button onClick={() => {
                        setSelectedVendor(null);
                        setShowMenuOnly(false);
                        setMapZoom(13);
                      }} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Live Status</span>
                        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          selectedVendor.speed <= 2 && Date.now() - selectedVendor.lastSeen < 30000 
                            ? 'bg-green-100 text-green-700' 
                            : Date.now() - selectedVendor.lastSeen < 30000 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            selectedVendor.speed <= 2 && Date.now() - selectedVendor.lastSeen < 30000 
                              ? 'bg-green-500 animate-pulse' 
                              : Date.now() - selectedVendor.lastSeen < 30000 
                                ? 'bg-yellow-500 animate-pulse' 
                                : 'bg-gray-400'
                          }`}></div>
                          {selectedVendor.speed <= 2 && Date.now() - selectedVendor.lastSeen < 30000 
                            ? 'OPEN NOW' 
                            : Date.now() - selectedVendor.lastSeen < 30000 
                              ? 'En Route' 
                              : 'Offline'}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm text-center">
                        <div>
                          <div className="font-bold text-lg">{Math.round(selectedVendor.speed || 0)}</div>
                          <div className="text-gray-600 text-xs">km/h</div>
                        </div>
                        <div>
                          <div className="font-bold text-lg">±{Math.round(selectedVendor.accuracy || 0)}</div>
                          <div className="text-gray-600 text-xs">meters</div>
                        </div>
                        <div>
                          <div className="font-bold text-lg text-orange-600">
                            {selectedVendor.speed <= 2 ? 'HERE' : '5'}
                          </div>
                          <div className="text-gray-600 text-xs">{selectedVendor.speed <= 2 ? 'NOW' : 'min ETA'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="w-4 h-4 mr-2" />
                      {selectedVendor.location.address}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center text-sm md:text-base">
                        <Navigation className="w-4 h-4 mr-2" />
                        Get Directions
                      </button>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            setCurrentVendor(selectedVendor);
                            setShowReviewModal(true);
                          }}
                          className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Write a Review"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <h3 className="font-semibold text-base md:text-lg mb-4 flex items-center gap-2">
                      <Utensils className="w-4 md:w-5 h-4 md:h-5" />
                      Live Menu ({selectedVendor.dishes?.length || 0} items)
                    </h3>
                    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                      {selectedVendor.dishes?.map(dish => (
                        <div key={dish.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm md:text-base">{dish.name}</h4>
                            <span className="font-bold text-orange-600 text-sm md:text-base">${dish.price}</span>
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 mb-3">{dish.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {dish.category}
                            </span>
                            {cartQuantities[dish.id] ? (
                              <div className="flex items-center gap-2 bg-orange-100 rounded-lg px-2 py-1">
                                <button
                                  onClick={() => clearFromCart(dish.id)}
                                  className="text-red-600 hover:text-red-700 transition-colors p-1"
                                  title="Remove from cart"
                                >
                                  <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
                                </button>
                                <span className="text-orange-700 font-semibold min-w-[1.5rem] text-center text-xs md:text-sm">
                                  {cartQuantities[dish.id]}
                                </span>
                                <button
                                  onClick={() => addToCart(dish.id)}
                                  className="text-orange-600 hover:text-orange-700 transition-colors p-1"
                                  title="Add to cart"
                                >
                                  <Plus className="w-3 md:w-4 h-3 md:h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(dish.id)}
                                className="bg-orange-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm hover:bg-orange-700 transition-colors"
                                title="Add to cart"
                              >
                                <Plus className="w-3 md:w-4 h-3 md:h-4 mr-1" />
                                Add to Order
                              </button>
                            )}
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-gray-500">
                          <Utensils className="w-8 md:w-12 h-8 md:h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm md:text-base">Menu loading...</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-4 md:pt-6">
                      <h3 className="font-semibold text-base md:text-lg mb-4 flex items-center gap-2">
                        <MessageCircle className="w-4 md:w-5 h-4 md:h-5" />
                        Customer Reviews ({selectedVendor.reviews?.length || 0})
                      </h3>
                      
                      <div className="space-y-3 md:space-y-4">
                        {selectedVendor.reviews?.length > 0 ? (
                          selectedVendor.reviews.slice().reverse().map(review => (
                            <div key={review.id} className="bg-gray-50 rounded-lg p-3 md:p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 text-sm md:text-base">{review.userName}</span>
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <StarIcon
                                        key={star}
                                        className={`w-3 md:w-4 h-3 md:h-4 ${
                                          star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <span className="text-xs text-gray-500">{review.date}</span>
                              </div>
                              <p className="text-gray-700 text-xs md:text-sm">{review.text}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            <MessageCircle className="w-6 md:w-8 h-6 md:h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs md:text-sm">No reviews yet</p>
                            <p className="text-xs">Be the first to write a review!</p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          setCurrentVendor(selectedVendor);
                          setShowReviewModal(true);
                        }}
                        className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Write a Review
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold">Live Food Trucks</h2>
                <div className="text-xs text-gray-500">
                  {filteredVendors.filter(v => Date.now() - v.lastSeen < 30000).length} live now
                </div>
              </div>
              <div className="space-y-3 md:space-y-4">
                {filteredVendors.map(vendor => {
                  const isOnline = vendor.isOnline; // Controlled by "Go Live Now" button
                  const isArrived = isOnline && vendor.speed <= 2;
                  
                  return (
                    <div key={vendor.id} className={`cursor-pointer rounded-xl md:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border ${
                      vendor.isOnline 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-green-100' 
                        : 'bg-white border-gray-100'
                    }`} onClick={() => handleVendorSelect(vendor)}>
                      <div className="p-4 md:p-6">
                        <div className="flex items-start justify-between mb-3 md:mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg md:text-xl font-bold text-gray-900">{vendor.name}</h3>
                              <div className={`w-2 h-2 rounded-full ${
                                vendor.isOnline 
                                  ? 'bg-green-500 animate-pulse' 
                                  : isArrived 
                                    ? 'bg-green-500 animate-pulse' 
                                    : isOnline 
                                      ? 'bg-yellow-500' 
                                      : 'bg-gray-400'
                              }`}></div>
                              {vendor.isOnline ? (
                                <div className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full font-medium shadow-sm">
                                  🔴 LIVE NOW
                                </div>
                              ) : isArrived ? (
                                <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                  OPEN NOW
                                </div>
                              ) : null}
                            </div>
                            <p className="text-gray-600 text-xs md:text-sm mb-3">{vendor.description}</p>
                          </div>
                          <div className="ml-3 md:ml-4 text-2xl md:text-3xl">{vendor.emoji}</div>
                        </div>
                        
                        <div className="flex items-center text-gray-500 text-xs md:text-sm mb-3">
                          <MapPin className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" />
                          <span className="truncate">{vendor.location.address}</span>
                          <span className="ml-2 text-orange-600 font-medium">• 5 min</span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600 flex-wrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMenuOnlyView(vendor);
                              }}
                              className="flex items-center hover:text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg transition-colors"
                              title="View Menu"
                            >
                              <Edit className="w-3 md:w-4 h-3 md:h-4 mr-1" />
                              {vendor.dishes?.length || 0} dishes
                            </button>
                            <span className="flex items-center">
                              <Star className="w-3 md:w-4 h-3 md:h-4 mr-1 fill-yellow-400 text-yellow-400" />
                              {vendor.rating}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReviewsOnlyView(vendor);
                              }}
                              className="flex items-center hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                              title="View Reviews"
                            >
                              <MessageCircle className="w-3 md:w-4 h-3 md:h-4 mr-1" />
                              {vendor.reviews?.length || 0} reviews
                            </button>
                            {vendor.speed > 5 && (
                              <span className="flex items-center text-blue-600">
                                <TrendingUp className="w-3 md:w-4 h-3 md:h-4 mr-1" />
                                Moving
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="text-orange-600 font-semibold hover:text-orange-700 transition-colors text-sm md:text-base">
                              {isArrived ? 'Order Now →' : 'View Live →'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;