const $ = id => document.getElementById(id);
let page = 1;
let totalPages = 1;
let lowStockMode = false;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.errors ? `: ${data.errors.join(", ")}` : "";
    throw new Error((data.message || "Request failed") + detail);
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

async function loadProducts() {
  try {
    if (lowStockMode) {
      const data = await request("/api/products/low-stock");
      renderProducts(data.lowStockItems);
      $("catalogue-message").textContent = `${data.count} low-stock item(s)`;
      $("page-info").textContent = "Low-stock report";
      $("prev").disabled = true; $("next").disabled = true;
      return;
    }
    const [sortBy, order] = $("sort").value.split(":");
    const params = new URLSearchParams({
      page, limit: 8, sortBy, order,
      search: $("search").value.trim(),
      category: $("filter-category").value.trim()
    });
    const data = await request(`/api/products?${params}`);
    totalPages = Math.max(data.totalPages, 1);
    renderProducts(data.products);
    $("catalogue-message").textContent = `${data.total} product(s) found`;
    $("page-info").textContent = `Page ${data.page} of ${totalPages}`;
    $("prev").disabled = page <= 1;
    $("next").disabled = page >= totalPages;
    $("total-products").textContent = data.total;
  } catch (error) {
    $("catalogue-message").textContent = error.message;
  }
}

function renderProducts(products) {
  const body = $("products");
  body.innerHTML = "";
  if (!products.length) {
    body.innerHTML = '<tr><td colspan="7">No products found.</td></tr>';
    return;
  }
  products.forEach(product => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.sku)}</td>
      <td>${escapeHtml(product.category)}</td>
      <td>${Number(product.price).toFixed(2)}</td>
      <td>${product.quantity}</td>
      <td>${(product.price * product.quantity).toFixed(2)}</td>
      <td>
        <button class="action edit" data-action="stock" data-id="${product._id}">Adjust stock</button>
        <button class="action edit" data-action="edit" data-id="${product._id}">Edit</button>
        <button class="action delete" data-action="delete" data-id="${product._id}">Delete</button>
      </td>`;
    body.appendChild(row);
  });
}

$("products").addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  try {
    if (button.dataset.action === "delete") {
      if (!confirm("Delete this product?")) return;
      await request(`/api/products/${id}`, { method: "DELETE" });
    } else if (button.dataset.action === "edit") {
      const product = await request(`/api/products/${id}`);
      const name = prompt("Product name:", product.name);
      if (name === null) return;
      const price = prompt("Price:", product.price);
      if (price === null) return;
      const quantity = prompt("Quantity:", product.quantity);
      if (quantity === null) return;
      await request(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, price: Number(price), quantity: Number(quantity) })
      });
    } else if (button.dataset.action === "stock") {
      const change = prompt("Enter stock change (positive to restock, negative for sale):", "5");
      if (change === null) return;
      await request(`/api/products/${id}/stock`, {
        method: "PATCH", body: JSON.stringify({ change: Number(change) })
      });
    }
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

$("product-form").addEventListener("submit", async event => {
  event.preventDefault();
  const product = {
    name: $("name").value, sku: $("sku").value, category: $("category").value,
    price: Number($("price").value), quantity: Number($("quantity").value),
    reorderLevel: Number($("reorderLevel").value), supplier: $("supplier").value
  };
  try {
    await request("/api/products", { method: "POST", body: JSON.stringify(product) });
    $("product-form").reset();
    $("reorderLevel").value = 10;
    $("form-message").textContent = "Product created successfully.";
    lowStockMode = false; page = 1;
    await refreshAll();
  } catch (error) {
    $("form-message").textContent = error.message;
  }
});

async function loadSummary() {
  try {
    const data = await request("/api/products/summary");
    $("category-count").textContent = data.categories;
    $("summary").innerHTML = "";
    data.summary.forEach(item => {
      const card = document.createElement("div");
      card.className = "summary-card";
      card.innerHTML = `
        <b>${escapeHtml(item.category)}</b>
        <span>Products: ${item.totalItems}</span>
        <span>Total quantity: ${item.totalQuantity}</span>
        <span>Stock value: ${Number(item.totalStockValue).toFixed(2)}</span>
        <span>Average price: ${Number(item.avgPrice).toFixed(2)}</span>`;
      $("summary").appendChild(card);
    });
    if (!data.summary.length) $("summary").textContent = "No category data yet.";
  } catch (error) {
    $("summary").textContent = error.message;
  }
}

async function loadLowCount() {
  try {
    const data = await request("/api/products/low-stock");
    $("low-count").textContent = data.count;
  } catch (error) {
    $("low-count").textContent = "—";
  }
}

async function refreshAll() {
  await Promise.all([loadProducts(), loadSummary(), loadLowCount()]);
}

$("apply").addEventListener("click", () => { page = 1; lowStockMode = false; loadProducts(); });
$("search").addEventListener("keydown", e => { if (e.key === "Enter") $("apply").click(); });
$("prev").addEventListener("click", () => { if (page > 1) { page--; loadProducts(); } });
$("next").addEventListener("click", () => { if (page < totalPages) { page++; loadProducts(); } });
$("low-stock").addEventListener("click", () => { lowStockMode = !lowStockMode; page = 1; loadProducts(); $("low-stock").textContent = lowStockMode ? "Show all products" : "Show low stock"; });
$("refresh").addEventListener("click", () => { lowStockMode = false; refreshAll(); });
$("summary-refresh").addEventListener("click", loadSummary);

refreshAll();
