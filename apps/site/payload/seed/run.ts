import { getPayload } from "payload";

import config from "../../payload.config";

import { seedContent } from "./seed";

const payload = await getPayload({ config });
await seedContent(payload);
process.exit(0);
