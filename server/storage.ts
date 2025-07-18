import {
  users,
  companyUsers,
  invoices,
  expenses,
  customers,
  quotations,
  proformaInvoices,
  products,
  units,
  type User,
  type UpsertUser,
  type CompanyUser,
  type InsertCompanyUser,
  type Invoice,
  type InsertInvoice,
  type Expense,
  type InsertExpense,
  type Customer,
  type InsertCustomer,
  type Quotation,
  type InsertQuotation,
  type ProformaInvoice,
  type InsertProformaInvoice,
  type Product,
  type InsertProduct,
  type Unit,
  type InsertUnit,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import memoize from "memoizee";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company user operations
  getCompanyUserByEmail(email: string): Promise<CompanyUser | undefined>;
  createCompanyUser(user: InsertCompanyUser): Promise<CompanyUser>;
  
  // Invoice operations
  getInvoices(userId: string, isCompanyUser: boolean): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  getNextInvoiceReference(userId: string, isCompanyUser: boolean): Promise<string>;
  
  // Customer operations
  getCustomers(userId: string, isCompanyUser: boolean): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  getNextCustomerCode(userId: string, isCompanyUser: boolean): Promise<string>;
  getTotalOutstanding(userId: string, isCompanyUser: boolean): Promise<string>;
  
  // Quotation operations
  getQuotations(userId: string, isCompanyUser: boolean): Promise<Quotation[]>;
  getQuotation(id: string): Promise<Quotation | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: string, quotation: Partial<InsertQuotation>): Promise<Quotation>;
  deleteQuotation(id: string): Promise<void>;
  getNextQuotationReference(userId: string, isCompanyUser: boolean): Promise<string>;

  // Proforma Invoice operations
  getProformaInvoices(userId: string, isCompanyUser: boolean): Promise<ProformaInvoice[]>;
  getProformaInvoice(id: string): Promise<ProformaInvoice | undefined>;
  createProformaInvoice(proformaInvoice: InsertProformaInvoice): Promise<ProformaInvoice>;
  updateProformaInvoice(id: string, proformaInvoice: Partial<InsertProformaInvoice>): Promise<ProformaInvoice>;
  deleteProformaInvoice(id: string): Promise<void>;
  getNextProformaInvoiceReference(userId: string, isCompanyUser: boolean): Promise<string>;

  // Expense operations
  getExpenses(userId: string, isCompanyUser: boolean): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;

  // Product operations
  getProducts(userId: string, isCompanyUser: boolean): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  getNextProductId(userId: string, isCompanyUser: boolean): Promise<string>;
  
  // Unit operations
  getUnits(userId: string, isCompanyUser: boolean): Promise<Unit[]>;
  getUnit(id: string): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: string, unit: Partial<InsertUnit>): Promise<Unit>;
  deleteUnit(id: string): Promise<void>;
  getProductCountByUnit(unitName: string, userId: string, isCompanyUser: boolean): Promise<number>;
  
  // Statistics
  getFinancialStats(userId: string, isCompanyUser: boolean): Promise<{
    totalRevenue: string;
    activeInvoices: number;
    totalCustomers: number;
    monthlyExpenses: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Memoized cache for frequently accessed data
  private getCustomersCached = memoize(
    async (userId: string, isCompanyUser: boolean): Promise<Customer[]> => {
      const condition = isCompanyUser
        ? eq(customers.companyUserId, userId)
        : eq(customers.replitUserId, userId);
      
      return await db
        .select()
        .from(customers)
        .where(condition)
        .orderBy(desc(customers.createdAt));
    },
    {
      maxAge: 5 * 60 * 1000, // 5 minutes
      normalizer: (args) => JSON.stringify(args),
    }
  );

  private getProductsCached = memoize(
    async (userId: string, isCompanyUser: boolean): Promise<Product[]> => {
      const condition = isCompanyUser
        ? eq(products.companyUserId, userId)
        : eq(products.replitUserId, userId);
      
      return await db
        .select()
        .from(products)
        .where(condition)
        .orderBy(desc(products.createdAt));
    },
    {
      maxAge: 5 * 60 * 1000, // 5 minutes
      normalizer: (args) => JSON.stringify(args),
    }
  );
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Company user operations
  async getCompanyUserByEmail(email: string): Promise<CompanyUser | undefined> {
    const [user] = await db
      .select()
      .from(companyUsers)
      .where(eq(companyUsers.email, email));
    return user;
  }

  async createCompanyUser(userData: InsertCompanyUser): Promise<CompanyUser> {
    const [user] = await db
      .insert(companyUsers)
      .values(userData)
      .returning();
    return user;
  }

  // Invoice operations
  async getInvoices(userId: string, isCompanyUser: boolean): Promise<Invoice[]> {
    const condition = isCompanyUser
      ? eq(invoices.companyUserId, userId)
      : eq(invoices.replitUserId, userId);
    
    return await db
      .select()
      .from(invoices)
      .where(condition)
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(invoiceData)
      .returning();
    return invoice;
  }

  async updateInvoice(id: string, invoiceData: Partial<InsertInvoice>): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set({ ...invoiceData, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getNextInvoiceReference(userId: string, isCompanyUser: boolean): Promise<string> {
    const existingInvoices = await this.getInvoices(userId, isCompanyUser);
    const invoiceNumber = existingInvoices.length + 1;
    return `INV${invoiceNumber.toString().padStart(3, '0')}`;
  }

  // Expense operations
  async getExpenses(userId: string, isCompanyUser: boolean): Promise<Expense[]> {
    const condition = isCompanyUser
      ? eq(expenses.companyUserId, userId)
      : eq(expenses.replitUserId, userId);
    
    return await db
      .select()
      .from(expenses)
      .where(condition)
      .orderBy(desc(expenses.createdAt));
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values(expenseData)
      .returning();
    return expense;
  }

  // Customer operations
  async getCustomers(userId: string, isCompanyUser: boolean): Promise<Customer[]> {
    return await this.getCustomersCached(userId, isCompanyUser);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    // Clear cache when creating new customer
    this.getCustomersCached.clear();
    
    const [customer] = await db
      .insert(customers)
      .values(customerData)
      .returning();
    return customer;
  }

  async updateCustomer(id: string, customerData: Partial<InsertCustomer>): Promise<Customer> {
    // Clear cache when updating customer
    this.getCustomersCached.clear();
    
    const [customer] = await db
      .update(customers)
      .set({ ...customerData, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    // Clear cache when deleting customer
    this.getCustomersCached.clear();
    
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getNextCustomerCode(userId: string, isCompanyUser: boolean): Promise<string> {
    const condition = isCompanyUser
      ? eq(customers.companyUserId, userId)
      : eq(customers.replitUserId, userId);
    
    const customerList = await db
      .select({ code: customers.code })
      .from(customers)
      .where(condition)
      .orderBy(desc(customers.code));
    
    if (customerList.length === 0) {
      return "22"; // Start from 22 as per the interface
    }
    
    // Find the highest numeric code and increment
    const codes = customerList
      .map(c => parseInt(c.code))
      .filter(code => !isNaN(code))
      .sort((a, b) => b - a);
    
    const nextCode = codes.length > 0 ? codes[0] + 1 : 22;
    return nextCode.toString();
  }

  // Statistics
  async getFinancialStats(userId: string, isCompanyUser: boolean): Promise<{
    totalRevenue: string;
    activeInvoices: number;
    totalCustomers: number;
    monthlyExpenses: string;
  }> {
    const invoiceCondition = isCompanyUser
      ? eq(invoices.companyUserId, userId)
      : eq(invoices.replitUserId, userId);
    
    const expenseCondition = isCompanyUser
      ? eq(expenses.companyUserId, userId)
      : eq(expenses.replitUserId, userId);

    // Get all invoices for this user
    const userInvoices = await db
      .select()
      .from(invoices)
      .where(invoiceCondition);

    // Get all expenses for this user
    const userExpenses = await db
      .select()
      .from(expenses)
      .where(expenseCondition);

    // Calculate statistics
    const totalRevenue = userInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

    const activeInvoices = userInvoices.filter(inv => inv.status !== 'paid').length;

    const totalCustomers = new Set(userInvoices.map(inv => inv.clientEmail)).size;

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyExpenses = userExpenses
      .filter(exp => exp.date >= thisMonth)
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    return {
      totalRevenue: totalRevenue.toFixed(2),
      activeInvoices,
      totalCustomers,
      monthlyExpenses: monthlyExpenses.toFixed(2),
    };
  }

  async getTotalOutstanding(userId: string, isCompanyUser: boolean): Promise<string> {
    // Get all customers for the user
    const customers = await this.getCustomers(userId, isCompanyUser);
    
    // Calculate total outstanding from opening balances
    const totalOutstanding = customers.reduce((sum, customer) => {
      const balance = parseFloat(customer.openingBalance || '0');
      return sum + balance;
    }, 0);
    
    return totalOutstanding.toFixed(2);
  }

  // Quotation operations
  async getQuotations(userId: string, isCompanyUser: boolean): Promise<Quotation[]> {
    return await db.select()
      .from(quotations)
      .where(
        isCompanyUser 
          ? eq(quotations.companyUserId, userId)
          : eq(quotations.replitUserId, userId)
      )
      .orderBy(quotations.createdAt); // Changed to ascending order (oldest first)
  }

  async getQuotation(id: string): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation;
  }

  async createQuotation(quotationData: InsertQuotation): Promise<Quotation> {
    const { nanoid } = await import('nanoid');
    const { id, createdAt, updatedAt, ...dataWithoutId } = quotationData;
    const [quotation] = await db
      .insert(quotations)
      .values({
        ...dataWithoutId,
        id: nanoid(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return quotation;
  }

  async updateQuotation(id: string, quotationData: Partial<InsertQuotation>): Promise<Quotation> {
    try {
      console.log("Updating quotation with data:", JSON.stringify(quotationData, null, 2));
      
      // Clean up the data and ensure proper date formatting
      const cleanData = {
        ...quotationData,
        issueDate: quotationData.issueDate ? new Date(quotationData.issueDate) : undefined,
        dueDate: quotationData.dueDate ? new Date(quotationData.dueDate) : undefined,
        updatedAt: new Date(),
      };
      
      // Remove undefined values
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });
      
      console.log("Clean data being sent to DB:", JSON.stringify(cleanData, null, 2));
      
      const [quotation] = await db
        .update(quotations)
        .set(cleanData)
        .where(eq(quotations.id, id))
        .returning();
      return quotation;
    } catch (error) {
      console.error("Error updating quotation:", error);
      throw error;
    }
  }

  async deleteQuotation(id: string): Promise<void> {
    await db.delete(quotations).where(eq(quotations.id, id));
  }

  async getNextQuotationReference(userId: string, isCompanyUser: boolean): Promise<string> {
    // Get all quotations for this user and extract the highest reference number
    const existingQuotations = await db.select({
      referenceId: quotations.referenceId
    })
    .from(quotations)
    .where(
      isCompanyUser 
        ? eq(quotations.companyUserId, userId)
        : eq(quotations.replitUserId, userId)
    );

    // Extract numbers from existing references and find the highest one
    let highestNumber = 0;
    for (const quotation of existingQuotations) {
      const match = quotation.referenceId.match(/QUO(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > highestNumber) {
          highestNumber = num;
        }
      }
    }

    // Generate next sequential number
    const nextNumber = highestNumber + 1;
    return `QUO${String(nextNumber).padStart(5, '0')}`;
  }

  // Proforma Invoice operations
  async getProformaInvoices(userId: string, isCompanyUser: boolean): Promise<ProformaInvoice[]> {
    // Optimized query with minimal data selection for better performance
    const proformaInvoicesWithCustomers = await db
      .select({
        id: proformaInvoices.id,
        companyUserId: proformaInvoices.companyUserId,
        replitUserId: proformaInvoices.replitUserId,
        referenceId: proformaInvoices.referenceId,
        customerId: proformaInvoices.customerId,
        description: proformaInvoices.description,
        issueDate: proformaInvoices.issueDate,
        subtotal: proformaInvoices.subtotal,
        discount: proformaInvoices.discount,
        vatPercent: proformaInvoices.vatPercent,
        vatAmount: proformaInvoices.vatAmount,
        totalAmount: proformaInvoices.totalAmount,
        items: proformaInvoices.items,
        termsAndConditions: proformaInvoices.termsAndConditions,
        notes: proformaInvoices.notes,
        attachments: proformaInvoices.attachments,
        createdAt: proformaInvoices.createdAt,
        updatedAt: proformaInvoices.updatedAt,
        // Only select essential customer fields
        customerName: customers.customerName,
        customerEmail: customers.email,
      })
      .from(proformaInvoices)
      .leftJoin(customers, eq(proformaInvoices.customerId, customers.id))
      .where(
        isCompanyUser 
          ? eq(proformaInvoices.companyUserId, userId)
          : eq(proformaInvoices.replitUserId, userId)
      )
      .orderBy(desc(proformaInvoices.createdAt))
      .limit(100); // Limit to prevent excessive data loading

    return proformaInvoicesWithCustomers.map((row) => ({
      id: row.id,
      companyUserId: row.companyUserId,
      replitUserId: row.replitUserId,
      referenceId: row.referenceId,
      customerId: row.customerId,
      description: row.description,
      issueDate: row.issueDate,
      subtotal: row.subtotal,
      discount: row.discount,
      vatPercent: row.vatPercent,
      vatAmount: row.vatAmount,
      totalAmount: row.totalAmount,
      items: row.items,
      termsAndConditions: row.termsAndConditions,
      notes: row.notes,
      attachments: row.attachments,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: row.customerName ? {
        customerName: row.customerName,
        email: row.customerEmail,
      } : undefined,
    })) as ProformaInvoice[];
  }

  async getProformaInvoice(id: string): Promise<ProformaInvoice | undefined> {
    const proformaInvoiceWithCustomer = await db
      .select({
        id: proformaInvoices.id,
        companyUserId: proformaInvoices.companyUserId,
        replitUserId: proformaInvoices.replitUserId,
        referenceId: proformaInvoices.referenceId,
        customerId: proformaInvoices.customerId,
        description: proformaInvoices.description,
        issueDate: proformaInvoices.issueDate,
        dueDate: proformaInvoices.dueDate,
        subtotal: proformaInvoices.subtotal,
        discount: proformaInvoices.discount,
        discountPercent: proformaInvoices.discountPercent,
        vatPercent: proformaInvoices.vatPercent,
        vatAmount: proformaInvoices.vatAmount,
        totalAmount: proformaInvoices.totalAmount,
        status: proformaInvoices.status,
        items: proformaInvoices.items,
        termsAndConditions: proformaInvoices.termsAndConditions,
        notes: proformaInvoices.notes,
        attachments: proformaInvoices.attachments,
        createdAt: proformaInvoices.createdAt,
        updatedAt: proformaInvoices.updatedAt,
        customerName: customers.customerName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        customerCity: customers.city,
      })
      .from(proformaInvoices)
      .leftJoin(customers, eq(proformaInvoices.customerId, customers.id))
      .where(eq(proformaInvoices.id, id))
      .limit(1);

    if (!proformaInvoiceWithCustomer.length) {
      return undefined;
    }

    const row = proformaInvoiceWithCustomer[0];
    return {
      id: row.id,
      companyUserId: row.companyUserId,
      replitUserId: row.replitUserId,
      referenceId: row.referenceId,
      customerId: row.customerId,
      description: row.description,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      subtotal: row.subtotal,
      discount: row.discount,
      discountPercent: row.discountPercent,
      vatPercent: row.vatPercent,
      vatAmount: row.vatAmount,
      totalAmount: row.totalAmount,
      status: row.status,
      items: row.items,
      termsAndConditions: row.termsAndConditions,
      notes: row.notes,
      attachments: row.attachments,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: row.customerName ? {
        customerName: row.customerName,
        email: row.customerEmail,
        phone: row.customerPhone,
        city: row.customerCity,
      } : undefined,
    } as ProformaInvoice;
  }

  async createProformaInvoice(proformaInvoiceData: InsertProformaInvoice): Promise<ProformaInvoice> {
    const [proformaInvoice] = await db
      .insert(proformaInvoices)
      .values({
        ...proformaInvoiceData,
        id: nanoid(),
      })
      .returning();
    return proformaInvoice;
  }

  async updateProformaInvoice(id: string, proformaInvoiceData: Partial<InsertProformaInvoice>): Promise<ProformaInvoice> {
    const [proformaInvoice] = await db
      .update(proformaInvoices)
      .set({
        ...proformaInvoiceData,
        updatedAt: new Date(),
      })
      .where(eq(proformaInvoices.id, id))
      .returning();
    return proformaInvoice;
  }

  async deleteProformaInvoice(id: string): Promise<void> {
    await db.delete(proformaInvoices).where(eq(proformaInvoices.id, id));
  }

  async getNextProformaInvoiceReference(userId: string, isCompanyUser: boolean): Promise<string> {
    const result = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(proformaInvoices)
    .where(
      isCompanyUser 
        ? eq(proformaInvoices.companyUserId, userId)
        : eq(proformaInvoices.replitUserId, userId)
    );

    const count = result[0]?.count || 0;
    return `PROFORMA${String(count + 1).padStart(4, '0')}`;
  }

  // Product operations
  async getProducts(userId: string, isCompanyUser: boolean): Promise<Product[]> {
    return await this.getProductsCached(userId, isCompanyUser);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    // Clear cache when creating new product
    this.getProductsCached.clear();
    
    const id = nanoid();
    const [product] = await db
      .insert(products)
      .values({
        ...productData,
        id,
      })
      .returning();
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product> {
    // Clear cache when updating product
    this.getProductsCached.clear();
    
    const [product] = await db
      .update(products)
      .set({
        ...productData,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    // Clear cache when deleting product
    this.getProductsCached.clear();
    
    await db.delete(products).where(eq(products.id, id));
  }

  async getNextProductId(userId: string, isCompanyUser: boolean): Promise<string> {
    const condition = isCompanyUser
      ? eq(products.companyUserId, userId)
      : eq(products.replitUserId, userId);
    
    const lastProduct = await db
      .select({ productId: products.productId })
      .from(products)
      .where(condition)
      .orderBy(desc(products.createdAt))
      .limit(1);
    
    if (lastProduct.length === 0) {
      return "Prod-001";
    }
    
    const lastNumber = parseInt(lastProduct[0].productId.split('-')[1]) || 0;
    return `Prod-${String(lastNumber + 1).padStart(3, '0')}`;
  }

  // Unit operations
  async getUnits(userId: string, isCompanyUser: boolean): Promise<Unit[]> {
    const condition = isCompanyUser
      ? eq(units.companyUserId, userId)
      : eq(units.replitUserId, userId);
    
    return await db.select().from(units).where(condition).orderBy(desc(units.createdAt));
  }

  async getUnit(id: string): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit;
  }

  async createUnit(unitData: InsertUnit): Promise<Unit> {
    const [unit] = await db
      .insert(units)
      .values({
        ...unitData,
        id: nanoid(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return unit;
  }

  async updateUnit(id: string, unitData: Partial<InsertUnit>): Promise<Unit> {
    const [unit] = await db
      .update(units)
      .set({
        ...unitData,
        updatedAt: new Date(),
      })
      .where(eq(units.id, id))
      .returning();
    return unit;
  }

  async deleteUnit(id: string): Promise<void> {
    await db.delete(units).where(eq(units.id, id));
  }

  async getProductCountByUnit(unitName: string, userId: string, isCompanyUser: boolean): Promise<number> {
    const condition = isCompanyUser
      ? eq(products.companyUserId, userId)
      : eq(products.replitUserId, userId);
    
    const result = await db
      .select({ count: sql`COUNT(*)` })
      .from(products)
      .where(and(condition, eq(products.unit, unitName)));
    
    return Number(result[0].count);
  }
}

export const storage = new DatabaseStorage();
