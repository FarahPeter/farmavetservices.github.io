// Farmavet Services — landing page

/* ---------- Mobile navigation ---------- */
function toggleNav() {
  var nav = document.getElementById('navLinks');
  if (nav) nav.classList.toggle('open');
}
document.querySelectorAll('#navLinks a').forEach(function (a) {
  a.addEventListener('click', function () {
    var nav = document.getElementById('navLinks');
    if (nav) nav.classList.remove('open');
  });
});

/* ---------- Carousels (auto-cycle + manual controls) ---------- */
function makeCarousel(imgId, images, intervalMs) {
  var el = document.getElementById(imgId);
  if (!el || !images.length) return { next: function () {}, prev: function () {} };

  var i = 0;
  function show() { el.src = images[i]; }
  function step(dir) { i = (i + dir + images.length) % images.length; show(); }

  var timer = setInterval(function () { step(1); }, intervalMs);
  function reset() { clearInterval(timer); timer = setInterval(function () { step(1); }, intervalMs); }

  // preload for smoother transitions
  images.forEach(function (src) { var im = new Image(); im.src = src; });

  return {
    next: function () { step(1); reset(); },
    prev: function () { step(-1); reset(); }
  };
}

var aboutImages = [
  "images/About/1.jpeg",
  "images/About/2.jpeg",
  "images/About/3.jpeg"
];

var serviceImages = [
  "images/services/1.jpeg",
  "images/services/2.jpeg",
  "images/services/3.jpeg",
  "images/services/4.jpeg",
  "images/services/5.jpeg",
  "images/services/6.jpeg",
  "images/services/7.jpeg",
  "images/services/8.jpeg",
  "images/services/9.jpeg"
];

var productImages = [
  "images/products/product1.jpeg",
  "images/products/product2.jpeg",
  "images/products/product3.jpeg",
  "images/products/product4.jpeg",
  "images/products/product5.jpeg",
  "images/products/product6.jpeg",
  "images/products/product7.jpeg",
  "images/products/product8.jpeg",
  "images/products/product9.jpeg",
  "images/products/product10.jpeg",
  "images/products/product11.jpeg"
];

var aboutCar   = makeCarousel("about-image", aboutImages, 4000);
var serviceCar = makeCarousel("service-image", serviceImages, 4000);
var productCar = makeCarousel("product-image", productImages, 4000);

function nextAbout()   { aboutCar.next(); }
function prevAbout()   { aboutCar.prev(); }
function nextService() { serviceCar.next(); }
function prevService() { serviceCar.prev(); }
function nextProduct() { productCar.next(); }
function prevProduct() { productCar.prev(); }
