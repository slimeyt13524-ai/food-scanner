const startBtn = document.getElementById("start-scan");
const video = document.getElementById("video");
const statusEl = document.getElementById("status");
const itemList = document.getElementById("item-list");

let codeReader;

// Start scanning when user clicks button
startBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Camera not supported on this device.");
    return;
  }

  startBtn.disabled = true;
  statusEl.textContent = "Starting camera...";

  codeReader = new ZXing.BrowserMultiFormatReader();
  try {
    const devices = await ZXing.BrowserCodeReader.listVideoInputDevices();
    const selectedDeviceId = devices[0].deviceId;
    await codeReader.decodeFromVideoDevice(selectedDeviceId, "video", (result, err) => {
      if (result) {
        const barcode = result.text;
        statusEl.textContent = `Scanned: ${barcode}`;
        fetchProduct(barcode);
      }
      if (err && !(err instanceof ZXing.NotFoundException)) {
        console.error(err);
      }
    });
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Error starting camera.";
  }
});

// Fetch product info from Open Food Facts
async function fetchProduct(barcode) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();

    if (data.status === 1) {
      const name = data.product.product_name || "Unnamed Product";
      addItemToList(name, barcode);
    } else {
      addItemToList(`Unknown product (${barcode})`, barcode);
    }
  } catch (err) {
    console.error(err);
    addItemToList(`Error fetching (${barcode})`, barcode);
  }
}

// Add scanned product to the list
function addItemToList(name, barcode) {
  const li = document.createElement("li");
  li.textContent = `${name} — ${barcode}`;
  itemList.prepend(li); // newest first
}
