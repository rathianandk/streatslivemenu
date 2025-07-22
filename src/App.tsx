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
    address: ''
  });

  const emojiOptions = ['🌮', '🍜', '🍔', '🍕', '🍣', '🧇', '☕', '🍦', '🥙', '🍝', '🍲', '🚚'];
  const cuisineOptions = ['Mexican', 'Asian', 'American', 'Italian', 'Japanese', 'Mediterranean', 'Indian', 'Thai', 'Chinese', 'BBQ', 'Desserts', 'Coffee'];

  const handleSubmit = () => {
    if (!newVendor.name || !newVendor.description || !newVendor.cuisine) return;
    
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
        address: newVendor.address || 'San Francisco, CA'
      },
      lastSeen: Date.now(),
      speed: Math.random() * 5,
      heading: Math.random() * 360,
      accuracy: Math.random() * 10 + 5,
      dishes: [],
      reviews: []
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
              <h2 className="text-lg md:text-xl font-bold">Add New Food Truck</h2>
              <p className="opacity-90 text-sm md:text-base">Join the StreetEats network</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Truck Name</label>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {showMenuBuilder && (
        <MenuBuilder
          vendor={currentVendor}
          onUpdateVendor={onUpdateVendor}
          onClose={() => setShowMenuBuilder(false)}
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
            
            <div className={`flex items-center gap-2 text-xs md:text-sm px-3 py-2 rounded-full ${
              Date.now() - currentVendor?.lastSeen < 30000 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                Date.now() - currentVendor?.lastSeen < 30000 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
              {Date.now() - currentVendor?.lastSeen < 30000 ? 'Live & Online' : 'Offline'}
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Live Location Tracking</h2>
            <p className="text-gray-600 mb-6">Monitor your truck's real-time location and customer reach</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{Math.round(currentVendor?.speed || 0)} km/h</div>
                <div className="text-gray-600">Current Speed</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">±{Math.round(currentVendor?.accuracy || 0)}m</div>
                <div className="text-gray-600">GPS Accuracy</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{currentVendor?.location?.address || 'Unknown'}</div>
                <div className="text-gray-600">Current Location</div>
              </div>
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
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
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
          reviews: apiVendor.reviews
        }));
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
            reviews: apiVendor.reviews
          }));
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

  const handleReviewsOnlyView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowReviewsOnly(true);
    setShowMenuOnly(false);
    setMapZoom(16);
  };

  const handleUpdateVendor = async (updatedVendor: Vendor) => {
    try {
      // Update vendor in database
      await apiService.updateVendor(updatedVendor.id, {
        name: updatedVendor.name,
        description: updatedVendor.description,
        cuisine: updatedVendor.cuisine,
        emoji: updatedVendor.emoji,
        rating: updatedVendor.rating,
        location: updatedVendor.location
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
        reviews: []
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
            {vendors.map(vendor => (
              <button
                key={vendor.id}
                onClick={() => handleVendorLogin(vendor.id)}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl md:text-3xl mr-3 md:mr-4">{vendor.emoji}</span>
                    <div>
                      <div className="font-bold text-gray-900 text-sm md:text-base">{vendor.name}</div>
                      <div className="text-xs md:text-sm text-gray-600">{vendor.cuisine} • {vendor.dishes?.length || 0} dishes</div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                      Date.now() - vendor.lastSeen < 30000 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        Date.now() - vendor.lastSeen < 30000 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`}></div>
                      {Date.now() - vendor.lastSeen < 30000 ? 'Live' : 'Offline'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
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
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Vendor Login</span>
                <span className="sm:hidden">Login</span>
              </button>
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

        <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-96 lg:max-h-none overflow-hidden">
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
                              <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition-colors">
                                Add to Order
                              </button>
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
                        <button 
                          onClick={() => {
                            setCurrentVendor(selectedVendor);
                            setShowMenuBuilder(true);
                          }}
                          className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Edit Menu"
                        >
                          <Edit className="w-4 h-4" />
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
                            <button className="bg-orange-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm hover:bg-orange-700 transition-colors">
                              Add to Order
                            </button>
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
                  const isOnline = Date.now() - vendor.lastSeen < 30000;
                  const isArrived = isOnline && vendor.speed <= 2;
                  
                  return (
                    <div key={vendor.id} className="cursor-pointer bg-white rounded-xl md:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100" onClick={() => handleVendorSelect(vendor)}>
                      <div className="p-4 md:p-6">
                        <div className="flex items-start justify-between mb-3 md:mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg md:text-xl font-bold text-gray-900">{vendor.name}</h3>
                              <div className={`w-2 h-2 rounded-full ${
                                isArrived ? 'bg-green-500 animate-pulse' : isOnline ? 'bg-yellow-500' : 'bg-gray-400'
                              }`}></div>
                              {isArrived && (
                                <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                  OPEN NOW
                                </div>
                              )}
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
                              <Utensils className="w-3 md:w-4 h-3 md:h-4 mr-1" />
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentVendor(vendor);
                                setShowReviewModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Write Review"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
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