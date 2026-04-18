// Cloudinary config για upload εικόνων events
//
// ΡΥΘΜΙΣΗ (κάνε το μία φορά):
// 1. Πήγαινε στο https://cloudinary.com και φτιάξε δωρεάν λογαριασμό.
// 2. Στο Dashboard θα δεις το "Cloud name" (π.χ. "dxyz123abc").
// 3. Settings (γρανάζι) -> Upload -> Upload presets -> Add upload preset.
//    - Signing Mode: Unsigned
//    - Folder (προαιρετικό): "events"
//    - Save και κράτα το όνομα του preset (π.χ. "events_unsigned").
// 4. Αντικατάστησε τα παρακάτω placeholders.
//
// ΣΗΜΑΝΤΙΚΟ: Το unsigned preset είναι ασφαλές για να εκτεθεί στον client.
// ΜΗΝ βάλεις ποτέ το API Secret στο frontend.

export const CLOUDINARY_CLOUD_NAME = "dsnsbfoth";
export const CLOUDINARY_UPLOAD_PRESET = "events_unsigned";

/**
 * Ανεβάζει ένα File στο Cloudinary και επιστρέφει { url, publicId }.
 * Το url αποθηκεύεται στο Firestore και το fetchάρει μετά το Swift app.
 */
export async function uploadImageToCloudinary(file) {
  if (!file) throw new Error("No file provided");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed: ${errText}`);
  }

  const data = await res.json();
  return {
    url: data.secure_url,       // https://res.cloudinary.com/.../image.jpg
    publicId: data.public_id,   // events/abc123  (για πιθανή διαγραφή)
  };
}
