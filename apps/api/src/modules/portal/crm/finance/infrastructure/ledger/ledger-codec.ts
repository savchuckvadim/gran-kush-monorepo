import { Injectable } from "@nestjs/common";

import {
    PORTAL_CIPHER_PURPOSES,
    PortalCipherService,
} from "@encryption/application/services/portal-cipher.service";

import { blindIndexInputs, type CounterpartyDetails } from "../../domain/ledger/counterparty";
import type { LedgerSecret } from "../../domain/ledger/ledger-entry";

const PURPOSE = PORTAL_CIPHER_PURPOSES.finance;

/**
 * Шифр учёта на ключе портала: проводка, контрагент, вложение — у каждого свой контекст (AAD),
 * шифротекст другой записи не расшифруется. Слепые индексы — для поиска дублей без открытых
 * значений.
 */
@Injectable()
export class LedgerCodec {
    constructor(private readonly cipher: PortalCipherService) {}

    sealEntry(portalId: string, id: string, secret: LedgerSecret): Promise<string> {
        return this.cipher.encryptJson(portalId, PURPOSE, `ledger_entry:${id}`, secret);
    }

    openEntry(portalId: string, id: string, payload: string): Promise<LedgerSecret> {
        return this.cipher.decryptJson<LedgerSecret>(
            portalId,
            PURPOSE,
            `ledger_entry:${id}`,
            payload
        );
    }

    sealCounterparty(portalId: string, id: string, details: CounterpartyDetails): Promise<string> {
        return this.cipher.encryptJson(portalId, PURPOSE, `counterparty:${id}`, details);
    }

    openCounterparty(portalId: string, id: string, details: string): Promise<CounterpartyDetails> {
        return this.cipher.decryptJson<CounterpartyDetails>(
            portalId,
            PURPOSE,
            `counterparty:${id}`,
            details
        );
    }

    sealFile(portalId: string, entryId: string, file: Buffer): Promise<Buffer> {
        return this.cipher.encryptBytes(portalId, PURPOSE, `ledger_attachment:${entryId}`, file);
    }

    openFile(portalId: string, entryId: string, sealed: Buffer): Promise<Buffer> {
        return this.cipher.decryptBytes(portalId, PURPOSE, `ledger_attachment:${entryId}`, sealed);
    }

    documentIndex(portalId: string, documentNumber: string | null): Promise<string | null> {
        return documentNumber
            ? this.cipher.blindIndex(portalId, PURPOSE, blindIndexInputs.document(documentNumber))
            : Promise.resolve(null);
    }

    nifIndex(portalId: string, nif: string | null): Promise<string | null> {
        return nif
            ? this.cipher.blindIndex(portalId, PURPOSE, blindIndexInputs.nif(nif))
            : Promise.resolve(null);
    }

    nameIndex(portalId: string, name: string): Promise<string> {
        return this.cipher.blindIndex(portalId, PURPOSE, blindIndexInputs.name(name));
    }
}
