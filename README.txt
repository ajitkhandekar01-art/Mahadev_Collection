================================================================================
MAHADEV COLLECTION – LOCAL SQLITE WEBSITE & ADMIN PANEL
महादेव कलेक्शन – स्थानिक डेटाबेस वेबसाइट आणि अ‍ॅडमिन पॅनेल
================================================================================

[ENGLISH GUIDE]
--------------------------------------------------------------------------------
This project is now powered by Node.js + Express and a local SQLite database (data/mahadev.db).
Products, customer orders, and shop settings are safely stored in the database.
An easy-to-use Admin Panel allows the shop owner to manage products, change prices,
upload images, view orders, and download backups without editing any code.

1. REQUIREMENTS
   - Install Node.js (v18 or higher) from https://nodejs.org/

2. SETUP (Run once)
   Open terminal / command prompt in this `mahadev-site` folder:
   $ npm install

3. CREATE ADMIN ACCOUNT (Run once or to change password)
   $ npm run set-admin
   - Enter your email (e.g. admin@mahadev.com)
   - Enter your password (minimum 8 characters)

4. START THE SERVER
   $ npm start
   - Website URL:     http://localhost:3000
   - Admin Panel URL: http://localhost:3000/admin.html

5. ADMIN PANEL FEATURES
   - Products: Add new products with photos (JPG, PNG, WebP up to 2MB), change
     prices, update sizes/colors, toggle In Stock or New Arrival.
   - Orders: View all customer orders placed through WhatsApp checkout,
     update status (New, Confirmed, Delivered, Cancelled), click "Reply on WhatsApp",
     and export orders to CSV (Excel).
   - Shop Settings: Update store name, WhatsApp number, calling phones, address,
     opening hours, and return policy.
   - Database Backup: Download a single-file copy of `data/mahadev.db` anytime
     with one click.

6. OFFLINE FALLBACK
   If opened directly as a file (without running the server), the website
   automatically falls back to `js/products.js` so it is never blank.

7. DEPLOYMENT NOTE
   Because this website now has a Node.js backend and SQLite database, plain
   static hosts like Netlify Drop / GitHub Pages will NOT work.
   To host online, deploy to any Node.js hosting platform or VPS (such as
   Render, Railway, DigitalOcean, Hetzner, Hostinger VPS, or AWS).


================================================================================
[मराठी माहिती / MARATHI GUIDE]
--------------------------------------------------------------------------------
या वेबसाइटमध्ये आता स्थानिक SQLite डेटाबेस (data/mahadev.db) जोडला गेला आहे.
आता प्रॉडक्ट्स, ऑर्डर्स आणि दुकानाची माहिती थेट डेटाबेसमध्ये सेव्ह होते.
दुकानदारासाठी मोबाईल-फ्रेंडली अ‍ॅडमिन पॅनेल (Admin Panel) आहे, ज्यातून कोडिंग
न करता प्रॉडक्ट, फोटो आणि किमती बदलता येतात.

१. पूर्वतयारी:
   - तुमच्या कॉम्प्युटरवर Node.js (v18 किंवा नवीन) इन्स्टॉल असावे: https://nodejs.org/

२. पहिल्यांदा इन्स्टॉल करणे:
   या फोल्डरमध्ये टर्मिनल (PowerShell / Command Prompt) उघडा आणि टाईप करा:
   npm install

३. अ‍ॅडमिन पासवर्ड सेट करणे:
   npm run set-admin
   - तुमचा ईमेल टाका (उदा. admin@mahadev.com)
   - कमीत कमी ८ अक्षरांचा पासवर्ड टाका

४. वेबसाइट चालू करणे:
   npm start
   - वेबसाइट उघडण्यासाठी:  http://localhost:3000
   - अ‍ॅडमिन पॅनेल:        http://localhost:3000/admin.html

५. अ‍ॅडमिन पॅनेल कसे वापरावे:
   - प्रॉडक्ट्स (Products): नवीन प्रॉडक्ट फोटोसकट जोडा, किंमत बदला, साईझ/रंग बदला,
     स्टॉकमध्ये आहे की नाही (In Stock) हे एका क्लिकवर बदला.
   - ऑर्डर्स (Orders): ग्राहकांनी WhatsApp वरून मागवलेल्या ऑर्डर्स इथे दिसतील.
     त्यांचा स्टेटस बदला (New, Confirmed, Delivered), "Reply on WhatsApp" बटनाने
     ग्राहकाशी थेट चॅट करा, किंवा संपूर्ण ऑर्डर्स CSV फाईलमध्ये डाउनलोड करा.
   - दुकानाची माहिती (Shop Settings): दुकानाचे नाव, WhatsApp नंबर, फोन नंबर,
     पत्ता, दुकानाची वेळ आणि एक्स्चेंज पॉलिसी बदला.
   - डेटाबेस बॅकअप (Backup): "Download Database Backup" बटनावर क्लिक करून
     सर्व डेटाचा सुरक्षित बॅकअप कॉम्प्युटरवर सेव्ह करा.

६. ऑफलाइन सुविधा:
   जर सर्व्हर चालू नसेल किंवा index.html थेट फाईल म्हणून उघडली, तरीही वेबसाइट
   बंद पडत नाही - ती आपोआप js/products.js मधील डेटा दाखवते.

७. ऑनलाइन टाकण्याबाबत महत्त्वाची नोंद:
   आता या वेबसाइटला Node.js आणि डेटाबेस बॅकएंड असल्यामुळे Netlify Drop सारख्या
   साध्या स्टॅटिक होस्टिंगवर हे चालणार नाही. ऑनलाइन टाकण्यासाठी Render, Railway,
   किंवा VPS (Hostinger / DigitalOcean) वापरावे लागेल.
================================================================================
