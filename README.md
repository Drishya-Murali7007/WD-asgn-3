# Inventory and Data Management System — Lab 3

A RESTful inventory backend built with Node.js, Express, MongoDB and Mongoose. It includes schema validation, product CRUD, query-string filtering/sorting/pagination, safe stock adjustments, low-stock reporting, and a category aggregation report.

## Requirements
- Node.js 18+
- npm
- MongoDB running locally, or a MongoDB Atlas connection string

## Setup

1. Extract the ZIP and open the project folder in VS Code.
2. Install packages:

   ```bash
   npm install
   ```

3. Create `.env` from the example.

   **Windows PowerShell**
   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS/Linux**
   ```bash
   cp .env.example .env
   ```

4. Ensure MongoDB is running locally. The default connection string is:
   `mongodb://127.0.0.1:27017/inventory_db`

   If using MongoDB Atlas, replace `MONGODB_URI` in `.env` with your Atlas connection string.

5. Start the server:

   ```bash
   npm start
   ```

6. Visit `http://localhost:5000` for the basic testing interface.

## API endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check server |
| POST | `/api/products` | Create product |
| GET | `/api/products` | List/filter/sort/page products |
| GET | `/api/products/:id` | Get one product |
| PUT | `/api/products/:id` | Update product details |
| PATCH | `/api/products/:id/stock` | Increase/decrease stock |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/products/low-stock` | Low-stock report |
| GET | `/api/products/summary` | Category aggregation report |

## Sample request bodies

### Create product — POST `/api/products`

```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 48,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```

### Update product — PUT `/api/products/PRODUCT_ID`

```json
{
  "name": "Gel Pen Pack of 15",
  "price": 140,
  "quantity": 60
}
```

### Stock adjustment — PATCH `/api/products/PRODUCT_ID/stock`

Restock by 10:

```json
{ "change": 10 }
```

Record a sale of 5:

```json
{ "change": -5 }
```

The endpoint prevents a sale that would make stock negative.

## Query examples

- All products: `GET /api/products`
- Search: `GET /api/products?search=pen`
- Category: `GET /api/products?category=Stationery`
- Price range: `GET /api/products?minPrice=50&maxPrice=500`
- Stock range: `GET /api/products?minStock=5&maxStock=50`
- Sort: `GET /api/products?sortBy=price&order=asc`
- Pagination: `GET /api/products?page=2&limit=5`
- Combined: `GET /api/products?category=Stationery&sortBy=price&order=asc&page=1&limit=10`

Allowed sort fields: `name`, `price`, `quantity`, `category`, `createdAt`, `updatedAt`. Maximum page size is 100.

## Reports

- `GET /api/products/low-stock` returns products where `quantity` is less than or equal to `reorderLevel`.
- `GET /api/products/summary` uses an aggregation pipeline with `$group`, `$sum`, `$avg`, `$multiply`, `$round`, `$sort`, and `$project` to produce category-wise counts, quantity, stock value, and average price.

## Assignment concepts covered

- Mongoose schema design and field-level validation
- Express + MongoDB connection using Mongoose
- RESTful Create, Read, Update and Delete
- Query-string filtering, sorting and pagination
- MongoDB aggregation pipelines
- Safe stock increment/decrement
- Centralized error handling
- dotenv configuration

## Troubleshooting

- **MongoDB connection refused:** Start your local MongoDB service or use a valid Atlas URI.
- **E11000 duplicate key:** Each product must have a unique SKU.
- **Validation failed:** Check required fields, non-negative price/quantity, and integer quantity/reorder level.
- **Invalid product ID:** Use the `_id` returned by MongoDB for that product.
