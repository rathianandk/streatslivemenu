import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, MapPin, Menu, User, Navigation, ArrowLeft, Edit, Trash2, Save, X, Clock, Star, Filter, ZoomIn, ZoomOut, Target, Timer, Utensils, DollarSign, TrendingUp, RadioIcon, Globe, Play, Pause, MessageCircle, Send, StarIcon } from 'lucide-react';

// Mock Location Service
class LocationService {
  isConnected: boolean;
  subscribers: Set<any>;
  simulationActive: boolean;
  simulationInterval: any;
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
  
  subscribe(callback: any) {
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
  
  startSimulation(vendors: any[], updateCallback: any) {
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
  
  toggleSimulation(vendors: any[], updateCallback: any) {
    if (this.simulationActive) {
      this.stopSimulation();
      return false;
    } else {
      this.startSimulation(vendors, updateCallback);
      return true;
    }
  }
}

// Type definitions
interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface Dish {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
}

interface Vendor {
  id: number;
  name: string;
  description: string;
  location: Location;
  dishes: Dish[];
}

interface MapComponentProps {
  vendors: Vendor[];
  onMarkerClick: (vendor: Vendor) => void;
  center: Location;
  zoom?: number;
  onLocationSelect: () => void;
  showLocationPicker?: boolean;
}

interface VendorModalProps {
  vendor: Vendor | null;
  onSave: (vendorData: Vendor) => void;
  onClose: () => void;
}

interface DishModalProps {
  dish: Dish | null;
  vendorId: number;
  onSave: (dishData: Dish, vendorId: number) => void;
  onClose: () => void;
}

interface VendorDashboardProps {
  vendor: Vendor;
}

const StreetEatsApp = () => {
  const [vendors, setVendors] = useState<Vendor[]>([
    {
      id: 1,
      name: "Tandoori Treats",
      description: "Authentic Indian street food with aromatic spices and traditional recipes",
      location: { lat: 37.7749, lng: -122.4194, address: "San Francisco, CA" },
      dishes: [
        {
          id: 1,
          name: "Chicken Tikka Masala",
          description: "Tender chicken in creamy tomato sauce",
          price: 12.99,
          category: "Main Course",
          imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=200&fit=crop"
        },
        {
          id: 2,
          name: "Samosas",
          description: "Crispy pastries filled with spiced potatoes",
          price: 6.99,
          category: "Appetizers",
          imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=200&fit=crop"
        }
      ]
    },
    {
      id: 2,
      name: "Taco Fiesta",
      description: "Fresh Mexican street tacos and authentic flavors",
      location: { lat: 37.7849, lng: -122.4094, address: "Mission District, San Francisco, CA" },
      dishes: [
        {
          id: 3,
          name: "Al Pastor Tacos",
          description: "Marinated pork with pineapple and cilantro",
          price: 8.99,
          category: "Tacos",
          imageUrl: "https://images.unsplash.com/photo-1565299585323-38174c01dd0c?w=300&h=200&fit=crop"
        }
      ]
    }
  ]);

  const [currentView, setCurrentView] = useState('homepage');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showDishModal, setShowDishModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Mock Google Maps functionality (replace with actual Google Maps API)
  const MapComponent: React.FC<MapComponentProps> = ({ vendors, onMarkerClick, center, zoom = 12, onLocationSelect, showLocationPicker = false }) => {
    return (
      <div className="w-full h-64 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-200 opacity-50"></div>
        <div className="z-10 text-center">
          <MapPin className="mx-auto mb-2 text-blue-600" size={32} />
          <p className="text-sm text-gray-600 mb-2">Google Maps Integration</p>
          <p className="text-xs text-gray-500">Add your Google Maps API key to enable interactive maps</p>
          {showLocationPicker && (
            <button
              onClick={() => {
                const mockLat = 37.7749 + (Math.random() - 0.5) * 0.01;
                const mockLng = -122.4194 + (Math.random() - 0.5) * 0.01;
                const newLocation: Location = {
                  lat: mockLat,
                  lng: mockLng,
                  address: `${mockLat.toFixed(4)}, ${mockLng.toFixed(4)}`
                };
                setSelectedLocation(newLocation);
              }}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Pick Location
            </button>
          )}
        </div>
        {vendors && vendors.length > 0 && (
          <div className="absolute bottom-2 right-2">
            <span className="bg-white px-2 py-1 rounded text-xs">
              {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} shown
            </span>
          </div>
        )}
      </div>
    );
  };

  const VendorModal: React.FC<VendorModalProps> = ({ vendor, onSave, onClose }) => {
    const [formData, setFormData] = useState({
      name: vendor?.name || '',
      description: vendor?.description || '',
      location: vendor?.location || selectedLocation || { lat: 0, lng: 0, address: '' }
    });

    useEffect(() => {
      if (selectedLocation) {
        setFormData(prev => ({ ...prev, location: selectedLocation }));
      }
    }, [selectedLocation]);

    const handleSubmit = () => {
      if (!formData.name.trim()) return;

      const vendorData: Vendor = {
        ...formData,
        id: vendor?.id || Date.now(),
        dishes: vendor?.dishes || []
      };

      onSave(vendorData);
      onClose();
      setSelectedLocation(null);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">
            {vendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <MapComponent 
                showLocationPicker={true}
                center={formData.location}
                vendors={[]}
                onMarkerClick={() => {}}
                onLocationSelect={() => {}}
              />
              {formData.location.address && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {formData.location.address}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors"
              >
                {vendor ? 'Update' : 'Create'} Vendor
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DishModal: React.FC<DishModalProps> = ({ dish, vendorId, onSave, onClose }) => {
    const [formData, setFormData] = useState({
      name: dish?.name || '',
      description: dish?.description || '',
      price: dish?.price || '',
      category: dish?.category || '',
      imageUrl: dish?.imageUrl || ''
    });

    const handleSubmit = () => {
      if (!formData.name.trim() || !formData.price) return;

      const dishData: Dish = {
        ...formData,
        id: dish?.id || Date.now(),
        price: typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price
      };

      onSave(dishData, vendorId);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4 text-gray-800">
            {dish ? 'Edit Dish' : 'Add New Dish'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dish Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Main Course, Appetizers, Desserts"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors"
              >
                {dish ? 'Update' : 'Add'} Dish
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Homepage = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <header className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              StreetEats
            </h1>
            <p className="text-gray-600 mt-2">Discover amazing street food vendors near you</p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Find Vendors</h2>
            <MapComponent 
              vendors={vendors}
              onMarkerClick={(vendor: Vendor) => {
                setSelectedVendor(vendor);
                setCurrentView('vendor');
              }}
              center={{ lat: 37.7749, lng: -122.4194, address: "San Francisco, CA" }}
              onLocationSelect={() => {}}
            />
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">All Vendors</h2>
            <button
              onClick={() => setShowVendorModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-colors shadow-lg"
            >
              <Plus size={20} />
              Add Vendor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <div
                key={vendor.id.toString()}
                onClick={() => {
                  setSelectedVendor(vendor);
                  setCurrentView('vendor');
                }}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer overflow-hidden group"
              >
                <div className="h-48 bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🍽️</div>
                    <p className="text-sm text-gray-600">{vendor.dishes.length} dishes</p>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors">
                    {vendor.name}
                  </h3>
                  <p className="text-gray-600 mb-3 line-clamp-2">{vendor.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin size={16} className="mr-1" />
                    <span>{vendor.location.address}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-yellow-500">
                      <Star size={16} fill="currentColor" />
                      <span className="text-sm text-gray-600 ml-1">4.5</span>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Clock size={16} />
                      <span className="text-sm ml-1">20-30 min</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {vendors.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍴</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No vendors yet</h3>
              <p className="text-gray-600 mb-6">Be the first to add a street food vendor!</p>
              <button
                onClick={() => setShowVendorModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-colors"
              >
                Add First Vendor
              </button>
            </div>
          )}
        </main>
      </div>
    );
  };

  const VendorDashboard: React.FC<VendorDashboardProps> = ({ vendor }) => {
    const [activeSection, setActiveSection] = useState('overview');
    const groupedDishes = vendor.dishes.reduce((acc: { [key: string]: Dish[] }, dish: Dish) => {
      const category = dish.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(dish);
      return acc;
    }, {});

    const sidebarItems = [
      { id: 'overview', label: 'Overview', icon: '📊' },
      { id: 'menu', label: 'Menu', icon: '📋' },
      { id: 'location', label: 'Location', icon: '📍' },
      { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => setCurrentView('homepage')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              Back to StreetEats
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{vendor.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Vendor Dashboard</p>
          </div>
          
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {sidebarItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === item.id 
                        ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {activeSection === 'overview' && 'Overview'}
                  {activeSection === 'menu' && 'Menu Management'}
                  {activeSection === 'location' && 'Location & Map'}
                  {activeSection === 'settings' && 'Vendor Settings'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {activeSection === 'overview' && 'Your vendor performance and summary'}
                  {activeSection === 'menu' && 'Manage your dishes and categories'}
                  {activeSection === 'location' && 'View and update your location'}
                  {activeSection === 'settings' && 'Edit vendor information and preferences'}
                </p>
              </div>
              {activeSection === 'menu' && (
                <button
                  onClick={() => setShowDishModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                >
                  <Plus size={16} />
                  Add Dish
                </button>
              )}
              {activeSection === 'settings' && (
                <button
                  onClick={() => {
                    setEditingVendor(vendor);
                    setShowVendorModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <Edit size={16} />
                  Edit Profile
                </button>
              )}
            </div>
          </header>

          <main className="flex-1 p-8 overflow-y-auto">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Dishes</p>
                        <p className="text-2xl font-semibold text-gray-900">{vendor.dishes.length}</p>
                      </div>
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <span className="text-2xl">🍽️</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Categories</p>
                        <p className="text-2xl font-semibold text-gray-900">{Object.keys(groupedDishes).length}</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <span className="text-2xl">📂</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Rating</p>
                        <p className="text-2xl font-semibold text-gray-900">4.5</p>
                      </div>
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Star size={24} fill="currentColor" className="text-yellow-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="text-gray-900">{vendor.description}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <div className="flex items-center gap-2 text-gray-900">
                        <MapPin size={16} />
                        {vendor.location.address}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'menu' && (
              <div className="space-y-6">
                {Object.keys(groupedDishes).length > 0 ? (
                  Object.entries(groupedDishes).map(([category, dishes]) => (
                    <div key={category} className="bg-white rounded-lg border border-gray-200">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                        <p className="text-sm text-gray-500">{dishes.length} dish{dishes.length !== 1 ? 'es' : ''}</p>
                      </div>
                      <div className="p-6">
                        <div className="space-y-4">
                          {dishes.map((dish) => (
                            <div key={dish.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                {dish.imageUrl ? (
                                  <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <span className="text-xl">🍽️</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{dish.name}</h4>
                                <p className="text-sm text-gray-500 mt-1">{dish.description}</p>
                                <p className="text-sm font-medium text-green-600 mt-2">${dish.price.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingDish(dish);
                                    setShowDishModal(true);
                                  }}
                                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this dish?')) {
                                      const updatedVendors = vendors.map(v => 
                                        v.id === vendor.id 
                                          ? {...v, dishes: v.dishes.filter(d => d.id !== dish.id)}
                                          : v
                                      );
                                      setVendors(updatedVendors);
                                      const updatedVendor = updatedVendors.find(v => v.id === vendor.id);
                                      if (updatedVendor) {
                                        setSelectedVendor(updatedVendor);
                                      }
                                    }
                                  }}
                                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-4">🍽️</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No dishes yet</h3>
                    <p className="text-gray-500 mb-6">Start building your menu by adding your first dish!</p>
                    <button
                      onClick={() => setShowDishModal(true)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Add First Dish
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'location' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Location</h3>
                  <div className="flex items-center gap-2 text-gray-700 mb-6">
                    <MapPin size={20} />
                    <span>{vendor.location.address}</span>
                  </div>
                  <MapComponent 
                    center={vendor.location}
                    vendors={[vendor]}
                    zoom={15}
                    onMarkerClick={() => {}}
                    onLocationSelect={() => {}}
                  />
                </div>
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name</label>
                      <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                        {vendor.name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                        {vendor.description}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                        {vendor.location.address}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  };

  // Event handlers
  const handleSaveVendor = (vendorData: Vendor) => {
    if (editingVendor) {
      const updatedVendors = vendors.map(v => v.id === vendorData.id ? vendorData : v);
      setVendors(updatedVendors);
      if (selectedVendor?.id === vendorData.id) {
        setSelectedVendor(vendorData);
      }
    } else {
      setVendors([...vendors, vendorData]);
    }
    setEditingVendor(null);
  };

  const handleSaveDish = (dishData: Dish, vendorId: number) => {
    const updatedVendors = vendors.map(vendor => {
      if (vendor.id === vendorId) {
        const updatedDishes = editingDish
          ? vendor.dishes.map(dish => dish.id === dishData.id ? dishData : dish)
          : [...vendor.dishes, dishData];
        return { ...vendor, dishes: updatedDishes };
      }
      return vendor;
    });
    
    setVendors(updatedVendors);
    const updatedVendor = updatedVendors.find(v => v.id === vendorId);
    if (updatedVendor) {
      setSelectedVendor(updatedVendor);
    }
    setEditingDish(null);
  };

  return (
    <div className="font-sans">
      {currentView === 'homepage' && <Homepage />}
      {currentView === 'vendor' && selectedVendor && <VendorDashboard vendor={selectedVendor} />}
      
      {showVendorModal && (
        <VendorModal
          vendor={editingVendor}
          onSave={handleSaveVendor}
          onClose={() => {
            setShowVendorModal(false);
            setEditingVendor(null);
            setSelectedLocation(null);
          }}
        />
      )}

      {showDishModal && (
        <DishModal
          dish={editingDish}
          vendorId={selectedVendor?.id || 0}
          onSave={handleSaveDish}
          onClose={() => {
            setShowDishModal(false);
            setEditingDish(null);
          }}
        />
      )}
    </div>
  );
};

function App() {
  return <StreetEatsApp />;
}

export default App;
