/* ==========================================================
   MAHADEV COLLECTION – मुख्य स्क्रिप्ट
   Supports API with SQLite backend + offline fallback to products.js
   ========================================================== */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => "₹" + Number(n).toLocaleString("en-IN");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = new URLSearchParams(location.search);

  /* ---------- global shop state with fallbacks ---------- */
  let currentShop = typeof SHOP !== "undefined" ? { ...SHOP } : {
    name: "Mahadev Collection",
    whatsapp: "917030474595",
    phones: ["7030474595", "7742185654"],
    city: "Jaysingpur, Maharashtra",
    address: "Mahadev Collection, Jaysingpur, Maharashtra",
    mapQuery: "Jaysingpur, Maharashtra",
    instagram: "",
    facebook: ""
  };

  let currentCategories = typeof CATEGORIES !== "undefined" ? { ...CATEGORIES } : {
    men: "Men",
    women: "Women",
    kids: "Kids"
  };

  let currentProducts = typeof PRODUCTS !== "undefined" ? [...PRODUCTS] : [];

  const byId = id => currentProducts.find(p => p.id === id);
  const catName = p => currentCategories[p.cat || p.category_slug] || p.cat || p.category_slug || "Collection";
  const waLink = text => "https://wa.me/" + (currentShop.whatsapp || "917030474595") + "?text=" + encodeURIComponent(text);

  /* ---------- cart storage (bumped to v3 for colors & sizes) ---------- */
  const KEY = "mahadev_cart_v3";

  function getCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY)) || [];
      return raw.filter(i => byId(i.id));
    } catch (e) {
      return [];
    }
  }

  function saveCart(c) {
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch (e) {
      /* storage blocked */
    }
    updateBadge();
  }

  function cartLines() {
    return getCart().map(i => {
      const p = byId(i.id);
      return {
        ...i,
        p,
        line: (p && p.price) ? p.price * i.qty : 0
      };
    });
  }

  function totals() {
    const lines = cartLines();
    return {
      lines,
      qty: lines.reduce((a, l) => a + l.qty, 0),
      total: lines.reduce((a, l) => a + l.line, 0),
      unpriced: lines.filter(l => !l.p || !l.p.price).length
    };
  }

  function addToCart(id, size, colour, qty) {
    const c = getCart();
    const s = size || "";
    const col = colour || "";
    const f = c.find(i => i.id === id && (i.size || "") === s && (i.colour || "") === col);
    if (f) {
      f.qty = Math.min(50, f.qty + qty);
    } else {
      c.push({ id, size: s, colour: col, qty });
    }
    saveCart(c);
  }

  function updateBadge() {
    const n = totals().qty;
    $$(".cart-count").forEach(b => {
      b.textContent = n;
      b.classList.toggle("show", n > 0);
    });
  }

  let toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- product card HTML ---------- */
  function imgs(p) {
    const imgUrl = p.img || p.image_url || "images/banner.jpg";
    return `<img class="bg" src="${esc(imgUrl)}" alt="" aria-hidden="true"><img class="fg" src="${esc(imgUrl)}" alt="${esc(p.name)}" loading="lazy">`;
  }

  function priceHtml(p) {
    return p.price ? `<span class="price">${money(p.price)}</span>` : `<span class="price ask">Price on WhatsApp</span>`;
  }

  function card(p) {
    const isOut = p.in_stock === 0 || p.in_stock === false;
    const hasOptions = (p.sizes && p.sizes.length) || (p.colors && p.colors.length);
    const isLand = Boolean(p.land || p.is_landscape);
    const categoryTitle = currentCategories[p.cat || p.category_slug] || p.cat || "Collection";

    let actionBtn = "";
    if (isOut) {
      actionBtn = `<button class="mini-btn out-btn" disabled>Out of Stock</button>`;
    } else if (hasOptions) {
      actionBtn = `<a class="mini-btn" href="product.html?id=${encodeURIComponent(p.id)}">Select Options</a>`;
    } else {
      actionBtn = `<button class="mini-btn" data-add="${esc(p.id)}">Add to Cart</button>`;
    }

    return `
    <article class="product-card">
      <a class="product-image ${isLand ? "land" : ""}" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.name)}">
        ${imgs(p)}
        ${isOut ? `<span class="badge out-of-stock">Out of Stock</span>` : (p.tag ? `<span class="badge">${esc(p.tag)}</span>` : "")}
      </a>
      <div class="product-info">
        <p class="cat">${esc(categoryTitle)}</p>
        <h3><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3>
        <div class="product-bottom">
          ${priceHtml(p)}
          ${actionBtn}
        </div>
      </div>
    </article>`;
  }

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-add]");
    if (b) {
      const prod = byId(b.dataset.add);
      if (prod && (prod.in_stock === 0 || prod.in_stock === false)) {
        toast("Sorry, this item is out of stock");
        return;
      }
      addToCart(b.dataset.add, "", "", 1);
      toast("✓ Added to cart");
    }
  });

  /* ---------- UI Settings Sync ---------- */
  function updateShopUI() {
    const phones = Array.isArray(currentShop.phones) ? currentShop.phones : [currentShop.whatsapp];
    const primaryPhone = phones[0] || "7030474595";
    const secondPhone = phones[1] || "";

    // 1. Top bar
    const topbar = $(".topbar");
    if (topbar) {
      let phoneLinks = `<a href="tel:+91${esc(primaryPhone)}">${esc(primaryPhone)}</a>`;
      if (secondPhone) {
        phoneLinks += ` &nbsp;|&nbsp; <a href="tel:+91${esc(secondPhone)}">${esc(secondPhone)}</a>`;
      }
      topbar.innerHTML = `📞 Call / WhatsApp: ${phoneLinks} &nbsp;·&nbsp; ${esc(currentShop.city || "Jaysingpur")}`;
    }

    // 2. WhatsApp links
    const waText = encodeURIComponent("Hello " + (currentShop.name || "Mahadev Collection"));
    $$(".whatsapp-btn").forEach(a => {
      a.href = `https://wa.me/${currentShop.whatsapp}?text=${waText}`;
    });
    const floatWa = $(".float-wa");
    if (floatWa) {
      floatWa.href = `https://wa.me/${currentShop.whatsapp}?text=${waText}`;
    }

    // 3. Footer address, phone, opening hours
    const footerLines = $$(".footer .contact-line");
    if (footerLines.length >= 3) {
      // Address
      const addrSpan = footerLines[0].querySelector("span");
      if (addrSpan) addrSpan.innerHTML = esc(currentShop.address || "").replace(/\n/g, "<br>");

      // Phones
      const phoneSpan = footerLines[1].querySelector("span");
      if (phoneSpan) {
        let h = `<a href="tel:+91${esc(primaryPhone)}">${esc(primaryPhone)}</a>`;
        if (secondPhone) h += `<br><a href="tel:+91${esc(secondPhone)}">${esc(secondPhone)}</a>`;
        phoneSpan.innerHTML = h;
      }

      // WhatsApp link
      const waSpan = footerLines[2].querySelector("span a");
      if (waSpan) waSpan.href = `https://wa.me/${currentShop.whatsapp}`;
    }

    // 4. Social links & opening hours in footer
    const visitDiv = $(".footer-grid > div:last-child");
    if (visitDiv && currentShop.opening_hours) {
      let hoursLine = $(".footer-hours");
      if (!hoursLine) {
        hoursLine = document.createElement("div");
        hoursLine.className = "contact-line footer-hours";
        hoursLine.innerHTML = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg><span>${esc(currentShop.opening_hours)}</span>`;
        visitDiv.appendChild(hoursLine);
      }
    }

    // Socials
    if (visitDiv) {
      let socials = $(".footer .socials");
      const hasInsta = Boolean(currentShop.instagram);
      const hasFb = Boolean(currentShop.facebook);
      if (hasInsta || hasFb) {
        if (!socials) {
          socials = document.createElement("div");
          socials.className = "socials";
          visitDiv.appendChild(socials);
        }
        let socHtml = "";
        if (hasInsta) socHtml += `<a href="${esc(currentShop.instagram)}" target="_blank" rel="noopener">Instagram</a>`;
        if (hasFb) socHtml += `<a href="${esc(currentShop.facebook)}" target="_blank" rel="noopener">Facebook</a>`;
        socials.innerHTML = socHtml;
      } else if (socials) {
        socials.remove();
      }
    }
  }

  async function syncSettings() {
    if (typeof API !== "undefined" && API.getSettings) {
      try {
        const s = await API.getSettings();
        if (s && s.name) {
          currentShop = { ...currentShop, ...s };
          updateShopUI();
        }
      } catch (err) {
        // Silently use offline SHOP fallback
        console.warn("Using offline shop settings fallback:", err.message);
      }
    }
    updateShopUI();
  }

  /* ---------- Header / Nav ---------- */
  function initNav() {
    const t = $(".menu-toggle"), m = $(".nav-menu");
    if (t && m) {
      t.addEventListener("click", () => {
        const o = m.classList.toggle("open");
        t.setAttribute("aria-expanded", o);
      });
    }
    updateBadge();
    syncSettings();
  }

  /* ---------- HOME ---------- */
  async function initHome() {
    const slides = $$(".slide"), dots = $$(".dot");
    let cur = 0, timer;
    function show(i) {
      if (!slides.length) return;
      cur = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle("active", k === cur));
      dots.forEach((d, k) => d.classList.toggle("active", k === cur));
    }
    function auto() { clearInterval(timer); timer = setInterval(() => show(cur + 1), 5500); }
    if ($(".left-arrow")) $(".left-arrow").addEventListener("click", () => { show(cur - 1); auto(); });
    if ($(".right-arrow")) $(".right-arrow").addEventListener("click", () => { show(cur + 1); auto(); });
    dots.forEach((d, k) => d.addEventListener("click", () => { show(k); auto(); }));
    if (slides.length) { show(0); auto(); }

    const f = $("#featured");
    if (!f) return;

    f.innerHTML = `<div class="loading-state"><h3>Loading products...</h3><p>Fetching newest collection.</p></div>`;

    if (typeof API !== "undefined" && API.getProducts) {
      try {
        const data = await API.getProducts();
        if (Array.isArray(data) && data.length > 0) {
          currentProducts = data;
        }
      } catch (err) {
        console.warn("Home API fetch failed, falling back to products.js:", err.message);
      }
    }

    const list = currentProducts.filter(p => p.isNew || p.is_new).slice(0, 8);
    f.innerHTML = list.length ? list.map(card).join("") : `<div class="empty"><h3>No new arrivals found</h3></div>`;
    updateBadge();
  }

  /* ---------- SHOP ---------- */
  async function initShop() {
    const grid = $("#shop-grid"), search = $("#search"), sort = $("#sort");
    let cat = params.get("cat") || "all";
    if (!["all", "men", "women", "kids", "new"].includes(cat)) cat = "all";

    if (grid) {
      grid.innerHTML = `<div class="loading-state"><h3>Loading products...</h3><p>Please wait a moment.</p></div>`;
    }

    if (typeof API !== "undefined" && API.getProducts) {
      try {
        const data = await API.getProducts();
        if (Array.isArray(data) && data.length > 0) {
          currentProducts = data;
        }
      } catch (err) {
        console.warn("Shop API fetch failed, falling back to products.js:", err.message);
      }
    }

    function render() {
      const q = (search ? search.value : "").trim().toLowerCase();
      let list = currentProducts.filter(p => {
        const pCat = p.cat || p.category_slug;
        const isNew = Boolean(p.isNew || p.is_new);
        const okCat = cat === "all" || (cat === "new" ? isNew : pCat === cat);
        const text = (p.name + " " + (p.desc || p.description || "") + " " + (currentCategories[pCat] || "")).toLowerCase();
        const okQ = !q || text.includes(q);
        return okCat && okQ;
      });

      if (sort && sort.value === "low") list.sort((a, b) => (a.price || 1e9) - (b.price || 1e9));
      if (sort && sort.value === "high") list.sort((a, b) => (b.price || 0) - (a.price || 0));

      const primaryPhone = (currentShop.phones && currentShop.phones[0]) || currentShop.whatsapp;
      if (grid) {
        grid.innerHTML = list.length ? list.map(card).join("") :
          `<div class="empty"><h3>No products found</h3><p>Try a different category or search. You can also WhatsApp us on ${esc(primaryPhone)}.</p></div>`;
      }

      $$(".filters button").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
      if ($("#count")) $("#count").textContent = list.length + (list.length === 1 ? " product" : " products");
      const names = { all: "All Collection", men: "Men", women: "Women", kids: "Kids", new: "New Arrivals" };
      if ($("#shop-title")) $("#shop-title").textContent = names[cat] || "Collection";
    }

    $$(".filters button").forEach(b => b.addEventListener("click", () => {
      cat = b.dataset.cat;
      history.replaceState(null, "", cat === "all" ? "shop.html" : "shop.html?cat=" + cat);
      render();
    }));

    if (search) search.addEventListener("input", render);
    if (sort) sort.addEventListener("change", render);
    render();
    updateBadge();
  }

  /* ---------- PRODUCT DETAIL ---------- */
  async function initProduct() {
    const root = $("#product-root");
    const id = params.get("id");

    if (root) {
      root.innerHTML = `<div class="loading-state"><h3>Loading product details...</h3></div>`;
    }

    let p = null;
    if (typeof API !== "undefined" && API.getProduct && id) {
      try {
        p = await API.getProduct(id);
      } catch (err) {
        console.warn("Product API fetch failed, falling back to products.js:", err.message);
      }
    }

    if (!p) {
      p = byId(id);
    }

    if (!p) {
      if (root) {
        root.innerHTML = `<div class="empty-cart"><h3>Product not found</h3><p>This product may have been removed or is currently unavailable.</p><a class="btn" href="shop.html">Back to Shop</a></div>`;
      }
      return;
    }

    // Also fetch all products for related section if needed
    if (currentProducts.length <= 1 && typeof API !== "undefined" && API.getProducts) {
      try {
        const all = await API.getProducts();
        if (Array.isArray(all)) currentProducts = all;
      } catch (_) {}
    }

    document.title = p.name + " | " + (currentShop.name || "Mahadev Collection");
    if ($("#crumb-name")) $("#crumb-name").textContent = p.name;

    const pCat = p.cat || p.category_slug;
    const isLand = Boolean(p.land || p.is_landscape);
    const isOut = p.in_stock === 0 || p.in_stock === false;
    const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0;
    const hasColors = Array.isArray(p.colors) && p.colors.length > 0;

    let size = "", colour = "", qty = 1;

    const categoryTitle = currentCategories[pCat] || pCat;
    const primaryPhone = (currentShop.phones && currentShop.phones[0]) || currentShop.whatsapp;

    root.innerHTML = `
      <div class="detail">
        <div class="detail-img ${isLand ? "land" : ""}">${imgs(p)}</div>
        <div class="detail-info">
          <p class="cat">${esc(categoryTitle)}${p.isNew || p.is_new ? " · New Arrival" : ""}</p>
          <h1>${esc(p.name)}</h1>
          ${isOut ? `<div class="stock-badge out">Out of Stock</div>` : `<div class="stock-badge in">In Stock</div>`}
          ${priceHtml(p)}
          <p class="desc">${esc(p.desc || p.description || "")}</p>

          ${hasSizes ? `
            <div class="opt-label">Select Size</div>
            <div class="sizes" id="sizes">${p.sizes.map(s => `<button type="button" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>
            <div class="size-warn" id="size-warn" style="display:none">Please select a size first.</div>
          ` : ""}

          ${hasColors ? `
            <div class="opt-label">Select Colour</div>
            <div class="colors" id="colors">${p.colors.map(c => `<button type="button" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
            <div class="size-warn" id="color-warn" style="display:none">Please select a colour first.</div>
          ` : ""}

          <div class="opt-label">Quantity</div>
          <div class="buy-row">
            <div class="qty"><button type="button" id="q-" aria-label="Decrease">−</button><span id="q">1</span><button type="button" id="q+" aria-label="Increase">+</button></div>
          </div>

          <div class="buy-row">
            <button class="btn" id="add" ${isOut ? "disabled style='opacity:0.5;cursor:not-allowed'" : ""}>${isOut ? "OUT OF STOCK" : "ADD TO CART"}</button>
            <a class="btn btn-wa" id="wa" href="#" target="_blank" rel="noopener">ENQUIRE ON WHATSAPP</a>
          </div>

          <div class="note-box">${p.price ? "" : "<strong>Price:</strong> Message us on WhatsApp for the latest price. "}
            Final price, colours and stock are confirmed on WhatsApp before you pay.
            Call: <a href="tel:+91${esc(primaryPhone)}"><strong>${esc(primaryPhone)}</strong></a>
            ${currentShop.return_policy ? `<br><small style="opacity:0.85;margin-top:6px;display:block">Return Policy: ${esc(currentShop.return_policy)}</small>` : ""}
          </div>
        </div>
      </div>`;

    function validateOptions() {
      let valid = true;
      if (hasSizes && !size) {
        const sw = $("#size-warn");
        if (sw) sw.style.display = "block";
        valid = false;
      }
      if (hasColors && !colour) {
        const cw = $("#color-warn");
        if (cw) cw.style.display = "block";
        valid = false;
      }
      return valid;
    }

    $$("#sizes button").forEach(b => b.addEventListener("click", () => {
      size = b.dataset.s;
      const sw = $("#size-warn");
      if (sw) sw.style.display = "none";
      $$("#sizes button").forEach(x => x.classList.toggle("active", x === b));
    }));

    $$("#colors button").forEach(b => b.addEventListener("click", () => {
      colour = b.dataset.c;
      const cw = $("#color-warn");
      if (cw) cw.style.display = "none";
      $$("#colors button").forEach(x => x.classList.toggle("active", x === b));
    }));

    $("#q-").onclick = () => { qty = Math.max(1, qty - 1); $("#q").textContent = qty; };
    $("#q\\+").onclick = () => { qty = Math.min(50, qty + 1); $("#q").textContent = qty; };

    $("#add").onclick = () => {
      if (isOut) {
        toast("Sorry, this item is out of stock");
        return;
      }
      if (!validateOptions()) return;
      addToCart(p.id, size, colour, qty);
      toast("✓ Added to cart");
    };

    $("#wa").addEventListener("click", e => {
      if (!validateOptions()) {
        e.preventDefault();
        return;
      }
      const msg = `Hello ${currentShop.name}! I am interested in:\n*${p.name}*\n` +
        (size ? `Size: ${size}\n` : "") +
        (colour ? `Colour: ${colour}\n` : "") +
        `Quantity: ${qty}\n` +
        (p.price ? `Price: ${money(p.price)}\n` : "") +
        `\nLink: ${location.href}\n\nPlease share details.`;
      $("#wa").href = waLink(msg);
    });

    // Related products
    const rel = currentProducts.filter(x => (x.cat || x.category_slug) === pCat && x.id !== p.id).slice(0, 4);
    const r = $("#related");
    if (r) {
      if (rel.length) {
        r.innerHTML = rel.map(card).join("");
      } else {
        const relSection = r.closest("section");
        if (relSection) relSection.style.display = "none";
      }
    }

    updateBadge();
  }

  /* ---------- CART ---------- */
  function lineHtml(l) {
    const key = `data-id="${esc(l.id)}" data-size="${esc(l.size)}" data-colour="${esc(l.colour)}"`;
    const metaParts = [];
    if (l.size) metaParts.push("Size: " + esc(l.size));
    if (l.colour) metaParts.push("Colour: " + esc(l.colour));
    metaParts.push(l.p.price ? money(l.p.price) + " each" : "Price on WhatsApp");

    const imgUrl = l.p.img || l.p.image_url || "images/banner.jpg";

    return `
    <div class="cart-item">
      <a href="product.html?id=${encodeURIComponent(l.id)}"><img src="${esc(imgUrl)}" alt="${esc(l.p.name)}"></a>
      <div>
        <h3><a href="product.html?id=${encodeURIComponent(l.id)}">${esc(l.p.name)}</a></h3>
        <p class="meta">${metaParts.join(" · ")}</p>
        <div class="qty">
          <button ${key} data-d="-1" aria-label="Decrease">−</button>
          <span>${l.qty}</span>
          <button ${key} data-d="1" aria-label="Increase">+</button>
        </div>
      </div>
      <div class="cart-right">
        <strong>${l.p.price ? money(l.line) : "—"}</strong>
        <button class="remove" ${key} data-rm="1">Remove</button>
      </div>
    </div>`;
  }

  function summaryRows(t) {
    return `
      <div class="sum-row"><span>Items</span><span>${t.qty}</span></div>
      <div class="sum-row total"><span>Total</span><span>${t.total ? money(t.total) : "—"}</span></div>
      <p class="sum-note">${t.unpriced ? `${t.unpriced} item(s) have no listed price – we will confirm the price on WhatsApp. ` : ""}Delivery / pickup details and final amount are confirmed on WhatsApp.</p>
      ${currentShop.return_policy ? `<p class="sum-note" style="margin-top:8px"><strong>Exchange:</strong> ${esc(currentShop.return_policy)}</p>` : ""}`;
  }

  async function initCart() {
    const root = $("#cart-root");
    if (!root) return;

    // Load active products list to ensure accurate prices/items
    if (typeof API !== "undefined" && API.getProducts) {
      try {
        const prods = await API.getProducts();
        if (Array.isArray(prods) && prods.length > 0) currentProducts = prods;
      } catch (_) {}
    }

    function render() {
      const t = totals();
      if (!t.lines.length) {
        root.innerHTML = `<div class="empty-cart"><h3>Your cart is empty</h3><p>Add some products to continue.</p><a class="btn" href="shop.html">START SHOPPING</a></div>`;
        return;
      }
      root.innerHTML = `
      <div class="cart-layout">
        <div>
          ${t.lines.map(lineHtml).join("")}
          <button class="remove" id="clear" style="margin-top:6px">Clear cart</button>
        </div>
        <aside class="summary">
          <h2>Order Summary</h2>
          ${summaryRows(t)}
          <a class="btn btn-block" href="checkout.html">PROCEED TO CHECKOUT →</a>
          <a class="btn btn-outline btn-block" href="shop.html" style="margin-top:12px">CONTINUE SHOPPING</a>
        </aside>
      </div>`;
    }

    root.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      const c = getCart();

      if (b.id === "clear") {
        saveCart([]);
        render();
        return;
      }

      const it = c.find(i =>
        i.id === b.dataset.id &&
        (i.size || "") === (b.dataset.size || "") &&
        (i.colour || "") === (b.dataset.colour || "")
      );

      if (!it) return;

      if (b.dataset.rm) {
        c.splice(c.indexOf(it), 1);
      } else {
        it.qty += Number(b.dataset.d);
        if (it.qty <= 0) c.splice(c.indexOf(it), 1);
        else it.qty = Math.min(it.qty, 50);
      }
      saveCart(c);
      render();
    });

    render();
    updateBadge();
  }

  /* ---------- CHECKOUT ---------- */
  async function initCheckout() {
    const root = $("#checkout-root");
    if (!root) return;

    if (typeof API !== "undefined" && API.getProducts) {
      try {
        const prods = await API.getProducts();
        if (Array.isArray(prods) && prods.length > 0) currentProducts = prods;
      } catch (_) {}
    }

    const t = totals();
    if (!t.lines.length) {
      root.innerHTML = `<div class="empty-cart"><h3>Your cart is empty</h3><p>Add products before checking out.</p><a class="btn" href="shop.html">START SHOPPING</a></div>`;
      return;
    }

    root.innerHTML = `
    <div class="cart-layout">
      <form class="box" id="co-form" novalidate>
        <h2>Your Details</h2>
        <!-- Honeypot anti-spam field -->
        <div style="display:none" aria-hidden="true">
          <input type="text" id="co-hp" name="website" tabindex="-1" autocomplete="off">
        </div>
        <div class="form-grid">
          <div class="field"><label for="n">Full Name *</label><input id="n" required autocomplete="name"></div>
          <div class="field"><label for="m">Mobile Number *</label><input id="m" required inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10 digit number"></div>
          <div class="field full"><label for="a">Address / Area</label><textarea id="a" autocomplete="street-address" placeholder="Leave blank if you will pick up from the shop"></textarea></div>
          <div class="field"><label for="c">City</label><input id="c" value="${esc(currentShop.city ? currentShop.city.split(',')[0].trim() : "Jaysingpur")}" autocomplete="address-level2"></div>
          <div class="field"><label for="d">Delivery</label><select id="d"><option>Pick up from shop</option><option>Home delivery (confirm on WhatsApp)</option></select></div>
          <div class="field full"><label for="nt">Note (colour, size, delivery instructions)</label><textarea id="nt"></textarea></div>
        </div>
        <p id="err" style="color:#ff8a8a;margin-top:14px;display:none"></p>
        <button class="btn btn-wa btn-block" id="co-btn" type="submit" style="margin-top:22px">SEND ORDER ON WHATSAPP</button>
        <p class="sum-note" style="margin-top:14px">Clicking the button records your order and opens WhatsApp ready to send to Mahadev Collection. No online payment is taken on this website.</p>
      </form>
      <aside class="summary">
        <h2>Your Order</h2>
        <ul class="mini-list">
          ${t.lines.map(l => {
            const opts = [l.size ? "Size: " + l.size : "", l.colour ? "Col: " + l.colour : ""].filter(Boolean).join(", ");
            return `<li><span>${esc(l.p.name)}${opts ? " (" + esc(opts) + ")" : ""} × ${l.qty}</span><span>${l.p.price ? money(l.line) : "—"}</span></li>`;
          }).join("")}
        </ul>
        ${summaryRows(t)}
        <a class="remove" href="cart.html">← Edit cart</a>
      </aside>
    </div>`;

    $("#co-form").addEventListener("submit", async e => {
      e.preventDefault();
      const name = $("#n").value.trim();
      const mob = $("#m").value.trim();
      const err = $("#err");
      const submitBtn = $("#co-btn");

      if (name.length < 2) {
        err.textContent = "Please enter your name (at least 2 characters).";
        err.style.display = "block";
        return;
      }
      if (!/^[6-9]\d{9}$/.test(mob)) {
        err.textContent = "Please enter a valid 10-digit mobile number starting with 6-9.";
        err.style.display = "block";
        return;
      }
      err.style.display = "none";

      const T = totals();
      submitBtn.disabled = true;
      submitBtn.textContent = "SAVING ORDER...";

      // Prepare order data for API
      const orderPayload = {
        customer_name: name,
        mobile: mob,
        address: $("#a").value.trim(),
        city: $("#c").value.trim(),
        delivery_type: $("#d").value,
        note: $("#nt").value.trim(),
        website: $("#co-hp") ? $("#co-hp").value.trim() : "",
        items: T.lines.map(l => ({
          product_id: l.p.id,
          size: l.size || null,
          colour: l.colour || null,
          qty: l.qty
        }))
      };

      let orderId = null;
      let orderSaveError = null;

      if (typeof API !== "undefined" && API.createOrder) {
        try {
          const res = await API.createOrder(orderPayload);
          if (res && res.order_id) {
            orderId = res.order_id;
          }
        } catch (apiErr) {
          console.warn("Failed to save order to local database:", apiErr.message);
          orderSaveError = apiErr.message;
        }
      }

      // Build WhatsApp message
      let msg = `*New Order${orderId ? ` (#${orderId.slice(0, 8)})` : ""} – ${currentShop.name}*\n\n`;
      T.lines.forEach((l, i) => {
        const itemDetails = [l.size ? "Size: " + l.size : "", l.colour ? "Colour: " + l.colour : ""].filter(Boolean).join(", ");
        msg += `${i + 1}. ${l.p.name}${itemDetails ? " (" + itemDetails + ")" : ""} × ${l.qty}` +
          (l.p.price ? ` = ${money(l.line)}` : " = price to confirm") + "\n";
      });
      msg += `\nTotal items: ${T.qty}\n` +
        (T.total ? `Total (priced items): ${money(T.total)}\n` : "") +
        (T.unpriced ? `(${T.unpriced} item(s) price to be confirmed)\n` : "");

      msg += `\n*Customer Details*\nName: ${name}\nMobile: ${mob}\n` +
        ($("#a").value.trim() ? `Address: ${$("#a").value.trim()}\n` : "") +
        `City: ${$("#c").value.trim()}\nDelivery: ${$("#d").value}\n` +
        ($("#nt").value.trim() ? `Note: ${$("#nt").value.trim()}\n` : "");

      if (orderId) {
        msg += `\n*Order Ref:* ${orderId}\n`;
      }

      // Open WhatsApp
      window.open(waLink(msg), "_blank", "noopener");

      // FIX EXISTING BUG: Only clear the cart after the order was saved successfully.
      if (orderId) {
        saveCart([]);
        root.innerHTML = `
          <div class="success">
            <div class="tick">✓</div>
            <h2>Thank you, ${esc(name)}!</h2>
            <p>Your order ref: <strong>#${esc(orderId.slice(0, 8))}</strong> has been recorded in the store database.</p>
            <p>WhatsApp has opened with your order details. Please press <strong>Send</strong> there so that we receive it.<br>We will confirm price, colour and delivery shortly.</p>
            <div style="margin-top:24px"><a class="btn" href="shop.html">CONTINUE SHOPPING</a></div>
          </div>`;
      } else {
        // Order failed to save to DB: KEEP cart in localStorage and show clear warning
        submitBtn.disabled = false;
        submitBtn.textContent = "SEND ORDER ON WHATSAPP";
        root.innerHTML = `
          <div class="warning-box" style="background:#1f1606;border:1px solid #d9a928;border-radius:10px;padding:32px 24px;text-align:center;max-width:680px;margin:30px auto">
            <h2 style="color:#f4cf5b;margin-bottom:12px">WhatsApp Opened With Your Order</h2>
            <p style="color:#ddd;margin-bottom:16px">WhatsApp has opened with your items ready to send directly to Mahadev Collection.</p>
            <p style="color:#aaa;font-size:14px;margin-bottom:20px">
              <em>Note:</em> The local database did not respond (${esc(orderSaveError || "offline mode")}), so <strong>your cart has NOT been cleared</strong> and remains safely preserved.
            </p>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
              <a class="btn" href="cart.html">View Cart</a>
              <a class="btn btn-outline" href="shop.html">Continue Shopping</a>
            </div>
          </div>`;
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- CONTACT ---------- */
  function initContact() {
    const f = $("#contact-form");
    if (!f) return;

    // Contact page specific UI sync
    const phones = Array.isArray(currentShop.phones) ? currentShop.phones : [currentShop.whatsapp];
    const callCardLinks = $$(".info-card a.num");
    if (callCardLinks.length >= 1 && phones[0]) {
      callCardLinks[0].href = `tel:+91${phones[0]}`;
      callCardLinks[0].textContent = phones[0];
    }
    if (callCardLinks.length >= 2 && phones[1]) {
      callCardLinks[1].href = `tel:+91${phones[1]}`;
      callCardLinks[1].textContent = phones[1];
    }

    const addrP = $(".info-card:nth-child(3) p");
    if (addrP && currentShop.address) {
      addrP.innerHTML = esc(currentShop.address).replace(/\n/g, "<br>");
    }

    const mapIframe = $(".map iframe");
    if (mapIframe && (currentShop.map_link || currentShop.map_query)) {
      mapIframe.src = currentShop.map_link || `https://www.google.com/maps?q=${encodeURIComponent(currentShop.map_query)}&output=embed`;
    }

    f.addEventListener("submit", e => {
      e.preventDefault();
      const n = $("#cn").value.trim(), m = $("#cm").value.trim(), msg = $("#cmsg").value.trim();
      if (!n || !msg) {
        toast("Please enter your name and message");
        return;
      }
      window.open(waLink(`Hello ${currentShop.name}!\nName: ${n}\n${m ? "Mobile: " + m + "\n" : ""}\n${msg}`), "_blank", "noopener");
      f.reset();
    });
  }

  /* ---------- BOOT ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    const page = document.body.dataset.page;
    const routes = {
      home: initHome,
      shop: initShop,
      product: initProduct,
      cart: initCart,
      checkout: initCheckout,
      contact: initContact
    };
    if (routes[page]) {
      routes[page]();
    }
  });
})();
