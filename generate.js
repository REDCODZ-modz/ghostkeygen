// Mengimpor library Firebase Admin
const admin = require('firebase-admin');

// Mengambil kredensial dari GitHub Secret yang kita atur
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Inisialisasi Firebase dengan kredensial tersebut
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Mendapatkan akses ke database Firestore
const db = admin.firestore();

// Logika pembuatan kunci (sama persis dengan yang ada di keygen Anda)
const SECRET_KEY = "L1MB0O";

function getSecretValue(secret) {
  let value = 0;
  for (let i = 0; i < secret.length; i++) {
    value += secret.charCodeAt(i);
  }
  return value;
}

// Fungsi utama yang akan dijalankan oleh GitHub Actions
async function generateAndSaveKeys() {
  console.log("Memulai proses pembuatan kunci mingguan...");

  const keysCollection = db.collection("premiumKeys");
  const secretValue = getSecretValue(SECRET_KEY);
  const prefix = "RC-GHPREM-";
  const mask = (secretValue * 137) % 9000 + 1000;
  
  // Loop untuk membuat kunci selama 7 hari ke depan dari hari ini
  for (let i = 0; i < 7; i++) {
    const today = new Date();
    const targetDate = new Date(today.setDate(today.getDate() + i));

    const year = targetDate.getUTCFullYear();
    const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getUTCDate()).padStart(2, '0');

    const expirySeedString = `${year}${month}${day}`;
    const obfuscatedDate = parseInt(expirySeedString, 10) + mask;
    const finalKey = `${prefix}${obfuscatedDate}${mask}`;
    
    // Set tanggal kedaluwarsa ke akhir hari tersebut dalam UTC
    const expiryDate = new Date(Date.UTC(year, targetDate.getUTCMonth(), day, 23, 59, 59));

    // Simpan ke Firestore
    try {
      // Kita gunakan 'set' dengan ID dokumen yang sama dengan 'finalKey'
      // Ini akan menimpa kunci jika sudah ada, atau membuat yang baru jika belum.
      // Ini mencegah duplikasi kunci.
      await keysCollection.doc(finalKey).set({
        key: finalKey,
        expiry: admin.firestore.Timestamp.fromDate(expiryDate),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Kunci berhasil dibuat/diperbarui: ${finalKey}`);
    } catch (error) {
      console.error(`Gagal menyimpan kunci ${finalKey}:`, error);
    }
  }

  console.log("Proses pembuatan kunci mingguan selesai.");
}

// Menjalankan fungsi utama
generateAndSaveKeys();

