import { z } from "zod";

const uniqueIds = (values: string[]) => new Set(values).size === values.length;

export const forestPreferencesSchema = z.object({
  speciesIds: z.array(z.string().regex(/^[a-z0-9-]{3,80}$/)).max(40)
    .refine(uniqueIds, "Les espècies no es poden repetir."),
  territorySlugs: z.array(z.string().regex(/^[a-z0-9/-]{2,120}$/)).max(30)
    .refine(uniqueIds, "Els territoris no es poden repetir."),
});
