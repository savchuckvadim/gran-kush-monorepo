/** Файл как data URL (base64): так его принимает API аккаунта. */
export const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("Cannot read the file"));
        reader.readAsDataURL(file);
    });

/** Те же потолки, что у API: клиент отказывает сразу, не гоняя мегабайты по сети. */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export const DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
export const SIGNATURE_ACCEPT = "image/jpeg,image/png,image/webp";
