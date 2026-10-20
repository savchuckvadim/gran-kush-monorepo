/** Имя файла из `Content-Disposition`: сначала UTF-8 (`filename*=`), потом ASCII-запасное. */
export const fileNameFromDisposition = (header: string | null, fallback: string): string => {
    if (!header) return fallback;
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
    if (utf8) return decodeURIComponent(utf8);
    return /filename="([^"]+)"/i.exec(header)?.[1] ?? fallback;
};

/** Скачать файл в браузере: временная ссылка на Blob, клик, освобождение памяти. */
export const saveFile = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
