import z from "zod";

import { useLoginSchema } from "../hooks/useLoginSchema";

export type LoginFormData = z.infer<ReturnType<typeof useLoginSchema>>;