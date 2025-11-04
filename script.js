const startBtn = document.getElementById("start-scan");
const video = document.getElementById("video");
const statusEl = document.getElementById("status");
const itemList = document.getElementById("item-list");

let codeReader;

startBtn.addEventListener("click", async () => {
  statusEl.textContent = "Initializing...";
  startBtn.disabled = true;

  try {
    // 1️⃣ Check for browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError("Your browser doesn’t support camera access (getUserMedia). Try Chrome or Edge.");
      return;
    }

    // 2️⃣ Check for HTTPS or localhost
    const isSecure = location.protocol === "https:" || location.hostname === "localhost";
    if (!isSecure) {
      showError("Camera only works on HTTPS or localhost.\nTry hosting it on GitHub Pages or running a local server.");
      return;
    }

    // 3️⃣ List cameras
    codeReader = new ZXing.BrowserMultiFormatReader();
    const devices = await ZXing.BrowserCodeReader.listVideoInputDevices();

    if (!devices || devices.length === 0) {
      showError("No camera devices found. Plug in a camera or check permissions.");
      return;
    }

    const selectedDeviceId = devices[devices.length - 1].deviceId;
    statusEl.textContent = "Starting camera...";

    // 4️⃣ Start scanning
    await codeReader.decodeFromVideoDevice(selectedDeviceId, "video", (result, err) => {
      if (result) {
        const barcode = result.text;
        statusEl.textContent = `Scanned: ${barcode}`;
        fetchProduct(barcode);
      }
      if (err && !(err instanceof ZXing.NotFoundException)) {
        console.warn("ZXing error:", err);
      }
    });

    statusEl.textContent = "Camera started — point it at a barcode!";

  } catch (error) {
    console.error("Camera startup error:", error);

    // 5️⃣ Detailed error handling
    if (error.name === "NotAllowedError") {
      showError("Camera permission denied. Click the lock icon in your browser and allow camera access.");
    } else if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      showError("No suitable camera found. Try switching to a different device or browser.");
    } else if (error.name === "NotReadableError") {
      showError("Camera is in use by another app. Close Zoom, Teams, or other camera apps.");
    } else if (error.name === "AbortError") {
      showError("Camera initialization was aborted — try reloading the page.");
    } else {
      showError(`Unexpected error: ${error.message || error}`);
    }

    startBtn.disabled = false;
  }
});

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

function addItemToList(name, barcode) {
  const li = document.createElement("li");
  li.textContent = `${name} — ${barcode}`;
  itemList.prepend(li);
}

// Show user-friendly error messages
function showError(msg) {
  statusEl.style.color = "red";
  statusEl.textContent = msg;
  startBtn.disabled = false;
}

