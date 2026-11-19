/* ==========================================================
   MAHADEV COLLECTION – API Client
   Handles communication with Node.js / SQLite backend
   ========================================================== */

const API = (function () {
  "use strict";

  async function request(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body && body.error) message = body.error;
      } catch (_) {}
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  return {
    async getProducts(params = {}) {
      const q = new URLSearchParams();
      if (params.cat && params.cat !== 'all') q.set('cat', params.cat);
      if (params.q) q.set('q', params.q);
      const queryStr = q.toString();
      return request('/api/products' + (queryStr ? '?' + queryStr : ''));
    },

    async getProduct(id) {
      return request(`/api/products/${encodeURIComponent(id)}`);
    },

    async getSettings() {
      return request('/api/settings');
    },

    async createOrder(orderData) {
      return request('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
    }
  };
})();

