/* ==========================================================
   MAHADEV COLLECTION – दुकानाची माहिती आणि प्रॉडक्ट्स
   नवीन प्रॉडक्ट जोडण्यासाठी / किंमत बदलण्यासाठी फक्त हीच फाईल बदला.
   price: null  =>  "Price on WhatsApp" दिसेल
   land: true   =>  फोटो आडवा (landscape) असेल तर true
   ========================================================== */

const SHOP = {
  name: "Mahadev Collection",
  whatsapp: "917030474595",          // WhatsApp ऑर्डरसाठी (91 + नंबर)
  phones: ["7030474595", "7742185654"],
  city: "Jaysingpur, Maharashtra",
  address: "Mahadev Collection, Jaysingpur, Maharashtra",   // पूर्ण पत्ता मिळाल्यावर इथे बदला
  mapQuery: "Jaysingpur, Maharashtra",
  instagram: "",                     // उदा. "https://instagram.com/yourpage"
  facebook: ""                       // उदा. "https://facebook.com/yourpage"
};

const CATEGORIES = {
  men:   "Men",
  women: "Women",
  kids:  "Kids"
};

const PRODUCTS = [
  /* ---------------- WOMEN ---------------- */
  { id: "chandni-combo", name: "Chandni Embroidered Patiala Combo", cat: "women", price: null,
    sizes: ["L", "XL"], img: "images/products/chandni-combo.jpg", tag: "NEW", isNew: true,
    desc: "Embroidered kurti with matching patiala salwar and scalloped-border dupatta. Complete combo set in L–XL size." },

  { id: "pari-674", name: "Pari-674 Rose Gold Designer Set", cat: "women", price: null,
    sizes: [], img: "images/products/pari-674.jpg", tag: "NEW", isNew: true,
    desc: "Premium quality rose gold fabric with extra margin, self interlock and extra full sleeves. Heavy embroidered top with flowing skirt and dupatta." },

  { id: "pari-580", name: "Pari-580 Embroidered Top & Palazzo Combo", cat: "women", price: null,
    sizes: ["L", "XL"], img: "images/products/pari-580.jpg", tag: "NEW", isNew: true,
    desc: "Premium quality salsa fabric, extra full sleeve, extra margin and self interlock. Richly embroidered top with palazzo and dupatta (L–XL combo)." },

  { id: "priya-anarkali", name: "Priya Anarkali Set with Dupatta", cat: "women", price: null,
    sizes: ["M", "L", "XL", "XXL"], img: "images/products/priya-anarkali.jpg", tag: "", isNew: false,
    desc: "Elegant anarkali with golden border work, matching pant and embroidered dupatta. Available in M to XXL." },

  { id: "kurta-set-brown-green", name: "Embroidered Kurta Set with Dupatta", cat: "women", price: null,
    sizes: [], img: "images/products/kurta-set-brown-green.jpg", tag: "", isNew: false,
    desc: "Straight-cut kurta set with lace-border dupatta. Available in Brown and Green." },

  /* ---------------- MEN ---------------- */
  { id: "striped-shirts", name: "Striped Casual Shirt (RP 93)", cat: "men", price: null,
    sizes: ["M", "L", "XL"], img: "images/products/striped-shirts.jpg", tag: "NEW", isNew: true,
    desc: "Soft cotton full-sleeve striped shirts in 6 fresh colours. Sizes M, L and XL." },

  /* ---------------- KIDS ---------------- */
  { id: "girls-7167", name: "Girls Top & Pleated Skirt Set – D.No. 7167", cat: "kids", price: 302,
    sizes: ["22", "24", "26"], img: "images/products/girls-7167.jpg", land: true, tag: "NEW", isNew: true,
    desc: "Cute collared top with bear & flower patch and layered pleated skirt. Colours: Maroon, Black, Brown." },

  { id: "girls-7343", name: "Girls Top & Pleated Skirt Set – D.No. 7343", cat: "kids", price: 268,
    sizes: ["22", "24", "26"], img: "images/products/girls-7343.jpg", land: true, tag: "NEW", isNew: true,
    desc: "Printed frill-sleeve collar top with butterfly-detail pleated skirt. Colours: Olive, Green, Brown, Coffee." },

  { id: "girls-7335", name: "Girls Striped Top & Frill Skirt Set – D.No. 7335", cat: "kids", price: 250,
    sizes: ["22", "24", "26"], img: "images/products/girls-7335.jpg", land: true, tag: "", isNew: false,
    desc: "Striped sleeveless polo top with black layered frill skirt and heart detail. Colours: Brown, Grey, Green." },

  { id: "girls-7014", name: "Girls Striped Top & Pleated Skirt Set – D.No. 7014", cat: "kids", price: 264,
    sizes: ["22", "24", "26"], img: "images/products/girls-7014.jpg", tag: "", isNew: false,
    desc: "Striped half-sleeve top with butterfly patch and pleated skirt with bow detail. Colours: Green, Pink." },

  { id: "kids-cargo-olive", name: "Kids Cargo Trousers – Olive", cat: "kids", price: null,
    sizes: [], img: "images/products/kids-cargo-olive.jpg", tag: "NEW", isNew: true,
    desc: "Comfortable drawstring cargo trousers with elastic rib waist and patch pockets. Perfect for everyday wear." },

  { id: "kids-cargo-pack", name: "Kids Cargo Trousers – Colour Pack", cat: "kids", price: null,
    sizes: [], img: "images/products/kids-cargo-pack.jpg", land: true, tag: "", isNew: false,
    desc: "Cargo trousers in Khaki, Olive, Sage, Cream, Black, Navy, Beige and White." },

  { id: "kids-pants-trio", name: "Kids Stylish Trousers – Olive / Black / Tan", cat: "kids", price: null,
    sizes: [], img: "images/products/kids-pants-trio.jpg", land: true, tag: "", isNew: false,
    desc: "Elastic-waist trousers with embroidered patch, soft washed finish. Colours: Olive, Black, Tan." },

  { id: "kids-pants-colours", name: "Kids Trousers – 6 Colour Range", cat: "kids", price: null,
    sizes: [], img: "images/products/kids-pants-colours.jpg", land: true, tag: "", isNew: false,
    desc: "Comfortable elastic-waist trousers in Grey, Cream, Olive, Black, Sky Blue and Brown." },

  { id: "kids-pants-flatlay", name: "Kids Casual Trousers – Colour Range", cat: "kids", price: null,
    sizes: [], img: "images/products/kids-pants-flatlay.jpg", tag: "", isNew: false,
    desc: "Washed-finish casual trousers with elastic waist in Grey, Black, Cream, Blue, Olive and Brown." }
];
