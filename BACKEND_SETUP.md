# Stockmaster Setup Guide

## What's New
✅ **Database Created** – SQLite database with 5 tables (products, categories, suppliers, staff, sales)  
✅ **Backend API** – Node.js + Express server with full CRUD endpoints  
✅ **Frontend Integration** – Product page now fetches real data from database  
✅ **Sample Data** – 10 products, 7 categories, 5 suppliers pre-loaded  

## Quick Start (5 minutes)

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Initialize Database
```bash
npm run init-db
```
You should see: `✅ Sample data inserted successfully`

### Step 3: Start the Server
```bash
npm start
```
You should see: `✅ Stockmaster API running on http://localhost:5000`

### Step 4: Open Product Page
1. Open `sub-folder/product.html` in your browser
2. Products should load from database automatically
3. Try adding, editing, or deleting products!

## What Works Now

### ✅ Product Management
- **View all products** from database
- **Add new product** with form validation
- **Edit existing product** details
- **Delete product** with confirmation

### ✅ Dynamic Dropdowns
- Category and Supplier dropdowns populate from database
- No hardcoded options anymore

### ✅ Real API Integration
- All CRUD operations use `/api/products` endpoints
- Error handling with user-friendly messages
- Form data validation before submission

## Database Tables

| Table | Purpose | Fields |
|-------|---------|--------|
| `products` | Inventory items | SKU, name, price, stock, category, supplier |
| `categories` | Product types | name, icon, description |
| `suppliers` | Vendors | name, contact, email, phone, address |
| `staff` | Team members | name, position, department, status |
| `sales` | Order history | product, quantity, price, staff, date |

## API Endpoints Reference

### Get all products
```bash
curl http://localhost:5000/api/products
```

### Create product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "#TEST-001",
    "name": "Test Product",
    "category_id": 1,
    "supplier_id": 1,
    "cost_price": 50,
    "sell_price": 100,
    "stock_quantity": 10
  }'
```

### Update product
```bash
curl -X PUT http://localhost:5000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "stock_quantity": 20}'
```

### Delete product
```bash
curl -X DELETE http://localhost:5000/api/products/1
```

See `backend/README.md` for complete API documentation.

## File Structure

```
inventory website/
├── backend/                    ← NEW: Backend server
│   ├── server.js             ← Express app with all API routes
│   ├── database.js           ← SQLite setup
│   ├── init-db.js            ← Sample data script
│   ├── package.json          ← Dependencies
│   ├── README.md             ← Detailed API docs
│   └── stockmaster.db        ← Database file (created after npm run init-db)
│
├── api-client.js             ← API wrapper for frontend
├── product-api.js            ← Product page integration
│
├── sub-folder/
│   ├── product.html          ← Now uses real API data
│   ├── categories.html       ← Ready for API integration
│   ├── suppliers.html        ← Ready for API integration
│   └── staff.html            ← Ready for API integration
│
└── .github/
    └── copilot-instructions.md ← Updated with backend guide
```

## Next: Integrate Other Pages

### Categories Page
Update `categories.html` with similar pattern:
```javascript
// Load categories
async function loadCategories() {
  categoriesData = await CategoryAPI.getAll();
  renderCategoryTable();
}

// Add category
async function saveCategory() {
  await CategoryAPI.create({
    name: document.querySelector('#name').value
  });
  loadCategories();
}
```

### Suppliers & Staff Pages
Use same pattern with `SupplierAPI` and `StaffAPI`.

## Troubleshooting

### Port 5000 in use?
```bash
# Kill process using port
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Products not loading?
1. Check browser console (F12) for errors
2. Ensure server is running: `npm start`
3. Verify database exists: `backend/stockmaster.db`

### Need to reset data?
```bash
# Delete database and reinitialize
rm backend/stockmaster.db
npm run init-db
```

## Key Features Implemented

✅ Database persistence – All data saved to SQLite  
✅ Auto-increment IDs – Products auto-numbered  
✅ Foreign keys – Categories & Suppliers linked to Products  
✅ Timestamps – created_at, updated_at for tracking  
✅ Stock tracking – Low stock threshold alerts  
✅ CORS enabled – Frontend can call API from any port  
✅ Error handling – User-friendly error messages  

## What's Still TODO

- [ ] Dashboard stats integration (partially done)
- [ ] Search/Filter functionality
- [ ] Authentication & login backend
- [ ] Sales recording endpoint
- [ ] Image upload support
- [ ] Email notifications
- [ ] Advanced reporting

---

**Backend running?** Then you're ready to build! 🚀
