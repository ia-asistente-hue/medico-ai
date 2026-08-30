// utils/encryption.ts
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'CLAVE_SECRETA_DESDE_ENV';

export function encryptText(text: string): string {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

export function decryptText(ciphertext: string): string {
  if (!ciphertext) return '';
  
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    // Si no se pudo decodificar correctamente, devolvemos el texto original por seguridad
    if (!originalText) return ciphertext;
    
    return originalText;
  } catch (error) {
    return ciphertext;
  }
}