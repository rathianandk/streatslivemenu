const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'streeteats.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  // Vendors table
  db.run(`CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cuisine TEXT,
    emoji TEXT,
    rating REAL DEFAULT 0,
    lat REAL,
    lng REAL,
    address TEXT,
    lastSeen INTEGER,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    accuracy REAL DEFAULT 5,
    status TEXT DEFAULT 'active',
    estimatedTime INTEGER DEFAULT 0,
    vendorType TEXT DEFAULT 'truck',
    isStationary BOOLEAN DEFAULT 0,
    hasFixedAddress BOOLEAN DEFAULT 1,
    locationMarkedAt INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add Hybrid Location Model columns if they don't exist (migration)
  db.run(`ALTER TABLE vendors ADD COLUMN vendorType TEXT DEFAULT 'truck'`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error for vendorType:', err.message);
    }
  });
  
  db.run(`ALTER TABLE vendors ADD COLUMN isStationary BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error for isStationary:', err.message);
    }
  });
  
  db.run(`ALTER TABLE vendors ADD COLUMN hasFixedAddress BOOLEAN DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error for hasFixedAddress:', err.message);
    }
  });
  
  db.run(`ALTER TABLE vendors ADD COLUMN locationMarkedAt INTEGER`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error for locationMarkedAt:', err.message);
    }
  });

  // Dishes table
  db.run(`CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT DEFAULT 'Main',
    available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors (id)
  )`);

  // Reviews table
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER,
    userName TEXT NOT NULL,
    rating INTEGER NOT NULL,
    text TEXT,
    date TEXT,
    timestamp INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors (id)
  )`);
});

// API Routes

// Get all vendors with their dishes and reviews
app.get('/api/vendors', (req, res) => {
  const query = `
    SELECT v.*, 
           json_group_array(
             json_object(
               'id', d.id,
               'name', d.name,
               'description', d.description,
               'price', d.price,
               'category', d.category,
               'available', d.available
             )
           ) as dishes
    FROM vendors v
    LEFT JOIN dishes d ON v.id = d.vendor_id
    GROUP BY v.id
  `;
  
  db.all(query, [], (err, vendors) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Get reviews for each vendor
    const vendorsWithReviews = [];
    let completed = 0;
    
    if (vendors.length === 0) {
      res.json([]);
      return;
    }
    
    vendors.forEach(vendor => {
      db.all('SELECT * FROM reviews WHERE vendor_id = ?', [vendor.id], (err, reviews) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        vendor.dishes = vendor.dishes ? JSON.parse(vendor.dishes).filter(d => d.id !== null) : [];
        vendor.reviews = reviews || [];
        vendor.location = {
          lat: vendor.lat,
          lng: vendor.lng,
          address: vendor.address
        };
        
        vendorsWithReviews.push(vendor);
        completed++;
        
        if (completed === vendors.length) {
          res.json(vendorsWithReviews);
        }
      });
    });
  });
});

// Add a new vendor
app.post('/api/vendors', (req, res) => {
  const { name, description, cuisine, emoji, rating, location } = req.body;
  
  const query = `INSERT INTO vendors (name, description, cuisine, emoji, rating, lat, lng, address, lastSeen)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [
    name, description, cuisine, emoji, rating || 0,
    location.lat, location.lng, location.address,
    Date.now()
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      id: this.lastID,
      name,
      description,
      cuisine,
      emoji,
      rating: rating || 0,
      location,
      lastSeen: Date.now(),
      speed: 0,
      heading: 0,
      accuracy: 5,
      dishes: [],
      reviews: []
    });
  });
});

// Update vendor
app.put('/api/vendors/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, cuisine, emoji, rating, location, vendorType, isStationary, hasFixedAddress, locationMarkedAt } = req.body;
  
  const query = `UPDATE vendors SET name = ?, description = ?, cuisine = ?, emoji = ?, rating = ?, 
                 lat = ?, lng = ?, address = ?, vendorType = ?, isStationary = ?, hasFixedAddress = ?, 
                 locationMarkedAt = ?, lastSeen = ? WHERE id = ?`;
  
  db.run(query, [
    name, description, cuisine, emoji, rating,
    location.lat, location.lng, location.address,
    vendorType || 'truck', 
    isStationary ? 1 : 0, 
    hasFixedAddress ? 1 : 0,
    locationMarkedAt || null,
    Date.now(),
    id
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({ message: 'Vendor updated successfully' });
  });
});

// Add dish to vendor
app.post('/api/vendors/:vendorId/dishes', (req, res) => {
  const { vendorId } = req.params;
  const { name, description, price, category, available } = req.body;
  
  const query = `INSERT INTO dishes (vendor_id, name, description, price, category, available)
                 VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [vendorId, name, description, price, category || 'Main', available !== false], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      id: this.lastID,
      name,
      description,
      price,
      category: category || 'Main',
      available: available !== false
    });
  });
});

// Update dish
app.put('/api/dishes/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, available } = req.body;
  
  const query = `UPDATE dishes SET name = ?, description = ?, price = ?, category = ?, available = ? WHERE id = ?`;
  
  db.run(query, [name, description, price, category, available, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({ message: 'Dish updated successfully' });
  });
});

// Delete dish
app.delete('/api/dishes/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM dishes WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({ message: 'Dish deleted successfully' });
  });
});

