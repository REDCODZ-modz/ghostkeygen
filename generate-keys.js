// Mengimpor library Firebase Admin
const admin = require('firebase-admin');

// --- BAGIAN DIAGNOSIS ---
// 1. Ambil konten secret dari environment variable GitHub
const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT;

// 2. Periksa apakah secret ada dan tidak kosong. Ini adalah tes terpenting.
if (!serviceAccountJSON || serviceAccountJSON.trim() === '') {
  console.error("!!! ERROR KRITIS: SECRET TIDAK DITEMUKAN !!!");
  console.error("Variabel 'FIREBASE_SERVICE_ACCOUNT' kosong.");
  console.error("SOLUSI: Buka Settings > Secrets and variables > Actions, hapus secret yang lama, lalu buat 'New repository secret' dengan nama 'FIREBASE_SERVICE_ACCOUNT' dan tempel lagi isi file JSON Anda.");
  // Menghentikan skrip dengan paksa karena tidak bisa lanjut.
  process.exit(1);
}

console.log("✔️ Secret 'FIREBASE_SERVICE_ACCOUNT' berhasil diterima dari GitHub.");

// 3. Coba untuk mengubah secret dari teks menjadi format JSON.
let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJSON);
  console.log("✔️ Konten secret berhasil di-parse sebagai JSON.");
} catch (e) {
  console.error("!!! ERROR KRITIS: GAGAL PARSE JSON !!!");
  console.error("Pesan Error: " + e.message);
  console.error("SOLUSI: Pastikan Anda telah menyalin SELURUH isi file JSON dari Firebase, mulai dari kurung kurawal '{' di awal sampai '}' di akhir.");
  process.exit(1);
}
// --- AKHIR BAGIAN DIAGNOSIS ---


// Inisialisasi Firebase dengan kredensial yang sudah terverifikasi
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Logika pembuatan kunci (tidak diubah)
const SECRET_KEY = "L1MB0O";
function getSecretValue(secret) { let v = 0; for (let i = 0; i < secret.length; i++) { v += secret.charCodeAt(i); } return v; }

async function generateAndSaveKeys() {
  console.log("\nMemulai proses pembuatan kunci mingguan...");
  const keysCollection = db.collection("premiumKeys");
  const secretValue = getSecretValue(SECRET_KEY);
  const prefix = "RC-GHPREM-";
  const mask = (secretValue * 137) % 9000 + 1000;
  for (let i = 0; i < 7; i++) {
    const today = new Date();
    const targetDate = new Date(today.setDate(today.getDate() + i));
    const year = targetDate.getUTCFullYear();
    const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getUTCDate()).padStart(2, '0');
    const expirySeedString = `${year}${month}${day}`;
    const obfuscatedDate = parseInt(expirySeedString, 10) + mask;
    const finalKey = `${prefix}${obfuscatedDate}${mask}`;
    const expiryDate = new Date(Date.UTC(year, targetDate.getUTCMonth(), day, 23, 59, 59));
    try {
      await keysCollection.doc(finalKey).set({ key: finalKey, expiry: admin.firestore.Timestamp.fromDate(expiryDate), createdAt: admin.firestore.FieldValue.serverTimestamp(), });
      console.log(`  > Kunci berhasil dibuat/diperbarui: ${finalKey}`);
    } catch (error) {
      console.error(`  > Gagal menyimpan kunci ${finalKey}:`, error);
    }
  }
  console.log("\nProses pembuatan kunci mingguan selesai.");
}

generateAndSaveKeys();

