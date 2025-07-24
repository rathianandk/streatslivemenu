# 🚚 sTrEATs Live - Real-Time Food Truck Tracking Platform

> **🌐 Live Demo: [https://gen-lang-client-0811007768.uc.r.appspot.com](https://gen-lang-client-0811007768.uc.r.appspot.com)**  
> **📱 Mobile Responsive | 🗺️ Google Maps Integration | ⚡ Real-Time Updates | 🔔 Smart Notifications**

## 🏆 Hackathon Submission Overview

sTrEATs Live is a comprehensive **dual-mode platform** that revolutionizes the food truck industry by connecting vendors and customers through real-time location tracking, smart notifications, and seamless ordering experiences. Built with modern web technologies and deployed on Google Cloud Platform.

---

## 🎯 Problem Statement

**For Customers:** Finding food trucks is a game of chance - you never know when or where your favorite truck will be.

**For Vendors:** Limited visibility and customer reach, difficulty in building loyal customer base, no efficient way to notify customers about location and availability.

**Our Solution:** A unified platform that bridges this gap with real-time tracking, smart notifications, and comprehensive vendor management tools.

---

## 🚀 Key Features

### 👥 **For Customers**

#### 🗺️ **Real-Time Food Truck Discovery**
- **Interactive Google Maps Integration**: View all active food trucks in your area
- **Live Location Updates**: See exact positions of trucks, push carts, and stationary stalls
- **Status Indicators**: Instantly know which vendors are online/offline
- **Hybrid Location Model**: Support for mobile trucks, push carts, and fixed stalls

#### 🔔 **Smart Notification System**
- **Welcome Notifications**: Personalized greeting when entering customer mode
- **Go-Live Alerts**: Get notified when your favorite food trucks start serving
- **Offline Notifications**: Know when vendors stop serving
- **Toast Notifications**: Non-intrusive popup alerts with auto-dismiss
- **Notification History**: Bell icon with unread count and dropdown history
- **Vendor Context**: Each notification includes vendor name and relevant details

#### 🍕 **Enhanced Discovery & Ordering**
- **Detailed Vendor Profiles**: View menus, ratings, operating hours, and specialties
- **Menu Browsing**: Explore full menus with descriptions and pricing
- **Customer Reviews**: Read and write reviews with star ratings
- **Get Directions**: One-click Google Maps navigation to vendor location
- **Operating Hours**: See when vendors will be available

#### 📱 **User Experience**
- **Mobile-First Design**: Optimized for on-the-go usage
- **Responsive Interface**: Works seamlessly on all devices
- **Intuitive Navigation**: Clean, modern UI with easy switching between modes

### 🏪 **For Vendors**

#### 📍 **Location Management**
- **Go Live System**: One-click to start serving and appear on customer maps
- **Real-Time Location Updates**: Set and update your current serving location
- **Operating Hours Management**: Set and display your service hours
- **Status Control**: Toggle online/offline status instantly
- **Location Types**: Support for trucks (mobile), push carts, and stationary stalls

#### 🍽️ **Menu & Business Management**
- **Dynamic Menu Editor**: Add, edit, and remove menu items in real-time
- **Pricing Management**: Set and update prices instantly
- **Dish Categories**: Organize menu items by categories
- **Dish Descriptions**: Detailed descriptions for each menu item
- **Inventory Control**: Mark items as available/unavailable

#### 📊 **Customer Engagement**
- **Review Management**: View and respond to customer reviews
- **Rating System**: Track your overall rating and individual dish ratings
- **Customer Notifications**: Automatically notify customers when you go live
- **Profile Management**: Update business information, specialties, and photos

#### 💼 **Vendor Dashboard**
- **Comprehensive Control Panel**: Manage all aspects of your business
- **Quick Actions**: Fast access to common tasks (go live, update menu, etc.)
- **Business Analytics**: View customer engagement and reviews
- **Profile Customization**: Update vendor information and specialties

---

## 🛠️ Technical Architecture

### **Frontend**
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for modern, responsive design
- **Google Maps JavaScript API** for mapping and directions
- **Lucide React** for consistent iconography
- **Real-time state management** with React hooks

### **Backend**
- **Node.js** with Express.js framework
- **SQLite** database for efficient data storage
- **RESTful API** design with full CRUD operations
- **Real-time data synchronization**

### **Infrastructure**
- **Google Cloud Platform** (App Engine) for scalable hosting
- **Automatic scaling** (1-10 instances based on demand)
- **HTTPS enforcement** for security
- **Environment variable management** for configuration

### **Key APIs & Integrations**
- **Google Maps JavaScript API** for mapping
- **Google Directions API** for navigation
- **Responsive design** for cross-device compatibility

---

## 🎨 Innovation Highlights

### **Dual-Mode Architecture**
- **Seamless Mode Switching**: Single app serves both customers and vendors
- **Context-Aware Interface**: UI adapts based on user type
- **Shared Data Model**: Efficient data sharing between modes

### **Smart Notification System**
- **Real-time Updates**: Instant notifications when vendors change status
- **Non-Intrusive Design**: Toast notifications with auto-dismiss
- **Persistent History**: Notification bell with unread count and history
- **Contextual Information**: Each notification includes relevant vendor details

### **Hybrid Location Model**
- **Flexible Vendor Types**: Support for mobile trucks, push carts, and stationary stalls
- **Dynamic Location Updates**: Real-time position tracking
- **Status Management**: Online/offline status with automatic customer notifications

### **User Experience Excellence**
- **Mobile-First Design**: Optimized for smartphone usage
- **Intuitive Navigation**: Clean, modern interface with logical flow
- **Performance Optimized**: Fast loading and smooth interactions
- **Accessibility Focused**: Designed for users of all abilities

---

## 🚀 Getting Started

### **Live Demo**
🌐 **Production**: [https://gen-lang-client-0811007768.uc.r.appspot.com](https://gen-lang-client-0811007768.uc.r.appspot.com)

### **Local Development**

```bash
# Clone the repository
git clone https://github.com/rathianandk/streatslivemenu.git
cd streeteats-app

# Install dependencies
npm install

# Start backend server (Terminal 1)
npm start

# Start frontend development server (Terminal 2)
npm run dev

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
```

### **Environment Setup**

1. **Google Maps API Key**: Add your API key to `.env`:
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

2. **Database**: SQLite database is automatically created and seeded with sample data

---

## 📱 Usage Guide

### **For Customers**
1. **Open the app** - Defaults to customer view with map
2. **Explore vendors** - See all active food trucks on the map
3. **Get notifications** - Receive alerts when vendors go live
4. **View details** - Click on vendors to see menus and reviews
5. **Get directions** - One-click navigation to vendor location

### **For Vendors**
1. **Switch to vendor mode** - Click "Vendor Login" in the header
2. **Create/Login** - Set up your vendor profile
3. **Go Live** - Click "Go Live Now" to appear on customer maps
4. **Manage menu** - Add/edit dishes and pricing
5. **Track engagement** - View customer reviews and ratings

---

## 🏗️ Project Structure

```
streeteats-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── GoogleMap.tsx    # Interactive map component
│   │   └── VendorDashboard.tsx # Vendor management interface
│   ├── services/            # API and external services
│   │   └── api.ts          # Backend API integration
│   ├── App.tsx             # Main application component
│   └── index.tsx           # Application entry point
├── public/                 # Static assets
├── build/                  # Production build output
├── server.js              # Express.js backend server
├── app.yaml               # Google Cloud deployment config
└── package.json           # Dependencies and scripts
```

---

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start React development server
npm start            # Start backend server
npm test             # Run test suite

# Production
npm run build        # Build for production
npm run deploy:gcp   # Deploy to Google Cloud Platform

# Utilities
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

---

## 🌟 Future Enhancements

- **Real-time Chat**: Direct messaging between customers and vendors
- **Order Management**: Full ordering and payment system
- **Analytics Dashboard**: Business insights for vendors
- **Push Notifications**: Mobile app with push notification support
- **Social Features**: Customer check-ins and social sharing
- **Advanced Filtering**: Search by cuisine type, price range, ratings
- **Loyalty Programs**: Rewards system for frequent customers

---

## 🤝 Contributing

This is a hackathon submission, but we welcome feedback and suggestions for future development.

---

## 📄 License

MIT License - feel free to use this project as inspiration for your own food truck tracking solutions!

---

## 👨‍💻 Built With ❤️ for the Hackathon

**Team**: Passionate developers solving real-world problems in the food truck industry

**Mission**: Connecting food lovers with their favorite mobile vendors through technology

**Vision**: Making street food discovery effortless and enjoyable for everyone
