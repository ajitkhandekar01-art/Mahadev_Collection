/* ==========================================================
   MAHADEV COLLECTION – Admin Management Script
   Handles authentication, products CRUD, orders and shop settings
   ========================================================== */

(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "₹" + Number(n).toLocaleString("en-IN");

  let allProducts = [];
  let currentAdmin = null;

  /* ---------- Toast notification ---------- */
  let toastTimer;
  function showToast(msg, isError = false) {
    let t = $("#toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = isError ? "#b02a2a" : "var(--gold)";
    t.style.color = isError ? "#fff" : "#000";
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* ---------- API helper ---------- */
  async function api(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      let errMsg = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body && body.error) errMsg = body.error;
      } catch (_) {}
      const err = new Error(errMsg);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  /* ---------- Auth check ---------- */
  async function checkAuth() {
    try {
      const res = await api("/api/admin/me");
      if (res.loggedIn && res.user) {
        currentAdmin = res.user;
        showDashboard();
      } else {
        showLogin();
      }
    } catch (e) {
      showLogin();
    }
  }

  function showLogin() {
    $("#login-section").style.display = "block";
    $("#dashboard-section").style.display = "none";
    $("#admin-user-bar").style.display = "none";
  }

  function showDashboard() {
    $("#login-section").style.display = "none";
    $("#dashboard-section").style.display = "block";
    $("#admin-user-bar").style.display = "flex";
    if (currentAdmin && currentAdmin.email) {
      $("#admin-email").textContent = currentAdmin.email;
    }
    loadProducts();
    loadOrders();
    loadSettings();
  }

  /* ---------- Login / Logout ---------- */
  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("#admin-login-email").value.trim();
    const password = $("#admin-login-password").value.trim();
    const errBox = $("#login-err");
    const btn = $("#login-submit-btn");

    errBox.style.display = "none";
    btn.disabled = true;
    btn.textContent = "LOGGING IN...";

    try {
      const res = await api("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      currentAdmin = res.user;
      showToast("✓ Logged in successfully");
      showDashboard();
    } catch (err) {
      errBox.textContent = err.message || "Invalid email or password.";
      errBox.style.display = "block";
    } finally {
      btn.disabled = false;
      btn.textContent = "LOG IN";
    }
  });

  $("#logout-btn").addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
      currentAdmin = null;
      showToast("Logged out");
      showLogin();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  /* ---------- Tab Navigation ---------- */
  $$(".admin-tab").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      const target = tabBtn.dataset.tab;
      $$(".admin-tab").forEach(b => b.classList.toggle("active", b === tabBtn));
      $$(".tab-pane").forEach(pane => {
        pane.style.display = pane.id === `tab-${target}` ? "block" : "none";
      });
      if (target === "orders") loadOrders();
      if (target === "products") renderProducts();
      if (target === "settings") loadSettings();
    });
  });

  /* ========================================================
     PRODUCTS MANAGEMENT
     ======================================================== */
  async function loadProducts() {
    try {
      allProducts = await api("/api/admin/products");
      renderProducts();
    } catch (err) {
      showToast("Error loading products: " + err.message, true);
    }
  }

  function renderProducts() {
    const tbody = $("#products-tbody");
    if (!tbody) return;

    const q = ($("#prod-search").value || "").trim().toLowerCase();
    const cat = $("#prod-filter-cat").value || "all";

    const filtered = allProducts.filter(p => {
      const okCat = cat === "all" || p.category_slug === cat;
      const text = (p.name + " " + (p.description || "") + " " + p.id).toLowerCase();
      const okQ = !q || text.includes(q);
      return okCat && okQ;
    });

    $("#prod-count-label").textContent = `${filtered.length} of ${allProducts.length} products`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No products found matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const priceText = p.price ? money(p.price) : '<span style="color:#eab308">On WhatsApp</span>';
      const mrpText = p.mrp ? `<br><small style="color:var(--muted);text-decoration:line-through">${money(p.mrp)}</small>` : "";
      const img = p.image_url || "images/banner.jpg";

      return `
      <tr>
        <td class="thumb-cell">
          <img src="${esc(img)}" alt="${esc(p.name)}">
        </td>
        <td>
          <strong style="color:#fff;font-size:15px">${esc(p.name)}</strong>
          <br><small style="color:var(--muted)">ID: ${esc(p.id)} &middot; <span style="text-transform:capitalize">${esc(p.category_slug)}</span></small>
        </td>
        <td>${priceText}${mrpText}</td>
        <td>
          <button class="badge-btn ${p.in_stock ? "active" : "inactive"}" data-action="toggle-stock" data-id="${esc(p.id)}">
            ${p.in_stock ? "✓ In Stock" : "✗ Out of Stock"}
          </button>
        </td>
        <td>
          <button class="badge-btn ${p.is_active ? "active" : "muted"}" data-action="toggle-active" data-id="${esc(p.id)}">
            ${p.is_active ? "Active" : "Hidden"}
          </button>
        </td>
        <td>
          <span style="font-size:12px;color:${p.is_new ? "#4ade80" : "var(--muted)"}">
            ${p.is_new ? "★ New" : "—"}
          </span>
        </td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-outline btn-sm" data-action="edit" data-id="${esc(p.id)}" style="margin-right:6px">Edit</button>
          <button class="btn btn-outline btn-sm" data-action="delete" data-id="${esc(p.id)}" style="color:#f87171;border-color:#5a2222">Delete</button>
        </td>
      </tr>`;
    }).join("");
  }

  $("#prod-search").addEventListener("input", renderProducts);
  $("#prod-filter-cat").addEventListener("change", renderProducts);

  // Table action clicks (toggle stock, toggle active, edit, delete)
  $("#products-tbody").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "toggle-stock") {
      try {
        const res = await api(`/api/admin/products/${encodeURIComponent(id)}/toggle-stock`, { method: "PATCH" });
        const p = allProducts.find(x => x.id === id);
        if (p) p.in_stock = res.in_stock;
        renderProducts();
        showToast(res.in_stock ? "Marked as In Stock" : "Marked as Out of Stock");
      } catch (err) {
        showToast(err.message, true);
      }
    } else if (action === "toggle-active") {
      try {
        const res = await api(`/api/admin/products/${encodeURIComponent(id)}/toggle-active`, { method: "PATCH" });
        const p = allProducts.find(x => x.id === id);
        if (p) p.is_active = res.is_active;
        renderProducts();
        showToast(res.is_active ? "Product is now Active" : "Product is now Hidden");
      } catch (err) {
        showToast(err.message, true);
      }
    } else if (action === "edit") {
      openEditProductModal(id);
    } else if (action === "delete") {
      if (!confirm(`Are you sure you want to delete product '${id}'? This cannot be undone.`)) return;
      try {
        await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
        allProducts = allProducts.filter(x => x.id !== id);
        renderProducts();
        showToast("✓ Product deleted");
      } catch (err) {
        showToast(err.message, true);
      }
    }
  });

  /* ---------- Product Modal (Add / Edit) ---------- */
  function openAddProductModal() {
    $("#modal-title").textContent = "Add New Product";
    $("#p-id").value = "";
    $("#p-name").value = "";
    $("#p-cat").value = "men";
    $("#p-price").value = "";
    $("#p-mrp").value = "";
    $("#p-tag").value = "";
    $("#p-sizes").value = "";
    $("#p-colors").value = "";
    $("#p-desc").value = "";
    $("#p-file").value = "";
    $("#p-img-url").value = "";
    $("#p-img-preview").src = "images/banner.jpg";
    $("#p-img-name").textContent = "No file chosen";
    $("#p-sort").value = allProducts.length + 1;
    $("#p-stock").checked = true;
    $("#p-active").checked = true;
    $("#p-new").checked = false;
    $("#p-land").checked = false;
    $("#product-modal").classList.remove("hidden");
  }

  function openEditProductModal(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;

    $("#modal-title").textContent = `Edit Product: ${p.name}`;
    $("#p-id").value = p.id;
    $("#p-name").value = p.name;
    $("#p-cat").value = p.category_slug || p.cat || "men";
    $("#p-price").value = (p.price !== null && p.price !== undefined) ? p.price : "";
    $("#p-mrp").value = (p.mrp !== null && p.mrp !== undefined) ? p.mrp : "";
    $("#p-tag").value = p.tag || "";
    $("#p-sizes").value = Array.isArray(p.sizes) ? p.sizes.join(", ") : "";
    $("#p-colors").value = Array.isArray(p.colors) ? p.colors.join(", ") : "";
    $("#p-desc").value = p.description || p.desc || "";
    $("#p-file").value = "";
    $("#p-img-url").value = p.image_url || p.img || "";
    $("#p-img-preview").src = p.image_url || p.img || "images/banner.jpg";
    $("#p-img-name").textContent = p.image_url || p.img || "Current image";
    $("#p-sort").value = p.sort_order || 0;
    $("#p-stock").checked = Boolean(p.in_stock);
    $("#p-active").checked = Boolean(p.is_active);
    $("#p-new").checked = Boolean(p.is_new);
    $("#p-land").checked = Boolean(p.is_landscape);
    $("#product-modal").classList.remove("hidden");
  }

  $("#btn-add-product").addEventListener("click", openAddProductModal);
  $("#modal-close-btn").addEventListener("click", () => $("#product-modal").classList.add("hidden"));
  $("#modal-cancel-btn").addEventListener("click", () => $("#product-modal").classList.add("hidden"));

  // Image preview when choosing file
  $("#p-file").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Image must be smaller than 2 MB", true);
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        $("#p-img-preview").src = ev.target.result;
        $("#p-img-name").textContent = file.name;
      };
      reader.readAsDataURL(file);
    }
  });

  // Save product form submit
  $("#product-form").addEventListener("submit", async e => {
    e.preventDefault();
    const saveBtn = $("#modal-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "SAVING...";

    try {
      let imageUrl = $("#p-img-url").value.trim();

      // If user uploaded a new file, upload it first
      const file = $("#p-file").files[0];
      if (file) {
        const formData = new FormData();
        formData.append("image", file);
        const upRes = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData
        });
        if (!upRes.ok) {
          const body = await upRes.json().catch(() => ({}));
          throw new Error(body.error || "Image upload failed");
        }
        const upData = await upRes.json();
        imageUrl = upData.image_url;
      }

      const id = $("#p-id").value.trim();
      const productPayload = {
        name: $("#p-name").value.trim(),
        category_slug: $("#p-cat").value,
        price: $("#p-price").value === "" ? null : parseFloat($("#p-price").value),
        mrp: $("#p-mrp").value === "" ? null : parseFloat($("#p-mrp").value),
        tag: $("#p-tag").value.trim(),
        sizes: $("#p-sizes").value.split(",").map(s => s.trim()).filter(Boolean),
        colors: $("#p-colors").value.split(",").map(s => s.trim()).filter(Boolean),
        description: $("#p-desc").value.trim(),
        image_url: imageUrl || "images/banner.jpg",
        sort_order: parseInt($("#p-sort").value, 10) || 0,
        in_stock: $("#p-stock").checked ? 1 : 0,
        is_active: $("#p-active").checked ? 1 : 0,
        is_new: $("#p-new").checked ? 1 : 0,
        is_landscape: $("#p-land").checked ? 1 : 0
      };

      if (!id) {
        // Create new
        const created = await api("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productPayload)
        });
        allProducts.push(created);
        showToast("✓ New product added successfully");
      } else {
        // Update existing
        const updated = await api(`/api/admin/products/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productPayload)
        });
        const idx = allProducts.findIndex(x => x.id === id);
        if (idx !== -1) allProducts[idx] = updated;
        showToast("✓ Product updated successfully");
      }

      $("#product-modal").classList.add("hidden");
      renderProducts();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Product";
    }
  });

  /* ========================================================
     ORDERS MANAGEMENT
     ======================================================== */
  async function loadOrders() {
    const list = $("#orders-list");
    if (!list) return;

    const status = $("#order-filter-status").value || "all";
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">Loading orders...</div>`;

    try {
      const orders = await api(`/api/admin/orders?status=${encodeURIComponent(status)}`);
      renderOrders(orders);
    } catch (err) {
      list.innerHTML = `<div style="color:#f87171;padding:30px;text-align:center">Error loading orders: ${esc(err.message)}</div>`;
    }
  }

  function renderOrders(orders) {
    const list = $("#orders-list");
    if (!list) return;

    if (!orders.length) {
      list.innerHTML = `
        <div style="background:var(--panel);border:1px solid var(--line);border-radius:10px;text-align:center;padding:50px 20px;color:var(--muted)">
          <h3>No orders found</h3>
          <p>Orders submitted by customers via WhatsApp checkout will appear here.</p>
        </div>`;
      return;
    }

    list.innerHTML = orders.map(ord => {
      const totalAmountText = ord.total_amount !== null ? money(ord.total_amount) : '<span style="color:#eab308">Price on WhatsApp</span>';
      const items = Array.isArray(ord.items) ? ord.items : [];
      const waReplyText = encodeURIComponent(`Hello ${ord.customer_name}, thank you for contacting Mahadev Collection! We received your order #${ord.id.slice(0, 8)}.`);
      const cleanPhone = ord.mobile.replace(/\D/g, "");

      return `
      <div class="order-card">
        <div class="order-card-header">
          <div>
            <span style="font-family:var(--serif);font-size:18px;color:var(--gold-light)">Order #${esc(ord.id.slice(0, 8))}</span>
            <small style="color:var(--muted);margin-left:10px">${esc(ord.created_at)}</small>
            <div style="margin-top:4px;font-size:15px">
              <strong>${esc(ord.customer_name)}</strong> &middot;
              <a href="tel:+91${esc(cleanPhone)}" style="color:var(--gold-light);text-decoration:underline">${esc(ord.mobile)}</a> &middot;
              <span>${esc(ord.city || "Jaysingpur")}</span>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <select class="order-status ${esc(ord.status)}" data-order-status="${esc(ord.id)}">
              <option value="new" ${ord.status === "new" ? "selected" : ""}>New</option>
              <option value="confirmed" ${ord.status === "confirmed" ? "selected" : ""}>Confirmed</option>
              <option value="delivered" ${ord.status === "delivered" ? "selected" : ""}>Delivered</option>
              <option value="cancelled" ${ord.status === "cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
            <a class="btn btn-wa btn-sm" href="https://wa.me/91${esc(cleanPhone)}?text=${waReplyText}" target="_blank" rel="noopener">
              Reply on WhatsApp
            </a>
          </div>
        </div>

        <ul class="order-items-list">
          ${items.map(it => {
            const variant = [it.size ? "Size: " + it.size : "", it.colour ? "Col: " + it.colour : ""].filter(Boolean).join(", ");
            const itemPrice = it.unit_price ? money(it.unit_price * it.qty) : "—";
            return `
            <li>
              <span>${esc(it.product_name)}${variant ? ` <em style="color:var(--muted)">(${esc(variant)})</em>` : ""} &times; ${it.qty}</span>
              <strong>${itemPrice}</strong>
            </li>`;
          }).join("")}
        </ul>

        <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid var(--line);font-size:14px;flex-wrap:wrap;gap:10px">
          <div>
            ${ord.address ? `<div><strong>Address:</strong> ${esc(ord.address)}</div>` : ""}
            <div><strong>Delivery:</strong> ${esc(ord.delivery_type || "Pick up from shop")}</div>
            ${ord.note ? `<div><strong>Customer Note:</strong> ${esc(ord.note)}</div>` : ""}
          </div>
          <div style="text-align:right">
            <div>Items: <strong>${ord.total_items}</strong></div>
            <div style="font-size:16px;color:var(--gold-light);margin-top:4px">Total: <strong>${totalAmountText}</strong></div>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  $("#order-filter-status").addEventListener("change", loadOrders);

  // Status change handler
  $("#orders-list").addEventListener("change", async e => {
    const sel = e.target.closest("select[data-order-status]");
    if (!sel) return;
    const orderId = sel.dataset.orderStatus;
    const newStatus = sel.value;

    try {
      await api(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      sel.className = `order-status ${newStatus}`;
      showToast(`Order status updated to '${newStatus}'`);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  /* ========================================================
     SHOP SETTINGS
     ======================================================== */
  async function loadSettings() {
    try {
      const s = await api("/api/admin/settings");
      $("#st-name").value = s.name || "";
      $("#st-wa").value = s.whatsapp || "";
      $("#st-phones").value = Array.isArray(s.phones) ? s.phones.join(", ") : "";
      $("#st-city").value = s.city || "";
      $("#st-addr").value = s.address || "";
      $("#st-hours").value = s.opening_hours || "";
      $("#st-map").value = s.map_link || s.map_query || "";
      $("#st-insta").value = s.instagram || "";
      $("#st-fb").value = s.facebook || "";
      $("#st-ret").value = s.return_policy || "";
    } catch (err) {
      showToast("Error loading settings: " + err.message, true);
    }
  }

  $("#settings-form").addEventListener("submit", async e => {
    e.preventDefault();
    const saveBtn = $("#settings-form button[type='submit']");
    saveBtn.disabled = true;
    saveBtn.textContent = "SAVING SETTINGS...";

    const payload = {
      name: $("#st-name").value.trim(),
      whatsapp: $("#st-wa").value.trim(),
      phones: $("#st-phones").value.split(",").map(p => p.trim()).filter(Boolean),
      city: $("#st-city").value.trim(),
      address: $("#st-addr").value.trim(),
      opening_hours: $("#st-hours").value.trim(),
      map_link: $("#st-map").value.trim(),
      instagram: $("#st-insta").value.trim(),
      facebook: $("#st-fb").value.trim(),
      return_policy: $("#st-ret").value.trim()
    };

    try {
      await api("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      showToast("✓ Shop settings updated successfully");
    } catch (err) {
      showToast(err.message, true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "SAVE SETTINGS";
    }
  });

  /* ---------- Init on load ---------- */
  document.addEventListener("DOMContentLoaded", checkAuth);
})();

