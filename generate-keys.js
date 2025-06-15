// Mengimpor library Firebase Admin
const admin = require('firebase-admin');

// Mengambil kredensial dari GitHub Secret
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Inisialisasi Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Logika pembuatan kunci (disalin dari skrip Lua Anda)
const SECRET_KEY = "L1MB0O";

function getSecretValue(secret) {
  let value = 0;
  for (let i = 0; i < secret.length; i++) {
    value += secret.charCodeAt(i);
  }
  return value;
}

// Fungsi utama yang akan dijalankan oleh GitHub Actions
async function generateAndSaveFreeKeys() {
  console.log("Memulai proses pembuatan KUNCI GRATIS harian...");

  // Menggunakan koleksi baru bernama 'freeKeys'
  const keysCollection = db.collection("freeKeys"); 
  const secretValue = getSecretValue(SECRET_KEY);
  const prefix = "RC_GH-"; // Prefix untuk kunci gratis

  // Loop untuk membuat kunci untuk hari ini dan 6 hari ke depan
  for (let i = 0; i < 7; i++) {
    const today = new Date();
    // Menggunakan setUTCDate untuk menghindari masalah timezone
    const targetDate = new Date(today.setUTCDate(today.getUTCDate() + i));

    const year = targetDate.getUTCFullYear();
    const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getUTCDate()).padStart(2, '0');
    
    // Logika pembuatan kunci gratis
    const dateSeed = parseInt(`${year}${month}${day}`, 10);
    const encryptedKeyNumber = ((dateSeed * 997) + secretValue) % 89999999 + 10000000;
    const finalKey = `${prefix}${encryptedKeyNumber}`;

    // Gunakan tanggal sebagai ID dokumen untuk mencegah duplikat
    const docId = `${year}-${month}-${day}`;
    
    // Simpan ke Firestore
    try {
      await keysCollection.doc(docId).set({
        key: finalKey,
        valid_for_date: `${year}-${month}-${day}`
      });
      console.log(`Kunci gratis untuk ${day}-${month}-${year} berhasil dibuat: ${finalKey}`);
    } catch (error) {
      console.error(`Gagal menyimpan kunci gratis untuk tanggal ${day}-${month}-${year}:`, error);
    }
  }

  console.log("Proses pembuatan kunci gratis selesai.");
}

// Menjalankan fungsi utama
generateAndSaveFreeKeys();

