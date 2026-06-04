/**
 * Types shared between the client and server go here.
 *
 * For example, we can add zod schemas for API input validation, and derive types from them:
 *
 * import z from "zod";
 * 
 * export const TodoSchema = z.object({
 *   id: z.number(),
 *   name: z.string(),
 *   completed: z.number().int(), // 0 or 1
 * })
 *
 * export type TodoType = z.infer<typeof TodoSchema>;
 */

export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  CLOUDINARY_API_KEY: string;
}
