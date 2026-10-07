import config from "@payload-config";
import { getPayload } from "payload";

import "server-only";

export const getPayloadClient = () => getPayload({ config });
