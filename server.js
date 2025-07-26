const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

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
    isOnline BOOLEAN DEFAULT 0,
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
  
  db.run(`ALTER TABLE vendors ADD COLUMN isOnline BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error for isOnline:', err.message);
    }
  });
  
  db.run(`ALTER TABLE vendors ADD COLUMN openUntil TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error for openUntil:', err.message);
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

  // Queue system tables
  db.run(`CREATE TABLE IF NOT EXISTS queues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER,
    is_active BOOLEAN DEFAULT 1,
    current_serving_number INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS queue_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_id INTEGER,
    customer_name TEXT DEFAULT 'Customer',
    queue_number INTEGER NOT NULL,
    items TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'waiting',
    estimated_wait INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (queue_id) REFERENCES queues (id)
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
  const { name, description, cuisine, emoji, rating, location, vendorType, isStationary, hasFixedAddress, isOnline, openUntil } = req.body;
  
  const query = `UPDATE vendors SET name = ?, description = ?, cuisine = ?, emoji = ?, rating = ?, 
                 lat = ?, lng = ?, address = ?, vendorType = ?, isStationary = ?, hasFixedAddress = ?, 
                 isOnline = ?, openUntil = ?, lastSeen = ? WHERE id = ?`;
  
  db.run(query, [
    name, description, cuisine, emoji, rating,
    location.lat, location.lng, location.address,
    vendorType || 'truck', 
    isStationary ? 1 : 0, 
    hasFixedAddress ? 1 : 0,
    isOnline ? 1 : 0,
    openUntil || null,
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

// Delete vendor
app.delete('/api/vendors/:id', (req, res) => {
  const { id } = req.params;
  
  // First delete all associated dishes
  db.run('DELETE FROM dishes WHERE vendor_id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: 'Failed to delete vendor dishes: ' + err.message });
      return;
    }
    
    // Then delete all associated reviews
    db.run('DELETE FROM reviews WHERE vendor_id = ?', [id], function(err) {
      if (err) {
        res.status(500).json({ error: 'Failed to delete vendor reviews: ' + err.message });
        return;
      }
      
      // Finally delete the vendor
      db.run('DELETE FROM vendors WHERE id = ?', [id], function(err) {
        if (err) {
          res.status(500).json({ error: 'Failed to delete vendor: ' + err.message });
          return;
        }
        
        if (this.changes === 0) {
          res.status(404).json({ error: 'Vendor not found' });
          return;
        }
        
        res.json({ message: 'Vendor deleted successfully' });
      });
    });
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
      isOnline: false // Start offline
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
      isOnline: false // Start offline
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
      isOnline: false // Start offline
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
    const query = `INSERT OR IGNORE INTO vendors (id, name, description, cuisine, emoji, rating, lat, lng, address, lastSeen, vendorType, isStationary, hasFixedAddress, isOnline)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [
      index + 1, vendor.name, vendor.description, vendor.cuisine, vendor.emoji,
      vendor.rating, vendor.lat, vendor.lng, vendor.address, Date.now(),
      vendor.vendorType || 'truck', vendor.isStationary || false, 
      vendor.hasFixedAddress !== false, vendor.isOnline || false
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

// Queue System API Endpoints

// Get queue status for a vendor
app.get('/api/queue/:vendorId', (req, res) => {
  const vendorId = req.params.vendorId;
  
  // Get or create queue for vendor
  db.get('SELECT * FROM queues WHERE vendor_id = ? AND is_active = 1', [vendorId], (err, queue) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!queue) {
      // Create new queue for vendor
      db.run('INSERT INTO queues (vendor_id, is_active, current_serving_number) VALUES (?, 1, 0)', [vendorId], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        res.json({
          queueId: this.lastID,
          vendorId: parseInt(vendorId),
          currentServingNumber: 0,
          totalInQueue: 0,
          estimatedWait: 0
        });
      });
    } else {
      // Get queue entries count
      db.get('SELECT COUNT(*) as count FROM queue_entries WHERE queue_id = ? AND status = "waiting"', [queue.id], (err, result) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        res.json({
          queueId: queue.id,
          vendorId: queue.vendor_id,
          currentServingNumber: queue.current_serving_number,
          totalInQueue: result.count,
          estimatedWait: result.count * 5 // 5 minutes per order estimate
        });
      });
    }
  });
});

