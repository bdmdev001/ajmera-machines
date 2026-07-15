const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ajmeramachines';

const ProductSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    stockNo: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    make: { type: String, default: 'N/A' },
    model: { type: String, default: 'N/A' },
    category: { type: String, default: 'N/A', index: true },
    country: { type: String, default: 'N/A' },
    myear: { type: String },
    videoUrl: { type: String },
    technicalSpecifications: { type: String },
    images: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  // Read the scraped json
  const dataPath = path.join(__dirname, '../src/data/products.json');
  if (!fs.existsSync(dataPath)) {
    console.error("products.json not found at:", dataPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const rawProducts = JSON.parse(rawData);

  console.log(`Loaded ${rawProducts.length} products from JSON.`);

  // Clean the database
  console.log("Clearing existing products...");
  await Product.deleteMany({});
  console.log("Cleared database!");

  // Transform and insert
  const productsToInsert = rawProducts.map(p => {
    // Map JSON keys to Mongoose schema keys
    return {
      id: p.id,
      stockNo: p.stock_no,
      title: p.title,
      make: p.make,
      model: p.model,
      category: p.category,
      country: p.country,
      myear: p.myear,
      videoUrl: p.video_url,
      technicalSpecifications: p.technical_specifications,
      images: p.images
    };
  });

  console.log("Inserting products...");
  const result = await Product.insertMany(productsToInsert);
  console.log(`Successfully seeded ${result.length} products!`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
