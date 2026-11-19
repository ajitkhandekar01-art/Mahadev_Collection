# Mahadev Collection (महादेव कलेक्शन)

Local SQLite Website & Admin Panel for Mahadev Collection menswear clothing store.

---

## English Guide

This project is powered by **Node.js + Express** and a local **SQLite** database (`data/mahadev.db`).
Products, customer orders, and shop settings are safely stored in the database.
An easy-to-use Admin Panel allows the shop owner to manage products, change prices, upload images, view orders, and download backups without editing any code.

### 1. Requirements
- Install **Node.js** (v18 or higher) from [nodejs.org](https://nodejs.org/)

### 2. Setup (Run once)
Open terminal in the project folder:
```bash
npm install
```

### 3. Create Admin Account
```bash
npm run set-admin
```
- Enter your email (e.g. `admin@mahadev.com`)
- Enter your password (minimum 8 characters)

### 4. Start the Server
```bash
npm start
```
- **Website URL:** http://localhost:3000
- **Admin Panel URL:** http://localhost:3000/admin.html

### 5. Admin Panel Features
- **Products:** Add new products with photos (JPG, PNG, WebP up to 2MB), change prices, update sizes/colors, toggle In Stock or New Arrival.
- **Orders:** View all customer orders placed through WhatsApp checkout, update status (New, Confirmed, Delivered, Cancelled), click "Reply on WhatsApp", and export orders to CSV (Excel).
- **Shop Settings:** Update store name, WhatsApp number, calling phones, address, opening hours, and return policy.
- **Database Backup:** Download a single-file copy of `data/mahadev.db` anytime with one click.

### 6. Offline Fallback
If opened directly as a file (without running the server), the website automatically falls back to `js/products.js` so it is never blank.

---

## मराठी माहिती (Marathi Guide)

या वेबसाइटमध्ये स्थानिक **SQLite** डेटाबेस जोडला गेला आहे. प्रॉडक्ट्स, ऑर्डर्स आणि दुकानाची माहिती थेट डेटाबेसमध्ये सेव्ह होते.
दुकानदारासाठी मोबाईल-फ्रेंडली अ‍ॅडमिन पॅनेल (Admin Panel) आहे, ज्यातून कोडिंग न करता प्रॉडक्ट, फोटो आणि किमती बदलता येतात.

### १. पूर्वतयारी:
- तुमच्या कॉम्प्युटरवर Node.js (v18 किंवा नवीन) इन्स्टॉल असावे: https://nodejs.org/

### २. इन्स्टॉल करणे:
```bash
npm install
```

### ३. अ‍ॅडमिन पासवर्ड सेट करणे:
```bash
npm run set-admin
```
- ईमेल आणि पासवर्ड टाका.

### ४. वेबसाइट चालू करणे:
```bash
npm start
```
- वेबसाइट: http://localhost:3000
- अ‍ॅडमिन पॅनेल: http://localhost:3000/admin.html
