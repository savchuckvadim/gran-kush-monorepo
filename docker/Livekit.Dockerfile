# Используем официальный образ LiveKit
FROM livekit/livekit-server:latest

# Копируем конфиг (создадим его ниже)
COPY livekit.yaml /etc/livekit.yaml

# Запускаем сервер с конфигом
CMD ["--config", "/etc/livekit.yaml"]
