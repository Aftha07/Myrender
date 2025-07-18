import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  decimal,
  integer,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company users table for company authentication
export const companyUsers = pgTable("company_users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: text("password").notNull(),
  companyId: varchar("company_id").notNull(),
  companyName: varchar("company_name").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().notNull(),
  companyUserId: varchar("company_user_id").references(() => companyUsers.id),
  replitUserId: varchar("replit_user_id").references(() => users.id),
  referenceId: varchar("reference_id").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id),
  description: text("description"),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  costCenter: varchar("cost_center").notNull().default("Main Center"),
  paymentTerm: varchar("payment_term"),
  supplyDate: timestamp("supply_date").notNull(),
  items: jsonb("items").notNull().default([]), // Array of invoice items
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatPercent: decimal("vat_percent", { precision: 5, scale: 2 }).notNull().default("15"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status").notNull().default("draft"), // draft, sent, paid, not paid, overdue
  returnReference: varchar("return_reference"),
  qrCode: text("qr_code"),
  zatcaCompliant: boolean("zatca_compliant").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().notNull(),
  companyUserId: varchar("company_user_id").references(() => companyUsers.id),
  replitUserId: varchar("replit_user_id").references(() => users.id),
  code: varchar("code").notNull(),
  customerName: varchar("customer_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  account: varchar("account").notNull().default("Accounts Receivables"),
  vatRegistrationNumber: varchar("vat_registration_number"),
  openingBalance: decimal("opening_balance", { precision: 10, scale: 2 }).default("0"),
  streetName: varchar("street_name"),
  city: varchar("city"),
  country: varchar("country"),
  postalCode: varchar("postal_code"),
  status: varchar("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("customers_company_user_id_idx").on(table.companyUserId),
  index("customers_replit_user_id_idx").on(table.replitUserId),
  index("customers_created_at_idx").on(table.createdAt),
]);

// Quotations table
export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().notNull(),
  companyUserId: varchar("company_user_id").references(() => companyUsers.id),
  replitUserId: varchar("replit_user_id").references(() => users.id),
  referenceId: varchar("reference_id").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  description: text("description"),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  items: jsonb("items").notNull().default([]), // Array of quotation items
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatPercent: decimal("vat_percent", { precision: 5, scale: 2 }).notNull().default("15"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status").notNull().default("draft"), // draft, sent, accepted, declined, expired
  termsAndConditions: text("terms_and_conditions"),
  notes: text("notes"),
  attachments: jsonb("attachments").default([]), // Array of attachment file paths/urls
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().notNull(),
  companyUserId: varchar("company_user_id").references(() => companyUsers.id),
  replitUserId: varchar("replit_user_id").references(() => users.id),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category").notNull(),
  date: timestamp("date").notNull(),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Proforma Invoices table
export const proformaInvoices = pgTable("proforma_invoices", {
  id: varchar("id").primaryKey().notNull(),
  companyUserId: varchar("company_user_id").references(() => companyUsers.id),
  replitUserId: varchar("replit_user_id").references(() => users.id),
  referenceId: varchar("reference_id").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  description: text("description"),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  items: jsonb("items").notNull().default([]), // Array of proforma invoice items
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatPercent: decimal("vat_percent", { precision: 5, scale: 2 }).notNull().default("15"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status").notNull().default("draft"), // draft, sent, accepted, declined, expired
  termsAndConditions: text("terms_and_conditions"),
  notes: text("notes"),
  attachments: jsonb("attachments").default([]), // Array of attachment file paths/urls
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertCompanyUser = typeof companyUsers.$inferInsert;
export type CompanyUser = typeof companyUsers.$inferSelect;

export type InsertInvoice = typeof invoices.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;

export type InsertCustomer = typeof customers.$inferInsert;
export type Customer = typeof customers.$inferSelect;

export type InsertQuotation = typeof quotations.$inferInsert;
export type Quotation = typeof quotations.$inferSelect;

export type InsertExpense = typeof expenses.$inferInsert;
export type Expense = typeof expenses.$inferSelect;

export type InsertProformaInvoice = typeof proformaInvoices.$inferInsert;
export type ProformaInvoice = typeof proformaInvoices.$inferSelect & {
  customer?: {
    customerName: string;
    email?: string;
    phone?: string;
    city?: string;
  };
};

// Settings tables
export const generalSettings = pgTable("general_settings", {
  id: varchar("id").primaryKey().default("default"),
  companyName: varchar("company_name"),
  companyLogoUrl: varchar("company_logo_url", { length: 500 }),
  industry: varchar("industry"),
  companyType: varchar("company_type"),
  contactPerson: varchar("contact_person"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  address: text("address"),
  city: varchar("city"),
  country: varchar("country"),
  postalCode: varchar("postal_code", { length: 50 }),
  website: varchar("website"),
  taxNumber: varchar("tax_number"),
  registrationNumber: varchar("registration_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accountingSettings = pgTable("accounting_settings", {
  id: varchar("id").primaryKey().default("default"),
  yearStartMonth: varchar("year_start_month", { length: 50 }).default("January"),
  yearStartDay: varchar("year_start_day", { length: 10 }).default("1"),
  defaultTaxRate: varchar("default_tax_rate", { length: 50 }).default("Vat 15%"),
  booksClosing: boolean("books_closing").default(false),
  inventorySystem: varchar("inventory_system", { length: 50 }).default("Periodic"),
  closingDate: date("closing_date"),
  enableRetention: boolean("enable_retention").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Units table
export const units = pgTable("units", {
  id: varchar("id").primaryKey().notNull(),
  companyUserId: varchar("company_user_id").references(() => companyUsers.id),
  replitUserId: varchar("replit_user_id").references(() => users.id),
  name: varchar("name").notNull(),
  symbol: varchar("symbol").notNull(),
  type: varchar("type").notNull().default("Unit"), // Unit, Weight, Time, etc.
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().notNull(),
  companyUserId: varchar("company_user_id").references(() => companyUsers.id),
  replitUserId: varchar("replit_user_id").references(() => users.id),
  nameArabic: varchar("name_arabic"),
  nameEnglish: varchar("name_english").notNull(),
  productId: varchar("product_id").notNull().unique(),
  category: varchar("category").notNull().default("Default Category"),
  description: text("description"),
  type: varchar("type").notNull().default("product"), // product, service, expense, recipe
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
  // Recipe-specific fields
  additionalCost: decimal("additional_cost", { precision: 10, scale: 2 }).default("0"),
  additionalCostAccount: varchar("additional_cost_account").default("Dependent"),
  containedProducts: jsonb("contained_products").default([]), // Array of contained products for recipes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("products_company_user_id_idx").on(table.companyUserId),
  index("products_replit_user_id_idx").on(table.replitUserId),
  index("products_created_at_idx").on(table.createdAt),
]);

export type InsertGeneralSettings = typeof generalSettings.$inferInsert;
export type GeneralSettings = typeof generalSettings.$inferSelect;

export type InsertAccountingSettings = typeof accountingSettings.$inferInsert;
export type AccountingSettings = typeof accountingSettings.$inferSelect;

export type InsertProduct = typeof products.$inferInsert;
export type Product = typeof products.$inferSelect;

export type InsertUnit = typeof units.$inferInsert;
export type Unit = typeof units.$inferSelect;

// Zod schemas
export const insertCompanyUserSchema = createInsertSchema(companyUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProformaInvoiceSchema = createInsertSchema(proformaInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Login schema
export const companyLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  recaptchaToken: z.string().min(1),
});

export type CompanyLoginData = z.infer<typeof companyLoginSchema>;
