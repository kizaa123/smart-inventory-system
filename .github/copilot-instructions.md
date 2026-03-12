# Stockmaster Inventory Management System - AI Coding Guidelines

## Project Overview
**Stockmaster** is a web-based inventory management dashboard for tracking products, categories, suppliers, and staff. It's a multi-page vanilla HTML/CSS/JavaScript application with a responsive sidebar navigation and Chart.js for analytics visualization.

## Architecture & File Structure

### Key Files & Responsibilities
- **[index.html](../index.html)** – Main dashboard with sales trends, activity feeds, and KPI cards
- **[index.js](../index.js)** – Chart.js initialization for bar chart visualization; sidebar toggle logic
- **[styles.css](../styles.css)** – Single monolithic stylesheet (1138 lines) handling all pages and components
- **sub-folder/** – Feature pages sharing the same layout structure:
  - `product.html` – Product inventory table with add/search/filter UI
  - `categories.html` – Category management interface
  - `suppliers.html`, `staff.html` – Additional management modules
  - `inventory-login.html` – Authentication page

### Navigation & Routing Pattern
All pages include **identical sidebar navigation** (hardcoded in each HTML):
- Dashboard → `index.html`
- Sub-pages link relatively (e.g., `../index.html`, `product.html`)
- Every page in `sub-folder/` includes `<link rel="stylesheet" href="../styles.css">` to access shared styles

## Key Development Patterns

### 1. Responsive Sidebar Toggle
Found in [index.js](../index.js) lines 59-71:
- Mobile-first: Sidebar collapses by default on screens ≤991px
- `menuBtn` toggles `.expanded` class; text changes from `☰` to `✕`
- Click-outside handler closes sidebar on mobile

**When adding pages:** Include the same sidebar structure and call this JS on all pages.

### 2. Chart.js Integration
Configured in [index.js](../index.js) with:
- Hardcoded demo data (time slots, today vs. yesterday sales)
- Currency formatting in tooltip: `'$' + ctx.raw.toLocaleString()`
- Bar chart with manual width control (`barThickness: 30`)

**Note:** Currently static; design for future connection to backend endpoints.

### 3. CSS Naming & Styling
- **Layout classes:** `.layout`, `.sidebar`, `.main-content`, `.nav-item`
- **Component utilities:** `.highlight-sku` (yellow background), `.active` (sidebar active state)
- **Data containers:** `.overview-content` (KPI cards), `.chart-wrapper`, `.group-activity`
- **Responsive breakpoint:** 991px for mobile sidebar behavior

### 4. Form & Modal Patterns
- Popup toggle used in product & category pages: `onclick="togglePopup()"` (not yet fully defined in provided code)
- Search + Filter buttons paired horizontally with rounded corners (`border-radius: 7px 0 0 7px`)
- Login form uses flexbox with image section ([inventory-login.html](../sub-folder/inventory-login.html))

## Conventions & Standards

### Naming
- **IDs:** Lowercase with hyphens (`menuBtn`, `sidebar`, `salesChart`)
- **Classes:** Lowercase with hyphens (`.nav-list`, `.main-content`)
- **HTML comments:** Mark major sections (`<!-- the navigation bar-->`)

### CSS Organization
- Global reset at top (`*`, `html`, `body`)
- Component-specific sections (`.logIn`, `.highlight-sku`, responsive rules)
- Colors used: Blue (`#01 22DB`), Orange (`#f86503`), Purple (`#4b148d`), Green (`#038509`), Red (`#d60303`)

### Images & Assets
- Stored in `/images` folder
- Formats: `.avif` (modern compression)
- Filenames: descriptive, lowercase with spaces (`premium cc.avif`)

## Common Development Tasks

### Adding a New Page
1. Copy structure from [product.html](../sub-folder/product.html) or [categories.html](../sub-folder/categories.html)
2. Update `<title>`, heading, and button functionality
3. Change active nav link class from previous page
4. Reference `../styles.css` if in `sub-folder/`

### Updating Sidebar/Navigation
Change **every HTML file** simultaneously (sidebar is duplicated across all pages).

### Styling Adjustments
All CSS lives in [styles.css](../styles.css). No separate stylesheets per page.

### Chart Modifications
Update data arrays or options in [index.js](../index.js). Currently renders only on dashboard; Chart.js CDN version 4.4.4 via jsDelivr.

## Backend Integration (Node.js + Express + SQLite)

### Setup Instructions
1. Navigate to `backend/` folder
2. Install dependencies: `npm install`
3. Initialize database: `npm run init-db`
4. Start server: `npm start` (runs on port 5000)

### API Structure
- **Base URL:** `http://localhost:5000/api`
- **Endpoints:** `/products`, `/categories`, `/suppliers`, `/staff`, `/dashboard`
- **Methods:** GET (fetch), POST (create), PUT (update), DELETE (remove)
- **Frontend Client:** [api-client.js](../api-client.js) – Pre-built API wrapper with Product/Category/Supplier/Staff/Dashboard APIs

### Database Schema
- **products** – SKU, name, price, stock, category_id, supplier_id
- **categories** – name, icon, description
- **suppliers** – name, email, phone, address
- **staff** – name, position, department, status
- **sales** – order tracking with product_id, staff_id, quantities

### Key Files
- **[backend/server.js](../backend/server.js)** – Express routes (CRUD for all entities)
- **[backend/database.js](../backend/database.js)** – SQLite initialization
- **[api-client.js](../api-client.js)** – Frontend wrapper for API calls
- **[product-api.js](../product-api.js)** – Product page integration example

### Frontend Integration Pattern
```javascript
// Example: Load and render products
async function loadProducts() {
  try {
    const products = await ProductAPI.getAll();
    // Render products in table
  } catch (error) {
    console.error('API Error:', error);
  }
}
```

### Extending the Backend
1. Add new endpoints in `server.js`
2. Update database schema in `database.js` if adding new tables
3. Add wrapper methods in `api-client.js`
4. Call APIs from frontend using the wrapper (e.g., `ProductAPI.create()`)

## Integration Points & Future Considerations

- **Backend ready:** SQLite + Express running on port 5000; API endpoints for all entities
- **No JavaScript framework:** Vanilla JS frontend; consider modularizing sidebar toggle into a reusable utility
- **Missing functionality:** Search/filter buttons lack handlers; email notifications not implemented
- **Accessibility:** No ARIA labels; enhance for screen readers when extending
- **Authentication:** Login page exists but no auth backend; add JWT tokens to server.js when needed

## Resources
- **Icon Library:** Font Awesome 7.0.1 (CDN)
- **Charting:** Chart.js 4.4.4 (jsDelivr)
- **Font:** Inter (Google Fonts)
- **Responsive breakpoint:** 991px (mobile navigation)

---

When contributing, maintain consistency with existing patterns, test responsive behavior at 991px breakpoint, and update all duplicated navigation structures when modifying sidebar content.
