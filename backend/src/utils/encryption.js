import crypto from "crypto";

const algorithm = "aes-256-cbc";
const secretKey = process.env.MESSAGE_SECRET || "default_secret_key_32bytes"; 
// Must be 32 bytes (256-bit) for AES-256
const ivLength = 16;

export function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(secretKey, "hex"), // ✅ Use hex key from .env
    iv
  );
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted; 
}

export function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  try {
    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(secretKey, "hex"), // ✅ Use same hex key
      iv
    );
    let decrypted = decipher.update(encrypted, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  } catch (err) {
    return encryptedText; // fallback if something goes wrong
  }
}
