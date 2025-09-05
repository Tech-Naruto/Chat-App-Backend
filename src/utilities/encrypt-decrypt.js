import crypto from "crypto";

const algorithm = process.env.CRYPTO_ALGORITHM;
const key = Buffer.from(process.env.CRYPTO_KEY, "hex"); // 256-bit key
const iv = Buffer.from(process.env.CRYPTO_IV, "hex"); // 128-bit IV

function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  return encrypted.toString("hex");
}

function decrypt(encryptedData) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export { encrypt, decrypt };
