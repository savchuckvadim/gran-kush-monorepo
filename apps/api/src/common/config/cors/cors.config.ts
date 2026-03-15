export const cors = {
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:5000")
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0), // Убираем пустые строки
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
};
