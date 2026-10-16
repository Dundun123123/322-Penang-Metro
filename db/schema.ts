import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const notices = sqliteTable("notices", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("draft"),
  titleEn: text("title_en").notNull(),
  titleZh: text("title_zh"),
  titleMs: text("title_ms"),
  bodyEn: text("body_en").notNull(),
  bodyZh: text("body_zh"),
  bodyMs: text("body_ms"),
  location: text("location").notNull(),
  startAt: text("start_at"),
  endAt: text("end_at"),
  diversion: text("diversion"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  accessHash: text("access_hash").notNull(),
  ownerUserId: text("owner_user_id"),
  contactEmail: text("contact_email"),
  kind: text("kind").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  photoKey: text("photo_key"),
  status: text("status").notNull().default("received"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const reportEvents = sqliteTable("report_events", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  status: text("status").notNull(),
  noteEn: text("note_en").notNull(),
  noteZh: text("note_zh"),
  noteMs: text("note_ms"),
  createdAt: text("created_at").notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  userId: text("user_id").primaryKey(),
  categories: text("categories").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const admins = sqliteTable("admins", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  createdAt: text("created_at").notNull(),
});
