//V=1

function submitForm(e) {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value;

  document.getElementById('form-status').innerText =
    'Thank you, ' + name + '! Your message has been sent.';

  document.getElementById('name').value = '';
  document.getElementById('email').value = '';
  document.getElementById('message').value = '';
}
const productImages = [
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
  "images/products/product11.jpeg",
  // Add all image paths here
];

let currentImage = 0;
const imageElement = document.getElementById("product-image");

function showImage(index) {
  imageElement.src = productImages[index];
}

function nextImage() {
  currentImage = (currentImage + 1) % productImages.length;
  showImage(currentImage);
}

function prevImage() {
  currentImage = (currentImage - 1 + productImages.length) % productImages.length;
  showImage(currentImage);
}
// Auto-cycle images every 5 seconds
setInterval(() => {
  nextImage();
}, 4000);

const serviceImages = [
  "images/services/1.jpeg",
  "images/services/2.jpeg",
  "images/services/3.jpeg",
  "images/services/4.jpeg",
  "images/services/5.jpeg",
  "images/services/6.jpeg",
  "images/services/7.jpeg",
  "images/services/8.jpeg",
  "images/services/9.jpeg",
  // Add all service image paths here
];

let currentService = 0;
const serviceImageElement = document.getElementById("service-image");

function showService(index) {
  serviceImageElement.src = serviceImages[index];
}

function nextService() {
  currentService = (currentService + 1) % serviceImages.length;
  showService(currentService);
}

function prevService() {
  currentService = (currentService - 1 + serviceImages.length) % serviceImages.length;
  showService(currentService);
}

// Auto-cycle service images every 5 seconds
setInterval(() => {
  nextService();
}, 4000);



const aboutImages = [
  "images/About/1.jpeg",
  "images/About/2.jpeg",
  "images/About/3.jpeg",
  // Add all image paths here
];

let currentaboutImage = 0;
const aboutimageElement = document.getElementById("about-image");

function showaboutImage(index) {
  aboutimageElement.src = aboutImages[index];
}

function nextaboutImage() {
  currentaboutImage = (currentaboutImage + 1) % aboutImages.length;
  showaboutImage(currentaboutImage);
}

function prevaboutImage() {
  currentaboutImage = (currentaboutImage - 1 + aboutImages.length) % aboutImages.length;
  showaboutImage(currentaboutImage);
}
// Auto-cycle images every 5 seconds
setInterval(() => {
  nextaboutImage();
}, 4000);

