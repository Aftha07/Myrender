import {
  pgTable,
  text,
  varchar,
  decimal,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().notNull(),
  companyUserId: varchar("company_user_id"),
  replitUserId: varchar("replit_user_id"),
  nameArabic: varchar("name_arabic"),
  nameEnglish: varchar("name_english").notNull(),
  productId: varchar("product_id").notNull().unique(), // Like Prod-320
  category: varchar("category").notNull().default("Default Category"),
  description: text("description"),
  type: varchar("type").notNull().default("product"), // product, service, expense
  quantity: integer("quantity").default(0),
  buyingPrice: decimal("buying_price", { precision: 10, scale: 2 }).default("0"),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).default("0"),
  tax: varchar("tax").default("Vat 15%"),
  unit: varchar("unit").default("Box"),
  barcode: varchar("barcode"),
  allowNotification: boolean("allow_notification").default(false),
  minimumQuantity: integer("minimum_quantity").default(0),
  image: text("image"),
  inventoryItem: boolean("inventory_item").default(true),
  sellingProduct: boolean("selling_product").default(true),
  buyingProduct: boolean("buying_product").default(true),
  warehouse: varchar("warehouse").default("Warehouse"),
  salesAccount: varchar("sales_account").default("Sales"),
  purchasesAccount: varchar("purchases_account").default("Purchases"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertProduct = typeof products.$inferInsert;
export type Product = typeof products.$inferSelect;

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});