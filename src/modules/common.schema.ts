import z from "zod";

export const paginationSchema = z.object({
  page: z.number().min(0).default(0),
  pageSize: z.number().positive().default(10),
  sorting: z.array(z.object().optional()).optional(),
  search: z.string().optional(),
  // filter: z.object().optional(),
});

export type PaginationType = z.infer<typeof paginationSchema>;