// Join queue
app.post('/api/queue/join', (req, res) => {
  const { vendorId, items, totalAmount, customerName = 'Customer' } = req.body;
  
  if (!vendorId || !items || !totalAmount) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  
  // Get or create queue for vendor
  db.get('SELECT * FROM queues WHERE vendor_id = ? AND is_active = 1', [vendorId], (err, queue) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const processJoinQueue = (queueId) => {
      // Get next queue number
      db.get('SELECT MAX(queue_number) as maxNumber FROM queue_entries WHERE queue_id = ?', [queueId], (err, result) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const nextQueueNumber = (result.maxNumber || 0) + 1;
        
        // Get current position in queue
        db.get('SELECT COUNT(*) as position FROM queue_entries WHERE queue_id = ? AND status = "waiting"', [queueId], (err, positionResult) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const position = positionResult.position + 1;
          const estimatedWait = position * 5; // 5 minutes per order
          
          // Add to queue
          db.run(
            'INSERT INTO queue_entries (queue_id, customer_name, queue_number, items, total_amount, status, estimated_wait) VALUES (?, ?, ?, ?, ?, "waiting", ?)',
            [queueId, customerName, nextQueueNumber, JSON.stringify(items), totalAmount, estimatedWait],
            function(err) {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              
              res.json({
                success: true,
                queueEntryId: this.lastID,
                queueNumber: nextQueueNumber,
                position: position,
                estimatedWait: estimatedWait,
                message: `You're #${position} in line at position ${nextQueueNumber}`
              });
            }
          );
        });
      });
    };
    
    if (!queue) {
      // Create new queue for vendor
      db.run('INSERT INTO queues (vendor_id, is_active, current_serving_number) VALUES (?, 1, 0)', [vendorId], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        processJoinQueue(this.lastID);
      });
    } else {
      processJoinQueue(queue.id);
    }
  });
});

// Get queue status for a specific queue entry
app.get('/api/queue/status/:queueNumber/:vendorId', (req, res) => {
  const { queueNumber, vendorId } = req.params;
  
  db.get(`
    SELECT qe.*, q.current_serving_number,
           (SELECT COUNT(*) FROM queue_entries qe2 
            WHERE qe2.queue_id = qe.queue_id 
            AND qe2.status = 'waiting' 
            AND qe2.queue_number < qe.queue_number) + 1 as current_position
    FROM queue_entries qe
    JOIN queues q ON qe.queue_id = q.id
    WHERE qe.queue_number = ? AND q.vendor_id = ?
  `, [queueNumber, vendorId], (err, entry) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!entry) {
      res.status(404).json({ error: 'Queue entry not found' });
      return;
    }
    
    res.json({
      queueNumber: entry.queue_number,
      position: entry.current_position,
      estimatedWait: entry.current_position * 5,
      status: entry.status,
      items: JSON.parse(entry.items),
      totalAmount: entry.total_amount
    });
  });
});

// Vendor: Get current queue for management
app.get('/api/vendor/:vendorId/queue', (req, res) => {
  const vendorId = req.params.vendorId;
  
  db.get('SELECT * FROM queues WHERE vendor_id = ? AND is_active = 1', [vendorId], (err, queue) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!queue) {
      res.json({ queue: null, entries: [] });
      return;
    }
    
    // Get queue entries
    db.all(
      'SELECT * FROM queue_entries WHERE queue_id = ? AND status IN ("waiting", "preparing") ORDER BY queue_number ASC',
      [queue.id],
      (err, entries) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const processedEntries = entries.map(entry => ({
          ...entry,
          items: JSON.parse(entry.items)
        }));
        
        res.json({
          queue: queue,
          entries: processedEntries
        });
      }
    );
  });
});

// Vendor: Mark order as ready/completed
app.post('/api/vendor/queue/complete/:queueEntryId', (req, res) => {
  const queueEntryId = req.params.queueEntryId;
  
  db.run(
    'UPDATE queue_entries SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [queueEntryId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({ success: true, message: 'Order marked as completed' });
    }
  );
});

// Serve React build files (both development and production)
// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing - serve index.html for all non-API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Catch-all handler for React Router
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 sTrEATs Live server running on port ${PORT}`);
  console.log(`📊 SQLite database: ${dbPath}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
