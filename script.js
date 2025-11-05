// 🔀 Page switching logic
const tabs = document.querySelectorAll(".tab");
const pages = document.querySelectorAll(".page");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    // change active tab
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    // show correct page
    const pageId = tab.dataset.page;
    pages.forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${pageId}`).classList.add("active");
  });
});

// 🧾 Scanner logic (simplified, from your working debug version)
const startBtn = document.getElementById("start-scan");
const statusEl = document.getElementById("status");
const itemList = document.getElementById("item-list");
const debugBox = document.getElementById("debug-box");

let codeReader;
let fridgeItems = JSON.parse(localStorage.getItem("fridgeItems") || "[]");

startBtn.addEventListener("click", async () => {
  debugBox.textContent = "";
  statusEl.textContent = "Requesting camera...";
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    codeReader = new ZXing.BrowserMultiFormatReader();
    const devices = await codeReader.listVideoInputDevices();
    const deviceId = devices[devices.length - 1].deviceId;

    await codeReader.decodeFromVideoDevice(deviceId, "video", (result, err) => {
      if (result) {
        const barcode = result.text;
        statusEl.textContent = `Scanned: ${barcode}`;
        fetchProduct(barcode);
      }
    });

    statusEl.textContent = "Camera started — scan a barcode!";
  } catch (err) {
    statusEl.textContent = `Camera error: ${err.message}`;
  }
});

// 📦 Fetch product info from OpenFoodFacts
async function fetchProduct(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const data = await res.json();

  if (data.status === 1) {
    const name = data.product.product_name || "Unnamed Product";
    addItem(name, barcode);
  } else {
    addItem(`Unknown product (${barcode})`, barcode);
  }
}

// ➕ Add item to list & storage
function addItem(name, barcode) {
  const li = document.createElement("li");
  li.textContent = `${name} — ${barcode}`;
  itemList.prepend(li);
  fridgeItems.push({ name, barcode });
  localStorage.setItem("fridgeItems", JSON.stringify(fridgeItems));
  renderMyItems();
}

// 🧺 My Items Page (search + list)
const myItemsList = document.getElementById("my-items-list");
const search = document.getElementById("search");

function renderMyItems() {
  myItemsList.innerHTML = "";
  const query = search.value.toLowerCase();
  fridgeItems
    .filter(i => i.name.toLowerCase().includes(query))
    .forEach(i => {
      const li = document.createElement("li");
      li.textContent = i.name;
      myItemsList.appendChild(li);
    });
}

search.addEventListener("input", renderMyItems);
renderMyItems();

// 🛒 Shopping list
const shoppingInput = document.getElementById("shopping-input");
const shoppingList = document.getElementById("shopping-list");
const addShoppingBtn = document.getElementById("add-shopping");

let shoppingItems = JSON.parse(localStorage.getItem("shoppingItems") || "[]");

function renderShopping() {
  shoppingList.innerHTML = "";
  shoppingItems.forEach(item => {
    const li = document.createElement("li");
    const haveIt = fridgeItems.some(f => f.name.toLowerCase() === item.name.toLowerCase());
    li.textContent = item.name + (haveIt ? " ✅" : "");
    shoppingList.appendChild(li);
  });
}

addShoppingBtn.addEventListener("click", () => {
  const name = shoppingInput.value.trim();
  if (name) {
    shoppingItems.push({ name });
    localStorage.setItem("shoppingItems", JSON.stringify(shoppingItems));
    shoppingInput.value = "";
    renderShopping();
  }
});

renderShopping();
