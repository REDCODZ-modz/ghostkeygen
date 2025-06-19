const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const SECRET_KEY = "L1MB0O";

function getSecretValue(secret) {
  let value = 0;
  for (let i = 0; i < secret.length; i++) {
    value += secret.charCodeAt(i);
  }
  return value;
}

async function cleanupExpiredKeys() {
  console.log("Memulai proses pembersihan kunci kedaluwarsa...");
  const keysCollection = db.collection("freeKeys");
  
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const day = String(today.getUTCDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;

  const snapshot = await keysCollection.where(admin.firestore.FieldPath.documentId(), '<', todayString).get();

  if (snapshot.empty) {
    console.log("Tidak ada kunci kedaluwarsa yang ditemukan.");
    return;
  }

  let deleteCount = 0;
  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
    deleteCount++;
  });
  
  await batch.commit();
  console.log(`${deleteCount} kunci kedaluwarsa berhasil dihapus.`);
}

async function generateAndSaveFreeKeys() {
  console.log("Memulai proses pembuatan KUNCI GRATIS harian...");
  const keysCollection = db.collection("freeKeys");
  const secretValue = getSecretValue(SECRET_KEY);
  const prefix = "RC_GH-";

  for (let i = 0; i < 7; i++) {
    const today = new Date();
    const targetDate = new Date(today.setUTCDate(today.getUTCDate() + i));
    const year = targetDate.getUTCFullYear();
    const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getUTCDate()).padStart(2, '0');
    
    const dateSeed = parseInt(`${year}${month}${day}`, 10);
    const encryptedKeyNumber = ((dateSeed * 997) + secretValue) % 89999999 + 10000000;
    const finalKey = `${prefix}${encryptedKeyNumber}`;

    const docId = `${year}-${month}-${day}`;
    
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

async function runTasks() {
  await cleanupExpiredKeys();
  await generateAndSaveFreeKeys();
}

runTasks();

