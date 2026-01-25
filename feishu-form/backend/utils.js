// 简单的 nanoid 实现
export function nanoid(size = 10) {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';
  const randomValues = new Uint8Array(size);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < size; i++) {
    id += alphabet[randomValues[i] % alphabet.length];
  }
  
  return id;
}
