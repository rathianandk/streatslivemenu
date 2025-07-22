// API service for connecting to SQLite backend
const API_BASE_URL = 'http://localhost:3001/api';

export interface ApiVendor {
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
  };
  lastSeen: number;
  speed: number;
  heading: number;
  accuracy: number;
  dishes: ApiDish[];
  reviews: ApiReview[];
  status?: string;
  estimatedTime?: number;
  // Hybrid Location Model fields
  vendorType?: 'truck' | 'pushcart' | 'stall';
  isStationary?: boolean;
  hasFixedAddress?: boolean;
  locationMarkedAt?: number;
}

export interface ApiDish {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

export interface ApiReview {
  id: number;
  userName: string;
  rating: number;
  text: string;
  date: string;
  timestamp: number;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Vendor operations
  async getVendors(): Promise<ApiVendor[]> {
    return this.request<ApiVendor[]>('/vendors');
  }

  async createVendor(vendor: Omit<ApiVendor, 'id' | 'dishes' | 'reviews' | 'lastSeen' | 'speed' | 'heading' | 'accuracy'>): Promise<ApiVendor> {
    return this.request<ApiVendor>('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendor),
    });
  }

  async updateVendor(id: number, vendor: Partial<ApiVendor>): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vendor),
    });
  }

  // Dish operations
  async addDish(vendorId: number, dish: Omit<ApiDish, 'id'>): Promise<ApiDish> {
    return this.request<ApiDish>(`/vendors/${vendorId}/dishes`, {
      method: 'POST',
      body: JSON.stringify(dish),
    });
  }

  async updateDish(dishId: number, dish: Partial<ApiDish>): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/dishes/${dishId}`, {
      method: 'PUT',
      body: JSON.stringify(dish),
    });
  }

  async deleteDish(dishId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/dishes/${dishId}`, {
      method: 'DELETE',
    });
  }

  // Review operations
  async addReview(vendorId: number, review: Omit<ApiReview, 'id'>): Promise<ApiReview> {
    return this.request<ApiReview>(`/vendors/${vendorId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }

  // Utility operations
  async seedDatabase(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/seed', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
