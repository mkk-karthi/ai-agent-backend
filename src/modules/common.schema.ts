import z from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().positive().default(10),
  nextToken: z.string().default(""),
  sorting: z.array(z.object().optional()).optional(),
  search: z.string().optional(),
  // filter: z.object().optional(),
});

export type PaginationType = z.infer<typeof paginationSchema>;