// Add review
app.post('/api/vendors/:vendorId/reviews', (req, res) => {
  const { vendorId } = req.params;
  const { userName, rating, text, date, timestamp } = req.body;
  
  const query = `INSERT INTO reviews (vendor_id, userName, rating, text, date, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [vendorId, userName, rating, text, date, timestamp], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      id: this.lastID,
      userName,
      rating,
      text,
      date,
      timestamp
    });
  });
});

// Seed initial data
app.post('/api/seed', (req, res) => {
  const seedVendors = [
    // FOOD TRUCKS (Moving with GPS tracking)
    {
      name: "Taco Express",
      description: "Authentic Mexican street tacos - push cart style!",
      cuisine: "Mexican",
      emoji: "🌮",
      rating: 4.8,
      lat: 37.7849,
      lng: -122.4094,
      address: "Mission District, SF (mobile cart)",
      vendorType: "pushcart",
      isStationary: true,
      hasFixedAddress: false
    },
    {
      name: "Burger Bliss Truck",
      description: "Gourmet burgers with local ingredients - now mobile cart!",
      cuisine: "American",
      emoji: "🍔",
      rating: 4.5,
      lat: 37.7749,
      lng: -122.4194,
      address: "Downtown SF (mobile cart)",
      vendorType: "pushcart",
      isStationary: true,
      hasFixedAddress: false
    },
    {
      name: "Ramen Runner",
      description: "Mobile ramen kitchen serving hot bowls",
      cuisine: "Japanese",
      emoji: "🍜",
      rating: 4.7,
      lat: 37.7649,
      lng: -122.4294,
      address: "SOMA District, SF",
      vendorType: "truck",
      isStationary: false,
      hasFixedAddress: true
    },
    // PUSH CARTS (Static, vendor marks spot)
    {
      name: "Samosa Cart",
      description: "Fresh samosas and chutneys - no fixed address",
      cuisine: "Indian",
      emoji: "🥟",
      rating: 4.6,
      lat: 37.7799,
      lng: -122.4144,
      address: "Near Union Square (location varies)",
      vendorType: "pushcart",
      isStationary: true,
      hasFixedAddress: false,
      locationMarkedAt: Date.now() - 3600000 // Marked 1 hour ago
    },
    {
      name: "Fruit Cart Express",
      description: "Fresh cut fruits and juices",
      cuisine: "Healthy",
      emoji: "🍎",
      rating: 4.3,
      lat: 37.7699,
      lng: -122.4244,
      address: "Financial District (mobile cart)",
      vendorType: "pushcart",
      isStationary: true,
      hasFixedAddress: false,
      locationMarkedAt: Date.now() - 1800000 // Marked 30 min ago
    },
    {
      name: "Dosa Corner",
      description: "South Indian dosas made fresh",
      cuisine: "South Indian",
      emoji: "🫓",
      rating: 4.9,
      lat: 37.7599,
      lng: -122.4344,
      address: "Castro Street (pushcart)",
      vendorType: "pushcart",
      isStationary: true,
      hasFixedAddress: false,
      locationMarkedAt: Date.now() - 7200000 // Marked 2 hours ago
    },
    // FOOD STALLS (Fixed locations)
    {
      name: "Noodle Palace",
      description: "Permanent stall serving Asian noodles",
      cuisine: "Asian Fusion",
      emoji: "🍝",
      rating: 4.4,
      lat: 37.7549,
      lng: -122.4394,
      address: "Ferry Building Marketplace",
      vendorType: "stall",
      isStationary: true,
      hasFixedAddress: true
    },
    {
      name: "Coffee Corner",
      description: "Artisan coffee and pastries",
      cuisine: "Coffee & Pastries",
      emoji: "☕",
      rating: 4.2,
      lat: 37.7449,
      lng: -122.4494,
      address: "Pier 39 Food Court",
      vendorType: "stall",
      isStationary: true,
      hasFixedAddress: true
    }
  ];

  seedVendors.forEach((vendor, index) => {
    const query = `INSERT OR IGNORE INTO vendors (id, name, description, cuisine, emoji, rating, lat, lng, address, lastSeen, vendorType, isStationary, hasFixedAddress, locationMarkedAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [
      index + 1, vendor.name, vendor.description, vendor.cuisine, vendor.emoji,
      vendor.rating, vendor.lat, vendor.lng, vendor.address, Date.now(),
      vendor.vendorType || 'truck', vendor.isStationary || false, 
      vendor.hasFixedAddress !== false, vendor.locationMarkedAt || null
    ]);
  });

  // Seed dishes
  const seedDishes = [
    { vendor_id: 1, name: "Carne Asada Taco", description: "Grilled beef with onions", price: 3.50, category: "Main" },
    { vendor_id: 1, name: "Fish Taco", description: "Beer-battered fish", price: 4.00, category: "Main" },
    { vendor_id: 2, name: "Classic Burger", description: "Grass-fed beef", price: 11.99, category: "Main" }
  ];

  seedDishes.forEach(dish => {
    const query = `INSERT OR IGNORE INTO dishes (vendor_id, name, description, price, category, available)
                   VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [dish.vendor_id, dish.name, dish.description, dish.price, dish.category, 1]);
  });

  res.json({ message: 'Database seeded successfully' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 StreetEats API server running on http://localhost:${PORT}`);
  console.log(`📊 SQLite database: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
