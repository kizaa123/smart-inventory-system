## 🚀 Quick Start (Windows)

The easiest way to start the backend is to use the **`run-backend.bat`** file located in the project root. Just double-click it! It will:
1.  Check for and install any missing dependencies (`npm install`).
2.  Initialize the database if it doesn't exist (`npm run init-db`).
3.  Start the server.

---

## 🛠️ Manual Setup

If you prefer using the command line:

### Prerequisites
- Node.js 14+ installed
- npm package manager

### Installation & Setup

```bash
# Navigate to backend directory
cd backend

# One-step setup (Installs and Initialized DB)
npm run setup

# Start the server
npm start
```

The API will be available at `http://localhost:5000`

### Development Mode
For auto-restart on file changes:
```bash
npm run dev
```

## API Endpoints

### Base URL
`http://localhost:5000/api`

### Products
- `GET /products` – Get all products with category & supplier info
- `GET /products/:id` – Get product by ID
- `GET /products/sku/:sku` – Get product by SKU
- `POST /products` – Create new product
- `PUT /products/:id` – Update product
- `DELETE /products/:id` – Delete product

**Example Create:**
```json
POST /api/products
{
  "sku": "#NEW-001",
  "name": "New Product",
  "category_id": 1,
  "supplier_id": 1,
  "cost_price": 100,
  "sell_price": 150,
  "stock_quantity": 50
}
```

### Categories
- `GET /categories` – Get all categories
- `POST /categories` – Create category
- `PUT /categories/:id` – Update category
- `DELETE /categories/:id` – Delete category

### Suppliers
- `GET /suppliers` – Get all suppliers
- `POST /suppliers` – Create supplier
- `PUT /suppliers/:id` – Update supplier
- `DELETE /suppliers/:id` – Delete supplier

### Staff
- `GET /staff` – Get all active staff members
- `POST /staff` – Create staff member
- `PUT /staff/:id` – Update staff member
- `DELETE /staff/:id` – Deactivate staff member

### Dashboard
- `GET /dashboard/stats` – Get KPI statistics (total products, stock, low stock, today's sales)
- `GET /dashboard/recent-sales` – Get last 10 sales with details

### Health Check
- `GET /api/health` – Server status

## Database Schema

### products
```sql
id, sku, name, category_id, supplier_id, cost_price, sell_price, 
stock_quantity, low_stock_threshold, image_url, description, 
created_at, updated_at
```

### categories
```sql
id, name, description, icon, created_at
```

### suppliers
```sql
id, name, contact_person, email, phone, address, created_at
```

### staff
```sql
id, name, email, phone, position, department, status, created_at
```

### sales
```sql
id, order_id, product_id, quantity, unit_price, total_amount, 
staff_id, sale_date
```

## Frontend Integration

Use the provided `api-client.js` to interact with the API:

```javascript
// Import the API client (already included in product.html)
<script src="../api-client.js"></script>

// Use the API wrappers
const products = await ProductAPI.getAll();
await ProductAPI.create({ sku, name, ... });
await ProductAPI.update(id, { name, ... });
await ProductAPI.delete(id);

// Same pattern for Categories, Suppliers, Staff, Dashboard
const categories = await CategoryAPI.getAll();
const stats = await DashboardAPI.getStats();
```

## Sample Data

The `init-db.js` script populates the database with:
- 7 product categories
- 5 suppliers
- 10 sample products

All products use real SKUs from your frontend (e.g., `#AT-9501`, `#AC-2301`).

## Troubleshooting

### Port 5000 Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (Windows)
taskkill /PID <PID> /F
```

### Database Lock Error
Delete `stockmaster.db` and reinitialize:
```bash
npm run init-db
```

### CORS Errors
The server has CORS enabled by default. If frontend and backend are on different ports, you may need to adjust:
- Check `server.js` line: `app.use(cors());`
- Ensure frontend API calls use `http://localhost:5000/api`

### API Returns 404
Verify:
1. Server is running (`npm start`)
2. Database is initialized (`npm run init-db`)
3. Endpoint URL is correct (check `api-client.js`)

## Files Overview

- **server.js** – Express app with all API routes
- **database.js** – SQLite database connection & initialization
- **init-db.js** – Sample data script
- **package.json** – Dependencies & scripts

## Next Steps

### Add Authentication
1. Install passport or JWT library
2. Add login endpoint in `server.js`
3. Wrap protected routes with auth middleware
4. Update `inventory-login.html` to authenticate with backend

### Record Sales
Create sales endpoint to track transactions:
```javascript
POST /api/sales
{
  "product_id": 1,
  "quantity": 5,
  "unit_price": 150,
  "staff_id": 1
}
```

### Real-time Sync
Consider WebSockets for live inventory updates across multiple users.

## API Response Format

### Success Response
```json
{
  "id": 1,
  "sku": "#AT-9501",
  "name": "Apple TV 4k",
  "category_id": 4,
  "supplier_id": 1,
  "cost_price": 900,
  "sell_price": 1450,
  "stock_quantity": 20,
  "category_name": "Smart Home Hub",
  "supplier_name": "BestBuy Gadget",
  "created_at": "2026-02-06T10:30:00Z"
}
```

### Error Response
```json
{
  "error": "Product not found"
}
```

## Support
For issues, check server logs in terminal or review `api-client.js` for expected request formats.
