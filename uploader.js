import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import * as cheerio from "cheerio";

// Fungsi pembantu untuk membuat format upload_session acak mirp Postimages
function generateUploadSession() {
  const timestamp = Date.now();
  const randomPart = Math.random().toString().substring(2); // Mengambil digit setelah "0."
  return `${timestamp}.${randomPart}`;
}

// ==========================================
// PROVIDER 1: IMGBB
// ==========================================
export async function uploadImgBB({ filePath }) {
  const baseUrl = "https://imgbb.com";

  const initialRes = await fetch(baseUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36",
    },
  });

  if (!initialRes.ok) {
    throw new Error(`Gagal memuat halaman utama ImgBB: ${initialRes.status}`);
  }

  const cookieHeader = initialRes.headers.get("set-cookie") || "";
  const phpSessIdMatch = cookieHeader.match(/PHPSESSID=([^;]+)/);
  const phpSessId = phpSessIdMatch ? phpSessIdMatch[1] : "";

  const html = await initialRes.text();
  const $ = cheerio.load(html);
  
  let authToken = "";
  $("script").each((index, element) => {
    const scriptContent = $(element).text();
    if (scriptContent.includes("auth_token")) {
      const tokenMatch = scriptContent.match(/auth_token\s*=\s*["']([^"']+)["']/);
      if (tokenMatch) {
        authToken = tokenMatch[1];
      }
    }
  });

  if (!authToken) {
    throw new Error("Gagal mendapatkan auth_token dari halaman ImgBB.");
  }

  const buffer = await readFile(filePath);
  const form = new FormData();

  form.append(
    "source",
    new Blob([buffer], { type: "image/png" }),
    basename(filePath)
  );

  form.append("type", "file");
  form.append("action", "upload");
  form.append("timestamp", Date.now().toString());
  form.append("auth_token", authToken);

  const res = await fetch("https://imgbb.com/json", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36",
      Origin: "https://imgbb.com",
      Referer: "https://imgbb.com/",
      Cookie: phpSessId ? `PHPSESSID=${phpSessId}` : "",
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Gagal mengunggah gambar ke ImgBB`);
  }

  const result = await res.json();
  return { url: result.image.url }
}

// ==========================================
// PROVIDER 2: POSTIMAGES (BARU)
// ==========================================
export async function uploadPostimages({ filePath }) {
  const buffer = await readFile(filePath);
  const form = new FormData();

  // Memasukkan field sesuai dengan curl yang Anda berikan
  form.append("gallery", "");
  form.append("optsize", "0");
  form.append("expire", "0");
  form.append("numfiles", "1");
  form.append("upload_session", generateUploadSession());
  
  // Mengisi file gambar
  form.append(
    "file",
    new Blob([buffer], { type: "image/png" }),
    basename(filePath)
  );

  const res = await fetch("https://postimages.org/json", {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36",
      "Accept": "application/json",
      "x-requested-with": "XMLHttpRequest",
      "origin": "https://postimages.org",
      "referer": "https://postimages.org/",
      // Menggunakan GUESTKEY bawaan dari curl Anda
      "Cookie": "GUESTKEY=658cc0840f9de53ff7d86918aa9a694f",
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - Gagal mengunggah gambar ke Postimages`);
  }

  return await res.json();
}

// ==========================================
// CONTOH PENGGUNAAN (Pilih salah satu)
// ==========================================
/*
// Uji coba untuk Postimages
uploadPostimages({ filePath: './icon_master.png' })
  .then(result => console.log("Postimages Berhasil:", result))
  .catch(err => console.error("Postimages Gagal:", err));
*/
// Uji coba untuk ImgBB
 uploadImgBB({ filePath: './icon_master.png' })
   .then(result => console.log("ImgBB Berhasil:", result))
   .catch(err => console.error("ImgBB Gagal:", err));
