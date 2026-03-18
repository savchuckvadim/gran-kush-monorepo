# Техническое задание: Система QR-кодов и присутствия членов клуба

## 📋 Содержание

1. [Общее описание](#общее-описание)
2. [Архитектура системы](#архитектура-системы)
3. [База данных](#база-данных)
4. [Бэкенд (NestJS)](#бэкенд-nestjs)
5. [Фронтенд - Личный кабинет (LK)](#фронтенд---личный-кабинет-lk)
6. [Фронтенд - CRM](#фронтенд---crm)
7. [Безопасность и шифрование](#безопасность-и-шифрование)
8. [API Endpoints](#api-endpoints)
9. [Библиотеки и зависимости](#библиотеки-и-зависимости)
10. [Автоматизация и фоновые задачи](#автоматизация-и-фоновые-задачи)
11. [Каталог товаров и заказы](#каталог-товаров-и-заказы)
12. [Финансовая система и отчеты](#финансовая-система-и-отчеты)

---

## 🎯 Общее описание

Система управления присутствием членов клуба через QR-коды с возможностью:
- Генерации уникальных QR-кодов для каждого члена
- Отслеживания входа/выхода через QR-код или ручную отметку
- Автоматического сброса присутствия в конце рабочего дня
- Уведомлений сотрудникам о длительном присутствии
- История всех визитов с детальной информацией
- Шифрование всех чувствительных данных в БД

---

## 🏗️ Архитектура системы

```
┌─────────────────┐         ┌─────────────────┐
│   Личный        │         │      CRM        │
│   кабинет (LK)  │────────▶│   (Desktop +    │
│   (Web)         │         │    Mobile)      │
└────────┬────────┘         └────────┬────────┘
         │                            │
         │                            │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │   NestJS Backend API    │
         │  - QR Generation        │
         │  - Presence Tracking     │
         │  - Encryption Service   │
         │  - Background Jobs      │
         └────────────┬─────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │   PostgreSQL Database   │
         │  (Encrypted Fields)     │
         └─────────────────────────┘
```

---

## 💾 База данных

### 1. Таблица `member_qr_codes`

Хранит зашифрованные QR-коды для каждого члена клуба.

```prisma
model MemberQrCode {
  id                    String   @id @default(uuid())
  memberId              String   @unique @map("member_id")
  
  // Зашифрованные данные QR-кода
  encryptedData         String   @map("encrypted_data") @db.Text // AES-256-GCM
  encryptedMemberId     String   @map("encrypted_member_id") @db.VarChar(500) // Зашифрованный memberId
  encryptedTimestamp    String   @map("encrypted_timestamp") @db.VarChar(500) // Зашифрованная метка времени генерации
  
  // Метаданные (не зашифрованы для индексации)
  version               Int      @default(1) // Версия QR-кода (инкрементируется при обновлении)
  isActive              Boolean  @default(true) @map("is_active")
  generatedAt           DateTime @default(now()) @map("generated_at")
  expiresAt             DateTime? @map("expires_at") // Опционально: срок действия QR-кода
  lastRegeneratedAt     DateTime? @map("last_regenerated_at")
  
  // Связи
  member                Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  presenceLogs          PresenceLog[]
  
  @@index([memberId])
  @@index([isActive])
  @@index([version])
  @@map("member_qr_codes")
}
```

### 2. Таблица `presence_logs`

История всех визитов членов клуба.

```prisma
model PresenceLog {
  id                    String   @id @default(uuid())
  memberId              String   @map("member_id")
  qrCodeId              String?  @map("qr_code_id") // null если вход был ручной
  
  // Зашифрованные данные
  encryptedEntryMethod  String   @map("encrypted_entry_method") @db.VarChar(500) // "qr" или "manual"
  encryptedEmployeeId   String?  @map("encrypted_employee_id") @db.VarChar(500) // ID сотрудника, если ручной вход
  
  // Метаданные (не зашифрованы)
  entryTime             DateTime @map("entry_time")
  exitTime              DateTime? @map("exit_time")
  durationMinutes       Int?     @map("duration_minutes") // Вычисляется при выходе
  exitMethod            String?  @map("exit_method") @db.VarChar(50) // "qr", "manual", "auto", "forced"
  exitEmployeeId        String?  @map("exit_employee_id") // ID сотрудника при ручном выходе
  
  // Статусы
  isActive              Boolean  @default(true) @map("is_active") // false если визит завершен
  wasAutoExited         Boolean  @default(false) @map("was_auto_exited") // Автоматический выход в конце дня
  wasForcedExit         Boolean  @default(false) @map("was_forced_exit") // Принудительный выход сотрудником
  
  // Связи
  member                Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  qrCode                MemberQrCode? @relation(fields: [qrCodeId], references: [id], onDelete: SetNull)
  entryEmployee         Employee? @relation("EntryEmployee", fields: [exitEmployeeId], references: [id], onDelete: SetNull)
  exitEmployee          Employee? @relation("ExitEmployee", fields: [exitEmployeeId], references: [id], onDelete: SetNull)
  
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  
  @@index([memberId])
  @@index([qrCodeId])
  @@index([entryTime])
  @@index([exitTime])
  @@index([isActive])
  @@index([wasAutoExited])
  @@map("presence_logs")
}
```

### 3. Таблица `presence_settings`

Настройки системы присутствия (рабочие часы, уведомления и т.д.).

```prisma
model PresenceSettings {
  id                    String   @id @default(uuid())
  
  // Рабочие часы
  workDayStartHour      Int      @default(9) @map("work_day_start_hour") // 9:00
  workDayStartMinute    Int      @default(0) @map("work_day_start_minute")
  workDayEndHour        Int      @default(22) @map("work_day_end_hour") // 22:00
  workDayEndMinute      Int      @default(0) @map("work_day_end_minute")
  
  // Автоматический выход
  autoExitEnabled       Boolean  @default(true) @map("auto_exit_enabled")
  autoExitTime          String   @default("23:59") @map("auto_exit_time") @db.VarChar(5) // HH:mm
  
  // Уведомления
  notificationEnabled   Boolean  @default(true) @map("notification_enabled")
  notificationThresholdMinutes Int @default(60) @map("notification_threshold_minutes") // Уведомление после N минут
  
  // QR-код
  qrCodeExpirationDays  Int?     @map("qr_code_expiration_days") // null = без срока действия
  qrCodeRegenerateOnEmailConfirm Boolean @default(true) @map("qr_code_regenerate_on_email_confirm")
  
  updatedAt             DateTime @updatedAt @map("updated_at")
  updatedBy              String?  @map("updated_by") // Employee ID
  
  @@map("presence_settings")
}
```

### 4. Обновление модели `Member`

Добавить связь с QR-кодами:

```prisma
model Member {
  // ... существующие поля ...
  
  // Новые связи
  qrCode                MemberQrCode?
  presenceLogs          PresenceLog[]
  
  // ... остальные связи ...
}
```

### 5. Обновление модели `Employee`

Добавить связи для отслеживания ручных входов/выходов:

```prisma
model Employee {
  // ... существующие поля ...
  
  // Новые связи
  entryPresenceLogs     PresenceLog[] @relation("EntryEmployee")
  exitPresenceLogs      PresenceLog[] @relation("ExitEmployee")
  
  // ... остальные связи ...
}
```

---

## 🔧 Бэкенд (NestJS)

### Структура модулей

```
apps/api/src/modules/
├── qr-codes/
│   ├── domain/
│   │   ├── entity/
│   │   │   └── member-qr-code.entity.ts
│   │   └── repositories/
│   │       └── member-qr-code-repository.interface.ts
│   ├── application/
│   │   └── services/
│   │       ├── qr-code-generation.service.ts
│   │       └── qr-code-encryption.service.ts
│   ├── infrastructure/
│   │   └── repositories/
│   │       └── member-qr-code-prisma.repository.ts
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── lk-qr-codes.controller.ts
│   │   │   └── crm-qr-codes.controller.ts
│   │   └── dto/
│   │       ├── qr-code-response.dto.ts
│   │       ├── regenerate-qr-code.dto.ts
│   │       └── qr-code-scan.dto.ts
│   └── qr-codes.module.ts
│
├── presence/
│   ├── domain/
│   │   ├── entity/
│   │   │   └── presence-log.entity.ts
│   │   └── repositories/
│   │       └── presence-log-repository.interface.ts
│   ├── application/
│   │   └── services/
│   │       ├── presence-tracking.service.ts
│   │       ├── presence-auto-exit.service.ts
│   │       └── presence-notification.service.ts
│   ├── infrastructure/
│   │   ├── repositories/
│   │   │   └── presence-log-prisma.repository.ts
│   │   └── processors/
│   │       ├── presence-auto-exit.processor.ts
│   │       └── presence-notification.processor.ts
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── lk-presence.controller.ts
│   │   │   └── crm-presence.controller.ts
│   │   └── dto/
│   │       ├── presence-entry.dto.ts
│   │       ├── presence-exit.dto.ts
│   │       ├── presence-log-response.dto.ts
│   │       └── presence-stats.dto.ts
│   └── presence.module.ts
│
└── encryption/
    ├── application/
    │   └── services/
    │       └── data-encryption.service.ts
    └── encryption.module.ts
```

### 1. Модуль `encryption` (Общий модуль шифрования)

**Файл:** `apps/api/src/modules/encryption/application/services/data-encryption.service.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

@Injectable()
export class DataEncryptionService {
    private readonly algorithm = "aes-256-gcm";
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16; // 128 bits
    private readonly saltLength = 64;
    private readonly tagLength = 16;
    private readonly encryptionKey: Buffer;

    constructor(private readonly configService: ConfigService) {
        // Ключ шифрования из переменных окружения
        const masterKey = this.configService.get<string>("ENCRYPTION_MASTER_KEY");
        if (!masterKey) {
            throw new Error("ENCRYPTION_MASTER_KEY is required");
        }
        this.encryptionKey = Buffer.from(masterKey, "hex");
    }

    /**
     * Шифрование данных
     */
    async encrypt(data: string): Promise<string> {
        const iv = randomBytes(this.ivLength);
        const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
        
        let encrypted = cipher.update(data, "utf8", "hex");
        encrypted += cipher.final("hex");
        
        const tag = cipher.getAuthTag();
        
        // Формат: iv:tag:encrypted
        return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
    }

    /**
     * Расшифровка данных
     */
    async decrypt(encryptedData: string): Promise<string> {
        const [ivHex, tagHex, encrypted] = encryptedData.split(":");
        
        if (!ivHex || !tagHex || !encrypted) {
            throw new Error("Invalid encrypted data format");
        }
        
        const iv = Buffer.from(ivHex, "hex");
        const tag = Buffer.from(tagHex, "hex");
        
        const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        
        return decrypted;
    }

    /**
     * Хеширование для поиска (одностороннее)
     */
    async hashForSearch(data: string): Promise<string> {
        const salt = randomBytes(this.saltLength);
        const hash = await promisify(scrypt)(data, salt, this.keyLength) as Buffer;
        return `${salt.toString("hex")}:${hash.toString("hex")}`;
    }

    /**
     * Проверка хеша
     */
    async verifyHash(data: string, hash: string): Promise<boolean> {
        const [saltHex, hashHex] = hash.split(":");
        if (!saltHex || !hashHex) {
            return false;
        }
        
        const salt = Buffer.from(saltHex, "hex");
        const computedHash = await promisify(scrypt)(data, salt, this.keyLength) as Buffer;
        return computedHash.toString("hex") === hashHex;
    }
}
```

### 2. Модуль `qr-codes`

#### 2.1. Сервис генерации QR-кодов

**Файл:** `apps/api/src/modules/qr-codes/application/services/qr-code-generation.service.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as QRCode from "qrcode";
import { DataEncryptionService } from "@encryption/application/services/data-encryption.service";
import { MemberQrCodeRepository } from "@qr-codes/domain/repositories/member-qr-code-repository.interface";
import { MemberRepository } from "@members/domain/repositories/member-repository.interface";
import { MailService } from "@mail/application/services/mail.service";

@Injectable()
export class QrCodeGenerationService {
    constructor(
        private readonly qrCodeRepository: MemberQrCodeRepository,
        private readonly memberRepository: MemberRepository,
        private readonly encryptionService: DataEncryptionService,
        private readonly mailService: MailService,
        private readonly configService: ConfigService
    ) {}

    /**
     * Генерация QR-кода для члена клуба
     */
    async generateQrCode(memberId: string): Promise<{
        qrCodeId: string;
        qrCodeImage: string; // Base64 изображение
        qrCodeData: string; // Зашифрованные данные для сканирования
    }> {
        const member = await this.memberRepository.findById(memberId);
        if (!member) {
            throw new NotFoundException("Member not found");
        }

        // Данные для QR-кода
        const qrData = {
            memberId,
            timestamp: new Date().toISOString(),
            version: 1,
        };

        // Шифруем данные
        const encryptedData = await this.encryptionService.encrypt(JSON.stringify(qrData));
        const encryptedMemberId = await this.encryptionService.encrypt(memberId);
        const encryptedTimestamp = await this.encryptionService.encrypt(qrData.timestamp);

        // Генерируем изображение QR-кода
        const qrCodeImage = await QRCode.toDataURL(encryptedData, {
            errorCorrectionLevel: "H", // Высокая коррекция ошибок
            type: "image/png",
            width: 512,
            margin: 2,
        });

        // Сохраняем в БД
        const qrCode = await this.qrCodeRepository.create({
            memberId,
            encryptedData,
            encryptedMemberId,
            encryptedTimestamp,
            version: 1,
            isActive: true,
            generatedAt: new Date(),
        });

        return {
            qrCodeId: qrCode.id,
            qrCodeImage,
            qrCodeData: encryptedData,
        };
    }

    /**
     * Регенерация QR-кода
     */
    async regenerateQrCode(memberId: string, sendEmail: boolean = true): Promise<{
        qrCodeId: string;
        qrCodeImage: string;
    }> {
        const existing = await this.qrCodeRepository.findByMemberId(memberId);
        
        if (existing) {
            // Деактивируем старый QR-код
            await this.qrCodeRepository.update(existing.id, {
                isActive: false,
            });
        }

        // Генерируем новый
        const newQrCode = await this.generateQrCode(memberId);
        
        // Обновляем версию
        await this.qrCodeRepository.update(newQrCode.qrCodeId, {
            version: existing ? existing.version + 1 : 1,
            lastRegeneratedAt: new Date(),
        });

        // Отправляем email с новым QR-кодом
        if (sendEmail) {
            const member = await this.memberRepository.findById(memberId);
            if (member) {
                await this.mailService.sendQrCodeEmail(
                    member,
                    { id: member.userId, email: member.user?.email || "" } as any,
                    newQrCode.qrCodeImage
                );
            }
        }

        return {
            qrCodeId: newQrCode.qrCodeId,
            qrCodeImage: newQrCode.qrCodeImage,
        };
    }

    /**
     * Валидация и расшифровка QR-кода
     */
    async validateAndDecryptQrCode(encryptedQrData: string): Promise<{
        memberId: string;
        timestamp: string;
        version: number;
    }> {
        try {
            const decrypted = await this.encryptionService.decrypt(encryptedQrData);
            const qrData = JSON.parse(decrypted);
            
            // Проверяем наличие QR-кода в БД
            const qrCode = await this.qrCodeRepository.findByEncryptedData(encryptedQrData);
            if (!qrCode || !qrCode.isActive) {
                throw new UnauthorizedException("Invalid or inactive QR code");
            }

            return {
                memberId: qrData.memberId,
                timestamp: qrData.timestamp,
                version: qrData.version,
            };
        } catch (error) {
            throw new UnauthorizedException("Invalid QR code");
        }
    }
}
```

#### 2.2. Контроллеры

**LK Controller:** `apps/api/src/modules/qr-codes/api/controllers/lk-qr-codes.controller.ts`

```typescript
@ApiTags("Member QR Codes (Site - LK)")
@Controller("lk/qr-codes")
@UseGuards(MemberJwtAuthGuard)
@ApiBearerAuth()
export class LkQrCodesController {
    @Get("me")
    @ApiOperation({ summary: "Get current member's QR code" })
    async getMyQrCode(@CurrentMember() member: Member) {
        // Получить или создать QR-код
    }

    @Post("regenerate")
    @ApiOperation({ summary: "Regenerate QR code (sends email)" })
    async regenerateQrCode(@CurrentMember() member: Member) {
        // Регенерировать QR-код
    }
}
```

**CRM Controller:** `apps/api/src/modules/qr-codes/api/controllers/crm-qr-codes.controller.ts`

```typescript
@ApiTags("Member QR Codes (CRM)")
@Controller("crm/qr-codes")
@UseGuards(EmployeeJwtAuthGuard)
@ApiBearerAuth()
export class CrmQrCodesController {
    @Post("scan")
    @ApiOperation({ summary: "Scan QR code (validate and get member info)" })
    async scanQrCode(@Body() dto: QrCodeScanDto) {
        // Сканирование QR-кода
    }

    @Post(":memberId/regenerate")
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Regenerate member's QR code (Admin only)" })
    async regenerateMemberQrCode(@Param("memberId") memberId: string) {
        // Регенерировать QR-код для члена
    }
}
```

### 3. Модуль `presence`

#### 3.1. Сервис отслеживания присутствия

**Файл:** `apps/api/src/modules/presence/application/services/presence-tracking.service.ts`

```typescript
@Injectable()
export class PresenceTrackingService {
    /**
     * Вход через QR-код
     */
    async enterViaQrCode(encryptedQrData: string, employeeId?: string): Promise<PresenceLog> {
        // Валидация QR-кода
        const qrData = await this.qrCodeService.validateAndDecryptQrCode(encryptedQrData);
        
        // Проверка, не находится ли уже член в клубе
        const activeLog = await this.presenceRepository.findActiveByMemberId(qrData.memberId);
        if (activeLog) {
            throw new ConflictException("Member is already present");
        }

        // Создание записи о входе
        return this.presenceRepository.create({
            memberId: qrData.memberId,
            qrCodeId: qrData.qrCodeId,
            encryptedEntryMethod: await this.encryptionService.encrypt("qr"),
            entryTime: new Date(),
            isActive: true,
        });
    }

    /**
     * Вход вручную (сотрудником)
     */
    async enterManually(memberId: string, employeeId: string): Promise<PresenceLog> {
        // Проверка, не находится ли уже член в клубе
        const activeLog = await this.presenceRepository.findActiveByMemberId(memberId);
        if (activeLog) {
            throw new ConflictException("Member is already present");
        }

        return this.presenceRepository.create({
            memberId,
            encryptedEntryMethod: await this.encryptionService.encrypt("manual"),
            encryptedEmployeeId: await this.encryptionService.encrypt(employeeId),
            entryTime: new Date(),
            isActive: true,
        });
    }

    /**
     * Выход через QR-код
     */
    async exitViaQrCode(encryptedQrData: string): Promise<PresenceLog> {
        const qrData = await this.qrCodeService.validateAndDecryptQrCode(encryptedQrData);
        const activeLog = await this.presenceRepository.findActiveByMemberId(qrData.memberId);
        
        if (!activeLog) {
            throw new NotFoundException("No active presence log found");
        }

        return this.exitPresence(activeLog.id, "qr");
    }

    /**
     * Выход вручную
     */
    async exitManually(memberId: string, employeeId: string): Promise<PresenceLog> {
        const activeLog = await this.presenceRepository.findActiveByMemberId(memberId);
        
        if (!activeLog) {
            throw new NotFoundException("No active presence log found");
        }

        return this.exitPresence(activeLog.id, "manual", employeeId);
    }

    /**
     * Автоматический выход всех членов
     */
    async autoExitAll(): Promise<number> {
        const activeLogs = await this.presenceRepository.findAllActive();
        let count = 0;

        for (const log of activeLogs) {
            await this.exitPresence(log.id, "auto");
            count++;
        }

        return count;
    }

    private async exitPresence(
        logId: string,
        method: "qr" | "manual" | "auto" | "forced",
        employeeId?: string
    ): Promise<PresenceLog> {
        const log = await this.presenceRepository.findById(logId);
        if (!log) {
            throw new NotFoundException("Presence log not found");
        }

        const exitTime = new Date();
        const durationMinutes = Math.floor(
            (exitTime.getTime() - log.entryTime.getTime()) / (1000 * 60)
        );

        return this.presenceRepository.update(logId, {
            exitTime,
            durationMinutes,
            exitMethod: method,
            exitEmployeeId: employeeId,
            isActive: false,
            wasAutoExited: method === "auto",
            wasForcedExit: method === "forced",
        });
    }
}
```

#### 3.2. Сервис автоматического выхода

**Файл:** `apps/api/src/modules/presence/application/services/presence-auto-exit.service.ts`

```typescript
@Injectable()
export class PresenceAutoExitService {
    /**
     * Запускается по расписанию (каждый день в 23:59)
     */
    @Cron("59 23 * * *") // Каждый день в 23:59
    async autoExitAllMembers() {
        const count = await this.presenceTrackingService.autoExitAll();
        this.logger.log(`Auto-exited ${count} members`);
    }
}
```

#### 3.3. Сервис уведомлений

**Файл:** `apps/api/src/modules/presence/application/services/presence-notification.service.ts`

```typescript
@Injectable()
export class PresenceNotificationService {
    /**
     * Проверка длительного присутствия и отправка уведомлений
     */
    @Cron("*/15 * * * *") // Каждые 15 минут
    async checkLongPresence() {
        const threshold = await this.getNotificationThreshold();
        const activeLogs = await this.presenceRepository.findAllActive();

        for (const log of activeLogs) {
            const durationMinutes = Math.floor(
                (new Date().getTime() - log.entryTime.getTime()) / (1000 * 60)
            );

            if (durationMinutes >= threshold) {
                // Отправляем уведомление сотрудникам
                await this.notifyEmployees(log);
            }
        }
    }

    private async notifyEmployees(log: PresenceLog) {
        // Получаем всех активных сотрудников
        const employees = await this.employeesService.findAllActive();
        
        for (const employee of employees) {
            await this.telegramService.sendLongPresenceNotification({
                employeeId: employee.id,
                memberId: log.memberId,
                durationMinutes: Math.floor(
                    (new Date().getTime() - log.entryTime.getTime()) / (1000 * 60)
                ),
            });
        }
    }
}
```

---

## 🎨 Фронтенд - Личный кабинет (LK)

### Структура модулей (FSD)

```
apps/web/modules/
├── entities/
│   └── qr-code/
│       ├── api/
│       │   └── qr-code.api.ts
│       ├── hooks/
│       │   └── use-qr-code.hook.ts
│       └── ui/
│           └── qr-code-display.tsx
│
├── features/
│   ├── qr-code/
│   │   ├── ui/
│   │   │   ├── qr-code-page.tsx
│   │   │   └── regenerate-qr-code-button.tsx
│   │   └── qr-code-feature.tsx
│   │
│   └── presence/
│       ├── ui/
│       │   └── presence-history-page.tsx
│       └── presence-feature.tsx
│
└── widgets/
    └── member-dashboard/
        └── ui/
            └── member-dashboard.tsx (включает QR-код)
```

### 1. API клиент для QR-кодов

**Файл:** `apps/web/modules/entities/qr-code/api/qr-code.api.ts`

```typescript
import { $apiSite } from "@/modules/shared/api/api"; // API клиент для Site
import { SchemaQrCodeResponseDto, SchemaRegenerateQrCodeResponseDto } from "@workspace/api-client/core";

export async function getMyQrCode(): Promise<SchemaQrCodeResponseDto> {
    const response = await $apiSite.GET("/lk/qr-codes/me");
    if (!response.response.ok) {
        throw new Error("Failed to fetch QR code");
    }
    return response.data as SchemaQrCodeResponseDto;
}

export async function regenerateQrCode(): Promise<SchemaRegenerateQrCodeResponseDto> {
    const response = await $apiSite.POST("/lk/qr-codes/regenerate");
    if (!response.response.ok) {
        throw new Error("Failed to regenerate QR code");
    }
    return response.data as SchemaRegenerateQrCodeResponseDto;
}
```

### 2. React Query хуки

**Файл:** `apps/web/modules/entities/qr-code/hooks/use-qr-code.hook.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyQrCode, regenerateQrCode } from "../api/qr-code.api";

export const qrCodeKeys = {
    all: ["qrCode"] as const,
    my: () => [...qrCodeKeys.all, "my"] as const,
};

export function useMyQrCode() {
    return useQuery({
        queryKey: qrCodeKeys.my(),
        queryFn: getMyQrCode,
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

export function useRegenerateQrCode() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: regenerateQrCode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qrCodeKeys.my() });
        },
    });
}
```

### 3. UI компоненты

**Файл:** `apps/web/modules/entities/qr-code/ui/qr-code-display.tsx`

```typescript
"use client";

import Image from "next/image";
import { useMyQrCode } from "../hooks/use-qr-code.hook";

export function QrCodeDisplay() {
    const { data, isLoading } = useMyQrCode();

    if (isLoading) {
        return <div>Loading QR code...</div>;
    }

    if (!data?.qrCodeImage) {
        return <div>QR code not available</div>;
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <Image
                src={data.qrCodeImage}
                alt="QR Code"
                width={256}
                height={256}
                className="border-2 border-gray-300 rounded-lg"
            />
            <p className="text-sm text-gray-600">
                Покажите этот QR-код при входе в клуб
            </p>
        </div>
    );
}
```

**Файл:** `apps/web/modules/features/qr-code/ui/qr-code-page.tsx`

```typescript
"use client";

import { QrCodeDisplay } from "@/modules/entities/qr-code/ui/qr-code-display";
import { RegenerateQrCodeButton } from "./regenerate-qr-code-button";

export function QrCodePage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">Мой QR-код</h1>
            <QrCodeDisplay />
            <div className="mt-6">
                <RegenerateQrCodeButton />
            </div>
        </div>
    );
}
```

---

## 💼 Фронтенд - CRM

### Структура модулей (FSD)

```
apps/crm/modules/
├── entities/
│   ├── qr-code/
│   │   ├── api/
│   │   │   └── qr-code.api.ts
│   │   └── hooks/
│   │       └── use-qr-code-scan.hook.ts
│   │
│   └── presence/
│       ├── api/
│       │   └── presence.api.ts
│       └── hooks/
│           └── use-presence.hook.ts
│
├── features/
│   ├── qr-scanner/
│   │   ├── ui/
│   │   │   ├── qr-scanner-modal.tsx
│   │   │   └── qr-scanner-button.tsx
│   │   └── qr-scanner-feature.tsx
│   │
│   ├── member-presence/
│   │   ├── ui/
│   │   │   ├── member-presence-page.tsx
│   │   │   ├── presence-entry-form.tsx
│   │   │   └── presence-exit-form.tsx
│   │   └── member-presence-feature.tsx
│   │
│   └── presence-dashboard/
│       ├── ui/
│       │   └── presence-dashboard.tsx
│       └── presence-dashboard-feature.tsx
│
└── widgets/
    └── presence-management/
        └── ui/
            └── presence-management-widget.tsx
```

### 1. API клиент

**Файл:** `apps/crm/modules/entities/qr-code/api/qr-code.api.ts`

```typescript
import { $api } from "@/modules/shared/api/api"; // API клиент для CRM
import { SchemaQrCodeScanResponseDto } from "@workspace/api-client/core";

export async function scanQrCode(encryptedQrData: string): Promise<SchemaQrCodeScanResponseDto> {
    const response = await $api.POST("/crm/qr-codes/scan", {
        body: { encryptedQrData },
    });
    if (!response.response.ok) {
        throw new Error("Failed to scan QR code");
    }
    return response.data as SchemaQrCodeScanResponseDto;
}

export async function regenerateMemberQrCode(memberId: string): Promise<void> {
    const response = await $api.POST(`/crm/qr-codes/${memberId}/regenerate`);
    if (!response.response.ok) {
        throw new Error("Failed to regenerate QR code");
    }
}
```

### 2. QR Scanner компонент

**Файл:** `apps/crm/modules/features/qr-scanner/ui/qr-scanner-modal.tsx`

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { scanQrCode } from "@/modules/entities/qr-code/api/qr-code.api";

interface QrScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (memberId: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        if (isOpen && !scannerRef.current) {
            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                async (decodedText) => {
                    try {
                        const result = await scanQrCode(decodedText);
                        onScanSuccess(result.memberId);
                        scanner.stop();
                        onClose();
                    } catch (error) {
                        console.error("QR scan error:", error);
                    }
                },
                (errorMessage) => {
                    // Игнорируем ошибки сканирования
                }
            );
            setScanning(true);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
        };
    }, [isOpen, onClose, onScanSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Сканирование QR-кода</h2>
                <div id="qr-reader" className="w-full"></div>
                <button
                    onClick={onClose}
                    className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded"
                >
                    Отмена
                </button>
            </div>
        </div>
    );
}
```

### 3. Форма входа/выхода

**Файл:** `apps/crm/modules/features/member-presence/ui/presence-entry-form.tsx`

```typescript
"use client";

import { useState } from "react";
import { useEnterPresence } from "@/modules/entities/presence/hooks/use-presence.hook";
import { QrScannerModal } from "@/modules/features/qr-scanner/ui/qr-scanner-modal";

export function PresenceEntryForm() {
    const [showScanner, setShowScanner] = useState(false);
    const enterMutation = useEnterPresence();

    const handleQrScan = async (memberId: string) => {
        await enterMutation.mutateAsync({
            method: "qr",
            memberId,
        });
    };

    const handleManualEntry = async (memberId: string) => {
        await enterMutation.mutateAsync({
            method: "manual",
            memberId,
        });
    };

    return (
        <div className="space-y-4">
            <button
                onClick={() => setShowScanner(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg"
            >
                Сканировать QR-код
            </button>
            
            <div className="text-center text-gray-500">или</div>
            
            <ManualEntryForm onSubmit={handleManualEntry} />
            
            <QrScannerModal
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScanSuccess={handleQrScan}
            />
        </div>
    );
}
```

---

## 🔐 Безопасность и шифрование

### Переменные окружения

```env
# Шифрование
ENCRYPTION_MASTER_KEY=your-256-bit-hex-key-here # Генерируется через: openssl rand -hex 32

# QR-код
QR_CODE_EXPIRATION_DAYS=365 # Срок действия QR-кода (опционально)
```

### Генерация ключа шифрования

```bash
# Генерация 256-битного ключа
openssl rand -hex 32
```

### Шифруемые поля

- `encryptedData` - полные данные QR-кода
- `encryptedMemberId` - ID члена клуба
- `encryptedTimestamp` - метка времени
- `encryptedEntryMethod` - метод входа ("qr" или "manual")
- `encryptedEmployeeId` - ID сотрудника (при ручном входе)

---

## 📡 API Endpoints

### LK (Личный кабинет)

```
GET    /lk/qr-codes/me                    - Получить свой QR-код
POST   /lk/qr-codes/regenerate            - Регенерировать QR-код
GET    /lk/presence/history               - История визитов
GET    /lk/presence/current               - Текущее присутствие
```

### CRM

```
POST   /crm/qr-codes/scan                 - Сканировать QR-код
POST   /crm/qr-codes/:memberId/regenerate - Регенерировать QR-код члена
POST   /crm/presence/enter                - Вход (QR или ручной)
POST   /crm/presence/exit                 - Выход (QR или ручной)
GET    /crm/presence/active               - Список активных присутствий
GET    /crm/presence/logs                 - История визитов (с фильтрами)
GET    /crm/presence/stats                - Статистика присутствия
POST   /crm/presence/auto-exit            - Принудительный выход всех (Admin)
```

---

## 📚 Библиотеки и зависимости

### Backend

```json
{
  "dependencies": {
    "qrcode": "^1.5.3",                    // Генерация QR-кодов
    "crypto": "^1.0.1",                    // Шифрование (встроенный в Node.js)
    "@nestjs/bullmq": "^10.0.0",           // Очереди для фоновых задач
    "bullmq": "^5.0.0",                    // Очереди
    "@nestjs/schedule": "^4.0.0"           // Расписание (Cron)
  }
}
```

### Frontend (CRM - Mobile)

```json
{
  "dependencies": {
    "html5-qrcode": "^2.3.8",               // Сканирование QR-кодов
    "react-qr-reader": "^2.2.1",            // Альтернатива для React
    "@tanstack/react-query": "^5.0.0"       // Уже используется
  }
}
```

### Frontend (Web - LK)

```json
{
  "dependencies": {
    "qrcode.react": "^3.1.0",              // Отображение QR-кода (опционально)
    "@tanstack/react-query": "^5.0.0"       // Уже используется
  }
}
```

---

## ⚙️ Автоматизация и фоновые задачи

### 1. Автоматический выход (Cron)

```typescript
// Каждый день в 23:59
@Cron("59 23 * * *")
async autoExitAllMembers() {
    await this.presenceTrackingService.autoExitAll();
}
```

### 2. Проверка длительного присутствия (Cron)

```typescript
// Каждые 15 минут
@Cron("*/15 * * * *")
async checkLongPresence() {
    await this.presenceNotificationService.checkLongPresence();
}
```

### 3. Очередь для отправки email с QR-кодом

```typescript
// BullMQ очередь
@Processor("qr-code-email")
export class QrCodeEmailProcessor {
    @Process("send-qr-code")
    async handleSendQrCode(job: Job<SendQrCodeJob>) {
        await this.mailService.sendQrCodeEmail(...);
    }
}
```

---

## 📝 DTO (Data Transfer Objects)

### Backend DTOs

```typescript
// QR Code
export class QrCodeResponseDto {
    qrCodeId: string;
    qrCodeImage: string; // Base64
    version: number;
    generatedAt: string;
}

export class QrCodeScanDto {
    encryptedQrData: string;
}

export class QrCodeScanResponseDto {
    memberId: string;
    memberName: string;
    memberSurname?: string;
    isActive: boolean;
    currentPresence?: PresenceLogResponseDto;
}

// Presence
export class PresenceEntryDto {
    method: "qr" | "manual";
    memberId?: string; // Для ручного входа
    encryptedQrData?: string; // Для QR входа
}

export class PresenceExitDto {
    method: "qr" | "manual" | "forced";
    memberId?: string;
    encryptedQrData?: string;
}

export class PresenceLogResponseDto {
    id: string;
    memberId: string;
    memberName: string;
    entryTime: string;
    exitTime?: string;
    durationMinutes?: number;
    entryMethod: string; // Расшифрованный
    exitMethod?: string;
    wasAutoExited: boolean;
}
```

---

## 🎯 Чек-лист реализации

### Backend
- [ ] Создать миграцию Prisma для новых таблиц
- [ ] Реализовать модуль `encryption`
- [ ] Реализовать модуль `qr-codes`
- [ ] Реализовать модуль `presence`
- [ ] Добавить Cron задачи для автоматического выхода
- [ ] Добавить Cron задачи для уведомлений
- [ ] Создать email шаблон для QR-кода
- [ ] Добавить эндпоинты в Swagger
- [ ] Написать тесты

### Frontend LK
- [ ] Создать API клиент для QR-кодов
- [ ] Создать React Query хуки
- [ ] Создать UI компоненты
- [ ] Добавить страницу QR-кода в навигацию
- [ ] Интегрировать отправку QR-кода при подтверждении email

### Frontend CRM
- [ ] Создать API клиент для QR-кодов и присутствия
- [ ] Интегрировать библиотеку сканирования QR
- [ ] Создать модальное окно сканера
- [ ] Создать формы входа/выхода
- [ ] Создать дашборд присутствия
- [ ] Добавить историю визитов
- [ ] Добавить статистику

### Безопасность
- [ ] Настроить ENCRYPTION_MASTER_KEY
- [ ] Протестировать шифрование/расшифровку
- [ ] Добавить валидацию QR-кодов
- [ ] Добавить rate limiting для API

---

## 📌 Примечания

1. **Шифрование**: Все чувствительные данные шифруются с использованием AES-256-GCM
2. **QR-код**: Содержит зашифрованные данные, которые валидируются на сервере
3. **Автоматический выход**: Выполняется каждый день в 23:59 через Cron
4. **Уведомления**: Отправляются сотрудникам через Telegram (уже реализовано)
5. **API клиент**: Использует существующий `@workspace/api-client/core` с автогенерацией типов

---

## 🔄 Интеграция с существующей системой

1. **При подтверждении email** (`EmailVerificationService.verifyEmail`):
   - Автоматически генерировать QR-код
   - Отправлять email с QR-кодом

2. **При регистрации члена** (`MemberRegistrationController.register`):
   - После создания Member генерировать QR-код
   - Отправлять email с QR-кодом (после подтверждения email)

3. **В CRM при просмотре члена**:
   - Показывать текущий QR-код
   - Показывать историю визитов
   - Показывать текущее присутствие

---

---

## 🛍️ Каталог товаров и заказы

### Общее описание

Система управления каталогом товаров и заказами с возможностью:
- Полноценного администрирования каталога товаров сотрудниками
- Просмотра каталога только при активном присутствии в клубе (для членов)
- Создания заказов членами клуба
- Отслеживания статусов заказов
- Управления остатками товаров
- Кастомных единиц измерения

### База данных

#### 1. Таблица `measurement_units` (Единицы измерения)

```prisma
model MeasurementUnit {
  id          String   @id @default(uuid())
  code        String   @unique @db.VarChar(50) // "g", "kg", "piece", "custom_1"
  name        String   @db.VarChar(255) // "Грамм", "Килограмм", "Штука", "Кастомная единица"
  description String?  @db.Text
  isCustom    Boolean  @default(false) @map("is_custom") // Кастомная единица
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Связи
  products    Product[]

  @@index([code])
  @@index([isActive])
  @@map("measurement_units")
}
```

#### 2. Таблица `product_categories` (Категории товаров)

```prisma
model ProductCategory {
  id          String   @id @default(uuid())
  code        String   @unique @db.VarChar(50) // "flower", "edible", "concentrate"
  name        String   @db.VarChar(255)
  description String?  @db.Text
  parentId    String?  @map("parent_id") // Для вложенных категорий
  sortOrder   Int      @default(0) @map("sort_order")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Связи
  parent      ProductCategory? @relation("CategoryParent", fields: [parentId], references: [id], onDelete: SetNull)
  children    ProductCategory[] @relation("CategoryParent")
  products    Product[]

  @@index([code])
  @@index([parentId])
  @@index([isActive])
  @@index([sortOrder])
  @@map("product_categories")
}
```

#### 3. Таблица `products` (Товары)

```prisma
model Product {
  id                String   @id @default(uuid())
  categoryId        String   @map("category_id")
  measurementUnitId String   @map("measurement_unit_id")
  
  // Основная информация
  name              String   @db.VarChar(255)
  description       String?  @db.Text
  sku               String?  @unique @db.VarChar(100) // Артикул
  
  // Цена и количество
  price             Decimal  @db.Decimal(10, 2) // Цена за единицу измерения
  initialQuantity   Decimal  @db.Decimal(10, 3) @map("initial_quantity") // Начальное количество
  currentQuantity   Decimal  @db.Decimal(10, 3) @map("current_quantity") // Текущее количество
  minQuantity       Decimal? @db.Decimal(10, 3) @map("min_quantity") // Минимальный остаток для уведомления
  
  // Изображения
  imageUrl          String?  @map("image_url") @db.VarChar(500)
  images            ProductImage[] // Дополнительные изображения
  
  // Статусы
  isActive          Boolean  @default(true) @map("is_active")
  isAvailable       Boolean  @default(true) @map("is_available") // Доступен для заказа
  
  // Метаданные
  thc               Decimal? @db.Decimal(5, 2) // Процент THC
  cbd               Decimal? @db.Decimal(5, 2) // Процент CBD
  strain            String?  @db.VarChar(100) // Сорт
  
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  createdBy         String?  @map("created_by") // Employee ID
  updatedBy         String?  @map("updated_by") // Employee ID

  // Связи
  category          ProductCategory @relation(fields: [categoryId], references: [id])
  measurementUnit   MeasurementUnit @relation(fields: [measurementUnitId], references: [id])
  images            ProductImage[]
  orderItems        OrderItem[]

  @@index([categoryId])
  @@index([measurementUnitId])
  @@index([sku])
  @@index([isActive])
  @@index([isAvailable])
  @@index([name])
  @@map("products")
}
```

#### 4. Таблица `product_images` (Изображения товаров)

```prisma
model ProductImage {
  id          String   @id @default(uuid())
  productId   String   @map("product_id")
  imageUrl    String   @map("image_url") @db.VarChar(500)
  storagePath String?  @map("storage_path") @db.VarChar(500)
  sortOrder   Int      @default(0) @map("sort_order")
  isPrimary   Boolean  @default(false) @map("is_primary")
  createdAt   DateTime @default(now()) @map("created_at")

  // Связи
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([sortOrder])
  @@map("product_images")
}
```

#### 5. Таблица `orders` (Заказы)

```prisma
model Order {
  id              String   @id @default(uuid())
  memberId        String   @map("member_id")
  employeeId      String?  @map("employee_id") // Сотрудник, который обработал заказ
  
  // Номер заказа
  orderNumber     String   @unique @map("order_number") @db.VarChar(50) // Генерируется автоматически
  
  // Статус заказа
  status          String   @default("pending") @db.VarChar(50) // pending, confirmed, preparing, ready, completed, cancelled
  paymentStatus   String   @default("pending") @map("payment_status") @db.VarChar(50) // pending, paid, refunded
  
  // Суммы
  subtotal        Decimal  @db.Decimal(10, 2) // Сумма без скидок
  discount        Decimal  @default(0) @db.Decimal(10, 2) // Скидка
  total           Decimal  @db.Decimal(10, 2) // Итоговая сумма
  
  // Временные метки
  orderedAt       DateTime @default(now()) @map("ordered_at")
  confirmedAt     DateTime? @map("confirmed_at")
  preparedAt      DateTime? @map("prepared_at")
  readyAt         DateTime? @map("ready_at")
  completedAt     DateTime? @map("completed_at")
  cancelledAt     DateTime? @map("cancelled_at")
  
  // Примечания
  notes           String?  @db.Text // Примечания от члена
  adminNotes      String?  @map("admin_notes") @db.Text // Примечания от сотрудника
  
  // Связи
  member          Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  employee        Employee? @relation(fields: [employeeId], references: [id], onDelete: SetNull)
  items           OrderItem[]
  transactions    FinancialTransaction[]

  @@index([memberId])
  @@index([employeeId])
  @@index([orderNumber])
  @@index([status])
  @@index([paymentStatus])
  @@index([orderedAt])
  @@map("orders")
}
```

#### 6. Таблица `order_items` (Позиции заказа)

```prisma
model OrderItem {
  id              String   @id @default(uuid())
  orderId         String   @map("order_id")
  productId       String   @map("product_id")
  
  // Количество и цена
  quantity        Decimal  @db.Decimal(10, 3)
  unitPrice       Decimal  @map("unit_price") @db.Decimal(10, 2) // Цена на момент заказа
  totalPrice      Decimal  @map("total_price") @db.Decimal(10, 2) // quantity * unitPrice
  
  // Примечания
  notes           String?  @db.Text

  // Связи
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product         Product  @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}
```

#### 7. Обновление модели `Member`

```prisma
model Member {
  // ... существующие поля ...
  
  // Новые связи
  orders          Order[]
  
  // ... остальные связи ...
}
```

### Бэкенд модули

#### Структура модулей

```
apps/api/src/modules/
├── catalog/
│   ├── domain/
│   │   ├── entity/
│   │   │   ├── product.entity.ts
│   │   │   ├── product-category.entity.ts
│   │   │   └── measurement-unit.entity.ts
│   │   └── repositories/
│   │       ├── product-repository.interface.ts
│   │       ├── product-category-repository.interface.ts
│   │       └── measurement-unit-repository.interface.ts
│   ├── application/
│   │   └── services/
│   │       ├── products.service.ts
│   │       ├── product-categories.service.ts
│   │       └── measurement-units.service.ts
│   ├── infrastructure/
│   │   └── repositories/
│   │       ├── product-prisma.repository.ts
│   │       ├── product-category-prisma.repository.ts
│   │       └── measurement-unit-prisma.repository.ts
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── lk-catalog.controller.ts
│   │   │   └── crm-catalog.controller.ts
│   │   └── dto/
│   │       ├── product.dto.ts
│   │       ├── product-category.dto.ts
│   │       └── measurement-unit.dto.ts
│   └── catalog.module.ts
│
├── orders/
│   ├── domain/
│   │   ├── entity/
│   │   │   └── order.entity.ts
│   │   └── repositories/
│   │       └── order-repository.interface.ts
│   ├── application/
│   │   └── services/
│   │       ├── orders.service.ts
│   │       └── order-number-generator.service.ts
│   ├── infrastructure/
│   │   └── repositories/
│   │       └── order-prisma.repository.ts
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── lk-orders.controller.ts
│   │   │   └── crm-orders.controller.ts
│   │   └── dto/
│   │       ├── create-order.dto.ts
│   │       ├── update-order-status.dto.ts
│   │       └── order-response.dto.ts
│   └── orders.module.ts
```

#### Ключевые сервисы

**ProductsService** (`apps/api/src/modules/catalog/application/services/products.service.ts`):

```typescript
@Injectable()
export class ProductsService {
    /**
     * Получить каталог товаров (только для активных членов в клубе)
     */
    async getCatalogForMember(memberId: string): Promise<Product[]> {
        // Проверка активного присутствия
        const isPresent = await this.presenceService.isMemberPresent(memberId);
        if (!isPresent) {
            throw new ForbiddenException("Catalog is only available when member is present in the club");
        }

        return this.productRepository.findActive();
    }

    /**
     * Получить все товары (для CRM)
     */
    async getAllProducts(filters?: ProductFilters): Promise<Product[]> {
        return this.productRepository.findAll(filters);
    }

    /**
     * Создать товар
     */
    async createProduct(dto: CreateProductDto, employeeId: string): Promise<Product> {
        // Валидация категории и единицы измерения
        await this.validateCategory(dto.categoryId);
        await this.validateMeasurementUnit(dto.measurementUnitId);

        return this.productRepository.create({
            ...dto,
            currentQuantity: dto.initialQuantity,
            createdBy: employeeId,
        });
    }

    /**
     * Обновить количество товара (при заказе)
     */
    async updateQuantity(productId: string, quantity: Decimal): Promise<Product> {
        const product = await this.productRepository.findById(productId);
        if (!product) {
            throw new NotFoundException("Product not found");
        }

        const newQuantity = product.currentQuantity.minus(quantity);
        if (newQuantity.isNegative()) {
            throw new BadRequestException("Insufficient quantity");
        }

        return this.productRepository.update(productId, {
            currentQuantity: newQuantity,
            isAvailable: newQuantity.greaterThan(0),
        });
    }
}
```

**OrdersService** (`apps/api/src/modules/orders/application/services/orders.service.ts`):

```typescript
@Injectable()
export class OrdersService {
    /**
     * Создать заказ (только для активных членов в клубе)
     */
    async createOrder(memberId: string, dto: CreateOrderDto): Promise<Order> {
        // Проверка активного присутствия
        const isPresent = await this.presenceService.isMemberPresent(memberId);
        if (!isPresent) {
            throw new ForbiddenException("Orders can only be placed when member is present in the club");
        }

        // Валидация товаров и проверка остатков
        const items = await this.validateOrderItems(dto.items);

        // Генерация номера заказа
        const orderNumber = await this.orderNumberGenerator.generate();

        // Расчет сумм
        const subtotal = this.calculateSubtotal(items);
        const total = subtotal.minus(dto.discount || 0);

        // Создание заказа
        const order = await this.orderRepository.create({
            memberId,
            orderNumber,
            status: "pending",
            paymentStatus: "pending",
            subtotal,
            discount: dto.discount || 0,
            total,
            items: items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity.times(item.unitPrice),
            })),
        });

        // Резервирование товаров (уменьшение остатков)
        for (const item of items) {
            await this.productsService.updateQuantity(item.productId, item.quantity);
        }

        return order;
    }

    /**
     * Обновить статус заказа
     */
    async updateOrderStatus(
        orderId: string,
        status: OrderStatus,
        employeeId: string
    ): Promise<Order> {
        const order = await this.orderRepository.findById(orderId);
        if (!order) {
            throw new NotFoundException("Order not found");
        }

        const updateData: Partial<Order> = {
            status,
            employeeId,
        };

        // Установка временных меток
        switch (status) {
            case "confirmed":
                updateData.confirmedAt = new Date();
                break;
            case "preparing":
                updateData.preparedAt = new Date();
                break;
            case "ready":
                updateData.readyAt = new Date();
                break;
            case "completed":
                updateData.completedAt = new Date();
                updateData.paymentStatus = "paid";
                // Создание финансовой транзакции
                await this.financeService.createTransaction({
                    orderId: order.id,
                    memberId: order.memberId,
                    type: "order_payment",
                    direction: "income",
                    amount: order.total,
                });
                break;
            case "cancelled":
                updateData.cancelledAt = new Date();
                // Возврат товаров на склад
                await this.returnOrderItemsToStock(order);
                break;
        }

        return this.orderRepository.update(orderId, updateData);
    }

    private async returnOrderItemsToStock(order: Order): Promise<void> {
        for (const item of order.items) {
            await this.productsService.updateQuantity(
                item.productId,
                item.quantity.negated() // Возврат (увеличение остатка)
            );
        }
    }
}
```

### API Endpoints

#### LK (Личный кабинет)

```
GET    /lk/catalog/products              - Получить каталог (только при присутствии)
GET    /lk/catalog/products/:id          - Получить товар
POST   /lk/orders                        - Создать заказ (только при присутствии)
GET    /lk/orders                        - Мои заказы
GET    /lk/orders/:id                    - Детали заказа
```

#### CRM

```
# Каталог
GET    /crm/catalog/products             - Список всех товаров
POST   /crm/catalog/products              - Создать товар (Admin)
PATCH  /crm/catalog/products/:id          - Обновить товар (Admin)
DELETE /crm/catalog/products/:id          - Удалить товар (Admin)
GET    /crm/catalog/categories           - Категории
POST   /crm/catalog/categories            - Создать категорию (Admin)
GET    /crm/catalog/measurement-units     - Единицы измерения
POST   /crm/catalog/measurement-units      - Создать единицу (Admin)

# Заказы
GET    /crm/orders                       - Список заказов (с фильтрами)
GET    /crm/orders/:id                   - Детали заказа
PATCH  /crm/orders/:id/status            - Обновить статус заказа
PATCH  /crm/orders/:id/payment-status    - Обновить статус оплаты
```

---

## 💰 Финансовая система и отчеты

### База данных

#### 1. Таблица `financial_transactions` (Финансовые транзакции)

```prisma
model FinancialTransaction {
  id              String   @id @default(uuid())
  orderId         String?  @map("order_id") // Связь с заказом
  memberId        String?  @map("member_id")
  
  // Тип транзакции
  type            String   @db.VarChar(50) // "order_payment", "refund", "adjustment"
  direction       String   @db.VarChar(20) // "income", "expense"
  
  // Суммы
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("USD") @db.VarChar(3)
  
  // Метод оплаты
  paymentMethod   String?  @map("payment_method") @db.VarChar(50) // "cash", "card", "crypto"
  
  // Временные метки
  transactionDate DateTime @default(now()) @map("transaction_date")
  createdAt       DateTime @default(now()) @map("created_at")
  createdBy       String?  @map("created_by") // Employee ID
  
  // Примечания
  description     String?  @db.Text
  notes           String?  @db.Text

  // Связи
  order           Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  member          Member?  @relation(fields: [memberId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([memberId])
  @@index([type])
  @@index([direction])
  @@index([transactionDate])
  @@map("financial_transactions")
}
```

#### 2. Обновление модели `Order`

```prisma
model Order {
  // ... существующие поля ...
  
  // Новые связи
  transactions    FinancialTransaction[]
  
  // ... остальные связи ...
}
```

#### 3. Обновление модели `Member`

```prisma
model Member {
  // ... существующие поля ...
  
  // Новые связи
  transactions    FinancialTransaction[]
  
  // ... остальные связи ...
}
```

### Бэкенд модули

#### Структура модулей

```
apps/api/src/modules/
├── finance/
│   ├── domain/
│   │   ├── entity/
│   │   │   └── financial-transaction.entity.ts
│   │   └── repositories/
│   │       └── financial-transaction-repository.interface.ts
│   ├── application/
│   │   └── services/
│   │       ├── financial-transactions.service.ts
│   │       └── financial-reports.service.ts
│   ├── infrastructure/
│   │   └── repositories/
│   │       └── financial-transaction-prisma.repository.ts
│   ├── api/
│   │   ├── controllers/
│   │   │   └── crm-finance.controller.ts
│   │   └── dto/
│   │       ├── financial-report.dto.ts
│   │       └── financial-stats.dto.ts
│   └── finance.module.ts
```

#### Сервис финансовых отчетов

**FinancialReportsService** (`apps/api/src/modules/finance/application/services/financial-reports.service.ts`):

```typescript
@Injectable()
export class FinancialReportsService {
    /**
     * Отчет по товарам
     */
    async getProductsReport(filters: ReportFilters): Promise<ProductsReportDto> {
        const orders = await this.orderRepository.findByDateRange(
            filters.startDate,
            filters.endDate
        );

        const productStats = new Map<string, {
            productId: string;
            productName: string;
            totalQuantity: Decimal;
            totalRevenue: Decimal;
            orderCount: number;
        }>();

        for (const order of orders) {
            if (order.status !== "completed") continue;

            for (const item of order.items) {
                const existing = productStats.get(item.productId) || {
                    productId: item.productId,
                    productName: item.product.name,
                    totalQuantity: new Decimal(0),
                    totalRevenue: new Decimal(0),
                    orderCount: 0,
                };

                existing.totalQuantity = existing.totalQuantity.plus(item.quantity);
                existing.totalRevenue = existing.totalRevenue.plus(item.totalPrice);
                existing.orderCount++;

                productStats.set(item.productId, existing);
            }
        }

        return {
            products: Array.from(productStats.values()),
            totalRevenue: Array.from(productStats.values())
                .reduce((sum, stat) => sum.plus(stat.totalRevenue), new Decimal(0)),
            period: {
                startDate: filters.startDate,
                endDate: filters.endDate,
            },
        };
    }

    /**
     * Отчет по типам товаров (категориям)
     */
    async getCategoriesReport(filters: ReportFilters): Promise<CategoriesReportDto> {
        const orders = await this.orderRepository.findByDateRange(
            filters.startDate,
            filters.endDate
        );

        const categoryStats = new Map<string, {
            categoryId: string;
            categoryName: string;
            totalRevenue: Decimal;
            orderCount: number;
            productCount: number;
        }>();

        for (const order of orders) {
            if (order.status !== "completed") continue;

            for (const item of order.items) {
                const category = item.product.category;
                const existing = categoryStats.get(category.id) || {
                    categoryId: category.id,
                    categoryName: category.name,
                    totalRevenue: new Decimal(0),
                    orderCount: 0,
                    productCount: 0,
                };

                existing.totalRevenue = existing.totalRevenue.plus(item.totalPrice);
                existing.orderCount++;
                existing.productCount++;

                categoryStats.set(category.id, existing);
            }
        }

        return {
            categories: Array.from(categoryStats.values()),
            totalRevenue: Array.from(categoryStats.values())
                .reduce((sum, stat) => sum.plus(stat.totalRevenue), new Decimal(0)),
            period: {
                startDate: filters.startDate,
                endDate: filters.endDate,
            },
        };
    }

    /**
     * Отчет по членам клуба
     */
    async getMembersReport(filters: ReportFilters): Promise<MembersReportDto> {
        const orders = await this.orderRepository.findByDateRange(
            filters.startDate,
            filters.endDate
        );

        const memberStats = new Map<string, {
            memberId: string;
            memberName: string;
            memberEmail: string;
            totalOrders: number;
            totalSpent: Decimal;
            averageOrderValue: Decimal;
        }>();

        for (const order of orders) {
            if (order.status !== "completed") continue;

            const existing = memberStats.get(order.memberId) || {
                memberId: order.memberId,
                memberName: `${order.member.name} ${order.member.surname || ""}`.trim(),
                memberEmail: order.member.user.email,
                totalOrders: 0,
                totalSpent: new Decimal(0),
                averageOrderValue: new Decimal(0),
            };

            existing.totalOrders++;
            existing.totalSpent = existing.totalSpent.plus(order.total);

            memberStats.set(order.memberId, existing);
        }

        // Расчет среднего чека
        for (const stat of memberStats.values()) {
            stat.averageOrderValue = stat.totalSpent.dividedBy(stat.totalOrders);
        }

        return {
            members: Array.from(memberStats.values())
                .sort((a, b) => b.totalSpent.comparedTo(a.totalSpent)),
            totalRevenue: Array.from(memberStats.values())
                .reduce((sum, stat) => sum.plus(stat.totalSpent), new Decimal(0)),
            period: {
                startDate: filters.startDate,
                endDate: filters.endDate,
            },
        };
    }

    /**
     * Общая финансовая статистика
     */
    async getFinancialStats(filters: ReportFilters): Promise<FinancialStatsDto> {
        const transactions = await this.financialTransactionRepository.findByDateRange(
            filters.startDate,
            filters.endDate
        );

        const income = transactions
            .filter(t => t.direction === "income")
            .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

        const expenses = transactions
            .filter(t => t.direction === "expense")
            .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

        const orders = await this.orderRepository.findByDateRange(
            filters.startDate,
            filters.endDate
        );

        const completedOrders = orders.filter(o => o.status === "completed");
        const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "preparing");

        return {
            period: {
                startDate: filters.startDate,
                endDate: filters.endDate,
            },
            income,
            expenses,
            profit: income.minus(expenses),
            totalOrders: orders.length,
            completedOrders: completedOrders.length,
            pendingOrders: pendingOrders.length,
            averageOrderValue: completedOrders.length > 0
                ? completedOrders.reduce((sum, o) => sum.plus(o.total), new Decimal(0))
                    .dividedBy(completedOrders.length)
                : new Decimal(0),
        };
    }
}
```

### API Endpoints

#### CRM Finance

```
GET    /crm/finance/reports/products        - Отчет по товарам
GET    /crm/finance/reports/categories      - Отчет по категориям
GET    /crm/finance/reports/members         - Отчет по членам
GET    /crm/finance/reports/stats           - Общая статистика
GET    /crm/finance/transactions            - Список транзакций
POST   /crm/finance/transactions            - Создать транзакцию (Admin)
```

### DTO для отчетов

```typescript
export class ReportFiltersDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsString()
    memberId?: string;
}

export class ProductsReportDto {
    products: Array<{
        productId: string;
        productName: string;
        totalQuantity: number;
        totalRevenue: number;
        orderCount: number;
    }>;
    totalRevenue: number;
    period: {
        startDate: string;
        endDate: string;
    };
}

export class CategoriesReportDto {
    categories: Array<{
        categoryId: string;
        categoryName: string;
        totalRevenue: number;
        orderCount: number;
        productCount: number;
    }>;
    totalRevenue: number;
    period: {
        startDate: string;
        endDate: string;
    };
}

export class MembersReportDto {
    members: Array<{
        memberId: string;
        memberName: string;
        memberEmail: string;
        totalOrders: number;
        totalSpent: number;
        averageOrderValue: number;
    }>;
    totalRevenue: number;
    period: {
        startDate: string;
        endDate: string;
    };
}

export class FinancialStatsDto {
    period: {
        startDate: string;
        endDate: string;
    };
    income: number;
    expenses: number;
    profit: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    averageOrderValue: number;
}
```

### Фронтенд - CRM (Финансовые отчеты)

#### Структура модулей

```
apps/crm/modules/
├── features/
│   ├── finance-reports/
│   │   ├── ui/
│   │   │   ├── finance-reports-page.tsx
│   │   │   ├── products-report.tsx
│   │   │   ├── categories-report.tsx
│   │   │   ├── members-report.tsx
│   │   │   └── financial-stats-dashboard.tsx
│   │   └── finance-reports-feature.tsx
│   │
│   └── finance-filters/
│       ├── ui/
│       │   └── report-filters-form.tsx
│       └── finance-filters-feature.tsx
│
└── widgets/
    └── finance-dashboard/
        └── ui/
            └── finance-dashboard-widget.tsx
```

---

## 🔗 Интеграция систем

### Связь присутствия и каталога

1. **Проверка присутствия при просмотре каталога:**
   - Член может видеть каталог только если `isActive = true` в `presence_logs`
   - API endpoint `/lk/catalog/products` проверяет активное присутствие

2. **Создание заказа:**
   - Заказ можно создать только при активном присутствии
   - При создании заказа автоматически создается финансовая транзакция

3. **Завершение заказа:**
   - При статусе `completed` создается транзакция типа `order_payment`
   - Обновляется финансовая статистика

### Автоматические действия

1. **При выходе члена из клуба:**
   - Все незавершенные заказы остаются в статусе `pending` или `preparing`
   - Член может завершить заказ при следующем визите

2. **Уведомления о низких остатках:**
   - При `currentQuantity <= minQuantity` отправляется уведомление сотрудникам
   - Через BullMQ очередь

---

**Дата создания:** 2024-03-16  
**Версия:** 2.0.0  
**Обновлено:** Добавлены разделы по каталогу товаров, заказам и финансовой системе
