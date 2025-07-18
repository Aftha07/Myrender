import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  companyLoginSchema, 
  insertCustomerSchema,
  insertProformaInvoiceSchema,
  insertInvoiceSchema,
  insertProductSchema,
  insertUnitSchema,
  generalSettings,
  accountingSettings,
  type CompanyLoginData,
  type Customer,
  type InsertProduct,
  type InsertCustomer,
  type InsertProformaInvoice,
  type InsertInvoice,
  type Invoice,
  type GeneralSettings,
  type InsertGeneralSettings,
  type AccountingSettings,
  type InsertAccountingSettings,
  type Unit,
  type InsertUnit
} from "@shared/schema";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import multer from "multer";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import memoize from "memoizee";

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Static files middleware for serving uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  });

  // File upload endpoint
  app.post('/api/upload', upload.array('attachments', 10), (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const uploadedFiles = req.files.map(file => ({
        originalName: file.originalname,
        filename: file.filename,
        path: `/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype
      }));

      res.json({ 
        message: 'Files uploaded successfully',
        files: uploadedFiles 
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  // Single image upload endpoint for recipes and products
  app.post('/api/upload-image', upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
      }

      res.json({ 
        message: 'Image uploaded successfully',
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: 'Image upload failed' });
    }
  });

  // Image upload endpoint for rich text editor
  app.post('/api/upload/image', upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      
      res.json({ 
        message: 'Image uploaded successfully',
        url: imageUrl
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: 'Image upload failed' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company authentication routes
  app.post('/api/auth/company/login', async (req, res) => {
    try {
      const loginData = companyLoginSchema.parse(req.body);
      
      // TODO: Verify reCAPTCHA token
      // const isRecaptchaValid = await verifyRecaptcha(loginData.recaptchaToken);
      // if (!isRecaptchaValid) {
      //   return res.status(400).json({ message: "reCAPTCHA verification failed" });
      // }

      const user = await storage.getCompanyUserByEmail(loginData.email);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      (req.session as any).companyUser = {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        companyName: user.companyName,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      res.json({
        user: {
          id: user.id,
          email: user.email,
          companyId: user.companyId,
          companyName: user.companyName,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
    } catch (error) {
      console.error("Company login error:", error);
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post('/api/auth/company/logout', (req, res) => {
    (req.session as any).companyUser = null;
    res.json({ message: "Logged out successfully" });
  });

  app.get('/api/auth/company/user', (req, res) => {
    const companyUser = (req.session as any).companyUser;
    if (!companyUser) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(companyUser);
  });

  // Protected routes
  const requireAuth = (req: any, res: any, next: any) => {
    const companyUser = (req.session as any).companyUser;
    const replitUser = req.user;
    
    if (!companyUser && !replitUser) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    req.currentUser = companyUser || replitUser;
    req.isCompanyUser = !!companyUser;
    next();
  };

  // Dashboard statistics
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const stats = await storage.getFinancialStats(userId, req.isCompanyUser);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Invoice routes
  app.get('/api/invoices', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const invoices = await storage.getInvoices(userId, req.isCompanyUser);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/invoices', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      console.log("Received invoice data:", req.body);
      console.log("Date fields:", {
        issueDate: req.body.issueDate,
        dueDate: req.body.dueDate,
        supplyDate: req.body.supplyDate,
      });
      
      // Convert date strings to Date objects
      const invoiceData = {
        ...req.body,
        id: nanoid(),
        companyUserId: req.isCompanyUser ? userId : null,
        replitUserId: req.isCompanyUser ? null : userId,
        invoiceNumber: `INV-${new Date().getFullYear()}-${nanoid(6)}`,
        qrCode: generateQRCode(req.body), // TODO: Implement QR code generation
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : new Date(),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(),
        supplyDate: req.body.supplyDate ? new Date(req.body.supplyDate) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log("Processed invoice data:", invoiceData);
      
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Expense routes
  app.get('/api/expenses', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const expenses = await storage.getExpenses(userId, req.isCompanyUser);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const expenseData = {
        ...req.body,
        id: nanoid(),
        companyUserId: req.isCompanyUser ? userId : null,
        replitUserId: req.isCompanyUser ? null : userId,
      };
      
      const expense = await storage.createExpense(expenseData);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  // Customer routes
  app.get('/api/customers', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const customers = await storage.getCustomers(userId, req.isCompanyUser);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get('/api/customers/total-outstanding', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const totalOutstanding = await storage.getTotalOutstanding(userId, req.isCompanyUser);
      res.json({ totalOutstanding });
    } catch (error) {
      console.error("Error fetching total outstanding:", error);
      res.status(500).json({ message: "Failed to fetch total outstanding" });
    }
  });

  app.get('/api/customers/next-code', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const nextCode = await storage.getNextCustomerCode(userId, req.isCompanyUser);
      res.json({ code: nextCode });
    } catch (error) {
      console.error("Error getting next customer code:", error);
      res.status(500).json({ message: "Failed to get next customer code" });
    }
  });

  app.get('/api/customers/:id', requireAuth, async (req: any, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post('/api/customers', requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      const customerData: InsertCustomer = {
        ...validatedData,
        id: nanoid(),
        companyUserId: req.isCompanyUser ? userId : null,
        replitUserId: req.isCompanyUser ? null : userId,
      };
      
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put('/api/customers/:id', requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, validatedData);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete('/api/customers/:id', requireAuth, async (req: any, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Initialize sample data (for demo purposes)
  app.post('/api/init-sample-data', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      const sampleCustomers = [
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          code: "1",
          customerName: "Abdullah R. Khalifa & Sons Company",
          email: null,
          phone: null,
          account: "Accounts Receivables",
          vatRegistrationNumber: null,
          openingBalance: "10000.00",
          streetName: null,
          city: null,
          country: null,
          postalCode: null,
          status: "active",
        },
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          code: "2",
          customerName: "Abdullah R. Khalifa & Sons Company",
          email: null,
          phone: null,
          account: "Accounts Receivables",
          vatRegistrationNumber: null,
          openingBalance: "16670.08",
          streetName: null,
          city: null,
          country: null,
          postalCode: null,
          status: "active",
        },
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          code: "3",
          customerName: "Effective Solution Contracting Est.",
          email: null,
          phone: null,
          account: "Customer",
          vatRegistrationNumber: null,
          openingBalance: "34145.15",
          streetName: null,
          city: null,
          country: null,
          postalCode: null,
          status: "active",
        },
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          code: "4",
          customerName: "Ahmad Yousef Al Najeeb Trading Est.",
          email: null,
          phone: null,
          account: "Customer",
          vatRegistrationNumber: null,
          openingBalance: "7532.50",
          streetName: null,
          city: null,
          country: null,
          postalCode: null,
          status: "active",
        },
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          code: "5",
          customerName: "Gio Systems Saudi Arabia Company",
          email: null,
          phone: null,
          account: "Customer",
          vatRegistrationNumber: null,
          openingBalance: "232121.92",
          streetName: null,
          city: null,
          country: null,
          postalCode: null,
          status: "active",
        },
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          code: "6",
          customerName: "YES YES TECH INDUSTRIAL SERVICES CO. LTD",
          email: null,
          phone: null,
          account: "Customer",
          vatRegistrationNumber: null,
          openingBalance: "0.00",
          streetName: null,
          city: null,
          country: null,
          postalCode: null,
          status: "active",
        },
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          code: "7",
          customerName: "شركة يوسف مصدق الدحوم الدحوم المحدودة",
          email: null,
          phone: "09986-233174057",
          account: "Accounts Receivables",
          vatRegistrationNumber: null,
          openingBalance: "109394.17",
          streetName: null,
          city: null,
          country: null,
          postalCode: null,
          status: "active",
        },
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          code: "8",
          customerName: "Oil Events Saudi Co. Ltd. One Person Company",
          email: null,
          phone: null,
          account: "Accounts Receivables",
          vatRegistrationNumber: null,
          openingBalance: "0.00",
          streetName: null,
          city: null,
          country: null,
          postalCode: null,
          status: "active",
        }
      ];

      for (const customerData of sampleCustomers) {
        await storage.createCustomer(customerData as InsertCustomer);
      }
      
      res.json({ message: "Sample data initialized successfully", count: sampleCustomers.length });
    } catch (error) {
      console.error("Error initializing sample data:", error);
      res.status(500).json({ message: "Failed to initialize sample data" });
    }
  });

  // Quotation routes
  app.get('/api/quotations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      let quotations = await storage.getQuotations(userId, req.isCompanyUser);
      
      // Apply filters if provided
      const { customerId, issueDateFrom, issueDateTo, dueDateFrom, dueDateTo, minAmount, maxAmount } = req.query;
      
      if (customerId && customerId !== 'All') {
        quotations = quotations.filter(q => q.customerId === customerId);
      }
      
      if (issueDateFrom) {
        const fromDate = new Date(issueDateFrom as string);
        quotations = quotations.filter(q => new Date(q.issueDate) >= fromDate);
      }
      
      if (issueDateTo) {
        const toDate = new Date(issueDateTo as string);
        quotations = quotations.filter(q => new Date(q.issueDate) <= toDate);
      }
      
      if (dueDateFrom) {
        const fromDate = new Date(dueDateFrom as string);
        quotations = quotations.filter(q => new Date(q.dueDate) >= fromDate);
      }
      
      if (dueDateTo) {
        const toDate = new Date(dueDateTo as string);
        quotations = quotations.filter(q => new Date(q.dueDate) <= toDate);
      }
      
      if (minAmount) {
        const min = parseFloat(minAmount as string);
        quotations = quotations.filter(q => parseFloat(q.totalAmount) >= min);
      }
      
      if (maxAmount) {
        const max = parseFloat(maxAmount as string);
        quotations = quotations.filter(q => parseFloat(q.totalAmount) <= max);
      }
      
      res.json(quotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ message: "Failed to fetch quotations" });
    }
  });

  app.get('/api/quotations/next-reference', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const nextReference = await storage.getNextQuotationReference(userId, req.isCompanyUser);
      res.json({ reference: nextReference });
    } catch (error) {
      console.error("Error getting next quotation reference:", error);
      res.status(500).json({ message: "Failed to get next quotation reference" });
    }
  });

  app.get('/api/quotations/:id', requireAuth, async (req: any, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.json(quotation);
    } catch (error) {
      console.error("Error fetching quotation:", error);
      res.status(500).json({ message: "Failed to fetch quotation" });
    }
  });

  app.post('/api/quotations', requireAuth, async (req: any, res) => {
    try {
      console.log("Creating quotation with data:", req.body);
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      // Convert date strings to Date objects
      const quotationData = {
        ...req.body,
        companyUserId: req.isCompanyUser ? userId : null,
        replitUserId: req.isCompanyUser ? null : userId,
        issueDate: new Date(req.body.issueDate),
        dueDate: new Date(req.body.dueDate),
        // Ensure items is an array
        items: req.body.items || [],
      };
      
      console.log("Processed quotation data:", quotationData);
      const quotation = await storage.createQuotation(quotationData);
      console.log("Created quotation:", quotation);
      res.json(quotation);
    } catch (error) {
      console.error("Error creating quotation:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to create quotation", error: error.message });
    }
  });

  app.put('/api/quotations/:id', requireAuth, async (req: any, res) => {
    try {
      const quotation = await storage.updateQuotation(req.params.id, req.body);
      res.json(quotation);
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(500).json({ message: "Failed to update quotation" });
    }
  });

  app.delete('/api/quotations/:id', requireAuth, async (req: any, res) => {
    try {
      await storage.deleteQuotation(req.params.id);
      res.json({ message: "Quotation deleted successfully" });
    } catch (error) {
      console.error("Error deleting quotation:", error);
      res.status(500).json({ message: "Failed to delete quotation" });
    }
  });

  // Get next quotation reference ID
  app.get('/api/quotations/next-reference', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const reference = await storage.getNextQuotationReference(userId, req.isCompanyUser);
      res.json({ reference });
    } catch (error) {
      console.error("Error getting next quotation reference:", error);
      res.status(500).json({ message: "Failed to get next quotation reference" });
    }
  });

  // Export quotation as PDF
  app.get('/api/quotations/:id/pdf', requireAuth, async (req: any, res) => {
    try {
      console.log("PDF request for quotation ID:", req.params.id);
      console.log("User authenticated:", req.isCompanyUser ? "Company User" : "Replit User");
      
      // Set response headers for better performance
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
      
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        console.log("Quotation not found for ID:", req.params.id);
        return res.status(404).json({ message: "Quotation not found" });
      }

      console.log("Quotation found:", quotation.referenceId);
      
      // Get customer details
      let customer = null;
      if (quotation.customerId) {
        try {
          customer = await storage.getCustomer(quotation.customerId);
          console.log("Customer found:", customer ? customer.customerName : "None");
        } catch (customerError) {
          console.error("Error fetching customer:", customerError);
          // Continue without customer details
        }
      }

      // Import jsPDF
      const jsPDF = (await import('jspdf')).jsPDF;
      const doc = new jsPDF();
      
      // Set font
      doc.setFont('helvetica');
      
      // Header
      doc.setFontSize(20);
      doc.text('QUOTATION', 105, 20, { align: 'center' });
      
      // Company info (placeholder - should come from settings)
      doc.setFontSize(12);
      doc.text('VoM Company', 20, 40);
      doc.text('Saudi Arabia', 20, 50);
      doc.text('Phone: +966123456789', 20, 60);
      doc.text('Email: info@vomcompany.com', 20, 70);
      
      // Quotation details
      doc.text(`Quotation #: ${quotation.referenceId}`, 120, 40);
      doc.text(`Date: ${new Date(quotation.issueDate).toLocaleDateString()}`, 120, 50);
      doc.text(`Due Date: ${new Date(quotation.dueDate).toLocaleDateString()}`, 120, 60);
      doc.text(`Status: ${quotation.status.toUpperCase()}`, 120, 70);
      
      // Customer details
      if (customer) {
        doc.setFontSize(14);
        doc.text('Bill To:', 20, 90);
        doc.setFontSize(12);
        doc.text(customer.customerName, 20, 100);
        if (customer.email) doc.text(`Email: ${customer.email}`, 20, 110);
        if (customer.phone) doc.text(`Phone: ${customer.phone}`, 20, 120);
        if (customer.city) doc.text(`City: ${customer.city}`, 20, 130);
      }
      
      // Items table header
      doc.setFontSize(12);
      doc.text('Items:', 20, 150);
      
      // Simple table without autoTable
      let yPosition = 160;
      const items = Array.isArray(quotation.items) ? quotation.items : [];
      
      // Table headers
      doc.setFontSize(10);
      doc.text('#', 20, yPosition);
      doc.text('Description', 30, yPosition);
      doc.text('Qty', 80, yPosition);
      doc.text('Unit Price', 100, yPosition);
      doc.text('Discount', 130, yPosition);
      doc.text('Amount', 160, yPosition);
      
      // Line under header
      doc.line(20, yPosition + 2, 180, yPosition + 2);
      yPosition += 10;
      
      // Table rows
      items.forEach((item: any, index: number) => {
        doc.text(`${index + 1}`, 20, yPosition);
        doc.text(item.description || item.productService || '', 30, yPosition);
        doc.text(`${item.qty || 0}`, 80, yPosition);
        doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, 100, yPosition);
        doc.text(`${(item.discountPercent || 0)}%`, 130, yPosition);
        doc.text(`$${(item.amount || 0).toFixed(2)}`, 160, yPosition);
        yPosition += 10;
      });
      
      // Line after items
      doc.line(20, yPosition, 180, yPosition);
      yPosition += 20;
      
      // Totals
      const subtotal = parseFloat(quotation.subtotal || '0');
      const discount = parseFloat(quotation.discount || '0');
      const vatAmount = parseFloat(quotation.vatAmount || '0');
      const total = parseFloat(quotation.totalAmount || '0');
      
      doc.setFontSize(12);
      doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 130, yPosition);
      doc.text(`Discount: $${discount.toFixed(2)}`, 130, yPosition + 10);
      doc.text(`VAT (${quotation.vatPercent || 15}%): $${vatAmount.toFixed(2)}`, 130, yPosition + 20);
      doc.setFontSize(14);
      doc.text(`Total: $${total.toFixed(2)}`, 130, yPosition + 35);
      
      // Check if we need a new page for additional content
      const checkPageBreak = () => {
        if (yPosition > 280) { // Near bottom of page
          doc.addPage();
          yPosition = 20;
        }
      };

      // Terms and conditions
      if (quotation.termsAndConditions) {
        yPosition += 60;
        checkPageBreak();
        doc.setFontSize(14);
        doc.text('Terms and Conditions:', 20, yPosition);
        yPosition += 10;
        doc.setFontSize(11);
        const terms = quotation.termsAndConditions.replace(/<[^>]*>/g, ''); // Strip HTML
        const splitTerms = doc.splitTextToSize(terms, 170);
        
        // Check if terms content will fit on current page
        if (yPosition + (splitTerms.length * 6) > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text('Terms and Conditions:', 20, yPosition);
          yPosition += 10;
          doc.setFontSize(11);
        }
        
        doc.text(splitTerms, 20, yPosition);
        yPosition += splitTerms.length * 6; // Adjust for text height
      }

      // Notes
      if (quotation.notes) {
        yPosition += 20;
        checkPageBreak();
        doc.setFontSize(14);
        doc.text('Notes:', 20, yPosition);
        yPosition += 10;
        doc.setFontSize(11);
        const notes = quotation.notes.replace(/<[^>]*>/g, ''); // Strip HTML
        const splitNotes = doc.splitTextToSize(notes, 170);
        
        // Check if notes content will fit on current page
        if (yPosition + (splitNotes.length * 6) > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(14);
          doc.text('Notes:', 20, yPosition);
          yPosition += 10;
          doc.setFontSize(11);
        }
        
        doc.text(splitNotes, 20, yPosition);
        yPosition += splitNotes.length * 6; // Adjust for text height
      }

      // Attachments (limited processing for better performance)
      if (quotation.attachments && quotation.attachments.length > 0) {
        console.log(`Processing ${quotation.attachments.length} attachments for quotation ${quotation.referenceId}`);
        yPosition += 20;
        checkPageBreak();
        doc.setFontSize(14);
        doc.text('Attachments:', 20, yPosition);
        yPosition += 10;
        
        // Process only first 3 attachments to improve performance
        const attachmentsToProcess = quotation.attachments.slice(0, 3);
        
        for (const attachment of attachmentsToProcess) {
          console.log(`Processing attachment:`, attachment.originalName, attachment.mimetype);
          
          if (yPosition > 200) { // More space needed for images
            doc.addPage();
            yPosition = 20;
          }
          
          // Check if it's an image file
          if (attachment.mimetype && attachment.mimetype.startsWith('image/')) {
            try {
              const imagePath = path.join(process.cwd(), 'uploads', attachment.filename);
              console.log(`Looking for image at:`, imagePath);
              
              if (fs.existsSync(imagePath)) {
                console.log(`Image found, adding to PDF`);
                // Add image to PDF
                const imageData = fs.readFileSync(imagePath);
                const imageBase64 = imageData.toString('base64');
                let imageFormat = attachment.mimetype.split('/')[1].toUpperCase();
                
                // Handle different image formats
                if (imageFormat === 'JPG') imageFormat = 'JPEG';
                if (!['JPEG', 'PNG', 'GIF'].includes(imageFormat)) {
                  imageFormat = 'JPEG'; // Default fallback
                }
                
                // Add image with proper dimensions
                const maxWidth = 160;
                const maxHeight = 80;
                
                doc.setFontSize(11);
                doc.text(`${attachment.originalName}:`, 20, yPosition);
                yPosition += 10;
                
                // Add the image
                doc.addImage(imageBase64, imageFormat, 20, yPosition, maxWidth, maxHeight);
                yPosition += maxHeight + 10;
                console.log(`Image added successfully`);
              } else {
                console.log(`Image file not found at:`, imagePath);
                // Fallback to filename if image file not found
                doc.setFontSize(11);
                const sizeInKB = (attachment.size / 1024).toFixed(1);
                doc.text(`${attachment.originalName} (${sizeInKB} KB) - Image not found`, 20, yPosition);
                yPosition += 8;
              }
            } catch (error) {
              console.error('Error adding image to PDF:', error);
              // Fallback to filename if image processing fails
              doc.setFontSize(11);
              const sizeInKB = (attachment.size / 1024).toFixed(1);
              doc.text(`${attachment.originalName} (${sizeInKB} KB) - Error loading image`, 20, yPosition);
              yPosition += 8;
            }
          } else {
            // Non-image files, just show filename
            console.log(`Non-image file, showing filename only`);
            doc.setFontSize(11);
            const sizeInKB = (attachment.size / 1024).toFixed(1);
            doc.text(`${attachment.originalName} (${sizeInKB} KB)`, 20, yPosition);
            yPosition += 8;
          }
        }
      } else {
        console.log(`No attachments found for quotation ${quotation.referenceId}`);
      }
      
      // Generate PDF buffer
      const pdfBuffer = doc.output('arraybuffer');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="quotation-${quotation.referenceId}.pdf"`);
      res.send(Buffer.from(pdfBuffer));
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error message:", error?.message);
      res.status(500).json({ message: "Failed to generate PDF", error: error?.message || "Unknown error" });
    }
  });

  // Proforma Invoice routes
  app.get('/api/proforma-invoices', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const proformaInvoices = await storage.getProformaInvoices(userId, req.isCompanyUser);
      res.json(proformaInvoices);
    } catch (error) {
      console.error("Error fetching proforma invoices:", error);
      res.status(500).json({ message: "Failed to fetch proforma invoices" });
    }
  });

  app.get('/api/proforma-invoices/next-reference', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const nextReference = await storage.getNextProformaInvoiceReference(userId, req.isCompanyUser);
      res.json({ reference: nextReference });
    } catch (error) {
      console.error("Error getting next proforma invoice reference:", error);
      res.status(500).json({ message: "Failed to get next proforma invoice reference" });
    }
  });

  app.get('/api/proforma-invoices/:id', requireAuth, async (req: any, res) => {
    try {
      const proformaInvoice = await storage.getProformaInvoice(req.params.id);
      if (!proformaInvoice) {
        return res.status(404).json({ message: "Proforma invoice not found" });
      }
      res.json(proformaInvoice);
    } catch (error) {
      console.error("Error fetching proforma invoice:", error);
      res.status(500).json({ message: "Failed to fetch proforma invoice" });
    }
  });

  app.post('/api/proforma-invoices', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const proformaInvoiceData = {
        ...req.body,
        companyUserId: req.isCompanyUser ? userId : null,
        replitUserId: req.isCompanyUser ? null : userId,
        // Ensure the date is properly converted to Date object
        issueDate: new Date(req.body.issueDate),
      };
      
      const proformaInvoice = await storage.createProformaInvoice(proformaInvoiceData);
      res.json(proformaInvoice);
    } catch (error) {
      console.error("Error creating proforma invoice:", error);
      res.status(500).json({ message: "Failed to create proforma invoice" });
    }
  });

  app.put('/api/proforma-invoices/:id', requireAuth, async (req: any, res) => {
    try {
      const proformaInvoiceData = {
        ...req.body,
        // Ensure dates are properly converted to Date objects
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      
      const proformaInvoice = await storage.updateProformaInvoice(req.params.id, proformaInvoiceData);
      res.json(proformaInvoice);
    } catch (error) {
      console.error("Error updating proforma invoice:", error);
      res.status(500).json({ message: "Failed to update proforma invoice" });
    }
  });

  app.delete('/api/proforma-invoices/:id', requireAuth, async (req: any, res) => {
    try {
      await storage.deleteProformaInvoice(req.params.id);
      res.json({ message: "Proforma invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting proforma invoice:", error);
      res.status(500).json({ message: "Failed to delete proforma invoice" });
    }
  });

  app.get('/api/proforma-invoices/:id/print', requireAuth, async (req: any, res) => {
    try {
      const proformaInvoice = await storage.getProformaInvoice(req.params.id);
      if (!proformaInvoice) {
        return res.status(404).json({ message: "Proforma invoice not found" });
      }

      // Get customer details
      const customer = await storage.getCustomer(proformaInvoice.customerId);
      
      // Get products for item descriptions
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const products = await storage.getProducts(userId, req.isCompanyUser);
      const productMap = new Map(products.map(p => [p.id, p]));
      
      // Debug logging
      console.log('Total products loaded:', products.length);
      console.log('Looking for product IDs in items:', proformaInvoice.items.map((item: any) => item.productService));
      console.log('Product map keys:', Array.from(productMap.keys()));
      
      // Import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).jsPDF;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      
      // Company Header
      doc.setFontSize(18);
      doc.text('Proforma Invoice', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('Name: Second Support for General Cont. Est', 20, 35);
      doc.text('Vat Registration Number: 310183997800003', 20, 45);
      doc.text('Address: P.O. Box 2017 – Al-Jubail 31951 King Khaled Bin', 20, 55);
      doc.text('Abdulaziz St, Kingdom of Saudi Arabia', 20, 65);
      doc.text('Commercial number: 2055133472', 20, 75);

      // Proforma Invoice and Customer Information
      doc.setFontSize(10);
      doc.text('Reference ID:', 20, 95);
      doc.text(proformaInvoice.referenceId, 70, 95);
      doc.text('Customer:', 120, 95);
      doc.text(customer?.customerName || 'Unknown Customer', 150, 95);

      doc.text('Description:', 20, 105);
      doc.text(proformaInvoice.description || '', 70, 105);

      doc.text('Issue Date:', 20, 115);
      doc.text(new Date(proformaInvoice.issueDate).toLocaleDateString(), 70, 115);
      doc.text('Phone:', 120, 115);
      doc.text(customer?.phone || '', 150, 115);

      if (proformaInvoice.dueDate) {
        doc.text('Due Date:', 20, 125);
        doc.text(new Date(proformaInvoice.dueDate).toLocaleDateString(), 70, 125);
      }

      // Items Table
      const items = proformaInvoice.items || [];
      const tableData = items.map((item: any) => {
        const product = productMap.get(item.productService);
        if (!product) {
          console.log(`Product not found for ID: ${item.productService}`);
        }
        const productName = product?.nameEnglish || 'Unknown Product';
        
        return [
          productName,
          item.qty || 0,
          parseFloat(item.unitPrice || '0').toFixed(2),
          `${item.discountPercent || 0}%`,
          `${item.vatPercent || 15}%`,
          parseFloat(item.vatValue || '0').toFixed(2),
          parseFloat(item.amount || '0').toFixed(2)
        ];
      });

      autoTable(doc, {
        head: [['Product', 'Qty', 'Unit Price', 'Discount %', 'Vat %', 'Vat Value', 'Amount']],
        body: tableData,
        startY: 140,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [20, 184, 166],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      // Totals
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFont('helvetica', 'bold');
      doc.text('Gross:', 140, finalY);
      doc.setFont('helvetica', 'normal');
      doc.text(parseFloat(proformaInvoice.subtotal || '0').toFixed(2), 180, finalY);

      doc.setFont('helvetica', 'bold');
      doc.text('Total Vat:', 140, finalY + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(parseFloat(proformaInvoice.vatAmount || '0').toFixed(2), 180, finalY + 10);

      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount:', 140, finalY + 20);
      doc.setFont('helvetica', 'normal');
      doc.text(parseFloat(proformaInvoice.totalAmount || '0').toFixed(2), 180, finalY + 20);

      // Payment Information
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Information:', 20, finalY + 40);
      doc.setFont('helvetica', 'normal');
      doc.text('Bank Name: SNB', 20, finalY + 50);
      doc.text('Account Name: Second Support For General Contracting', 20, finalY + 60);
      doc.text('IBAN: SA2410000001700000253107', 20, finalY + 70);

      // Terms and Conditions
      let currentY = finalY + 90;
      if (proformaInvoice.termsAndConditions && proformaInvoice.termsAndConditions.trim()) {
        // Check if we need a new page
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text('Terms and Conditions', 20, currentY);
        doc.setFont('helvetica', 'normal');
        // Remove HTML tags and clean up text
        const termsText = proformaInvoice.termsAndConditions
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim(); // Remove leading/trailing spaces
        
        if (termsText) {
          const termsLines = doc.splitTextToSize(termsText, 170);
          doc.text(termsLines, 20, currentY + 10);
          currentY += 10 + (termsLines.length * 7);
        }
      }

      // Notes
      if (proformaInvoice.notes && proformaInvoice.notes.trim()) {
        currentY += 15;
        
        // Check if we need a new page
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text('Notes', 20, currentY);
        doc.setFont('helvetica', 'normal');
        // Remove HTML tags and clean up text
        const notesText = proformaInvoice.notes
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim(); // Remove leading/trailing spaces
        
        if (notesText) {
          const notesLines = doc.splitTextToSize(notesText, 170);
          doc.text(notesLines, 20, currentY + 10);
          currentY += 10 + (notesLines.length * 7);
        }
      }

      // Attachments
      const attachments = proformaInvoice.attachments || [];
      if (attachments.length > 0) {
        currentY += 15;
        
        // Check if we need a new page
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text('Attachments', 20, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 10;

        for (const attachment of attachments) {
          try {
            // Check if attachment is an image
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
            const isImage = imageExtensions.some(ext => 
              attachment.filename.toLowerCase().endsWith(ext) || 
              attachment.originalName.toLowerCase().endsWith(ext)
            );

            if (isImage) {
              // Try to load and embed the image
              const imagePath = path.join(process.cwd(), attachment.path);
              
              if (fs.existsSync(imagePath)) {
                const imageData = fs.readFileSync(imagePath);
                const base64Image = imageData.toString('base64');
                const imageFormat = attachment.filename.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
                
                // Check if we need a new page for the image
                if (currentY + 60 > 280) {
                  doc.addPage();
                  currentY = 20;
                }
                
                // Add image with a maximum size
                doc.addImage(`data:image/${imageFormat.toLowerCase()};base64,${base64Image}`, imageFormat, 20, currentY, 50, 50);
                doc.text(attachment.originalName, 80, currentY + 25);
                currentY += 60;
              } else {
                // File not found, just list the filename
                doc.text(`• ${attachment.originalName} (file not found)`, 25, currentY);
                currentY += 7;
              }
            } else {
              // Non-image attachment, just list the filename
              doc.text(`• ${attachment.originalName}`, 25, currentY);
              currentY += 7;
            }
          } catch (error) {
            console.error(`Error processing attachment ${attachment.originalName}:`, error);
            doc.text(`• ${attachment.originalName} (error loading)`, 25, currentY);
            currentY += 7;
          }
        }
      }
      
      // Generate PDF buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="proforma-invoice-${proformaInvoice.referenceId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send the PDF
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating proforma invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate proforma invoice PDF" });
    }
  });

  // Initialize sample proforma invoices
  app.post('/api/init-sample-proforma-invoices', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      // Get customers for the user
      const customers = await storage.getCustomers(userId, req.isCompanyUser);
      if (customers.length === 0) {
        return res.status(400).json({ message: "No customers found. Please create customers first." });
      }

      const sampleProformaInvoices = [
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          referenceId: "PROFORMA0001",
          customerId: customers[0].id,
          description: "YES YES TECHNICAL SERVICES CO LTD شركة يسس يسس للخدمات التقنية المحدودة",
          issueDate: new Date("2023-10-19"),
          items: [
            {
              product: "Technical Consulting",
              qty: 10,
              unitPrice: "91.30",
              vatPercent: "15",
              vatValue: "136.95", 
              amount: "913.00"
            }
          ],
          subtotal: "913.00",
          discount: "0.00",
          discountPercent: "0.00",
          vatAmount: "136.95",
          vatPercent: "15.00",
          totalAmount: "1049.95",
          status: "sent",
        },
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          referenceId: "PROFORMA0002",
          customerId: customers[Math.min(1, customers.length - 1)].id,
          description: "Lac Systems Saudi Arabia Company شركة لاك سيستمز السعودية المحدودة",
          issueDate: new Date("2023-10-19"),
          items: [
            {
              product: "Software License",
              qty: 5,
              unitPrice: "549.78",
              vatPercent: "15",
              vatValue: "412.34",
              amount: "2748.90"
            }
          ],
          subtotal: "2748.90",
          discount: "0.00",
          discountPercent: "0.00",
          vatAmount: "412.34",
          vatPercent: "15.00",
          totalAmount: "3161.24",
          status: "draft",
        },
        {
          id: nanoid(),
          companyUserId: req.isCompanyUser ? userId : null,
          replitUserId: req.isCompanyUser ? null : userId,
          referenceId: "PROFORMA0003",
          customerId: customers[Math.min(2, customers.length - 1)].id,
          description: "Lac Systems Saudi Arabia Company شركة لاك سيستمز السعودية المحدودة",
          issueDate: new Date("2023-10-27"),
          items: [
            {
              product: "Support Services", 
              qty: 12,
              unitPrice: "156.25",
              vatPercent: "15",
              vatValue: "281.25",
              amount: "1875.00"
            }
          ],
          subtotal: "1875.00",
          discount: "0.00",
          discountPercent: "0.00",
          vatAmount: "281.25",
          vatPercent: "15.00",
          totalAmount: "2156.25",
          status: "accepted",
        }
      ];

      for (const proformaInvoiceData of sampleProformaInvoices) {
        await storage.createProformaInvoice(proformaInvoiceData as InsertProformaInvoice);
      }
      
      res.json({ message: "Sample proforma invoices initialized successfully", count: sampleProformaInvoices.length });
    } catch (error) {
      console.error("Error initializing sample proforma invoices:", error);
      res.status(500).json({ message: "Failed to initialize sample proforma invoices" });
    }
  });

  // Invoice CRUD routes
  app.get('/api/invoices', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const invoices = await storage.getInvoices(userId, req.isCompanyUser);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get('/api/invoices/next-reference', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const reference = await storage.getNextInvoiceReference(userId, req.isCompanyUser);
      res.json({ reference });
    } catch (error) {
      console.error("Error getting next invoice reference:", error);
      res.status(500).json({ message: "Failed to get next reference" });
    }
  });

  app.get('/api/invoices/:id', requireAuth, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post('/api/invoices', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      const invoiceData: InsertInvoice = {
        id: nanoid(),
        companyUserId: req.isCompanyUser ? userId : null,
        replitUserId: req.isCompanyUser ? null : userId,
        ...req.body,
      };

      const result = insertInvoiceSchema.safeParse(invoiceData);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.issues 
        });
      }

      const invoice = await storage.createInvoice(result.data);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.put('/api/invoices/:id', requireAuth, async (req: any, res) => {
    try {
      const result = insertInvoiceSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.issues 
        });
      }

      const invoice = await storage.updateInvoice(req.params.id, result.data);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete('/api/invoices/:id', requireAuth, async (req: any, res) => {
    try {
      await storage.deleteInvoice(req.params.id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Settings routes
  app.post('/api/settings/general', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      // Here you would save the settings to database
      // For now, we'll just return success
      const settingsData = {
        userId,
        isCompanyUser: req.isCompanyUser,
        ...req.body,
        updatedAt: new Date()
      };
      
      console.log("Saving general settings:", settingsData);
      
      res.json({ 
        message: "General settings saved successfully",
        data: settingsData
      });
    } catch (error) {
      console.error("Error saving general settings:", error);
      res.status(500).json({ message: "Failed to save general settings" });
    }
  });

  app.get('/api/settings/general', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      // Return default settings for now
      const defaultSettings = {
        companyNameArabic: "مؤسسة السيارة الثانية للمقاولات العامة",
        companyNameEnglish: "Second Support for General Cont. Est",
        vatName: "",
        vatNumber: "310183597800003",
        address: "P.O. Box 2017 - Al-Jubayl 31951 King Khalid IBn Abdulaziz St, Kingdom of Saudi Arabia",
        mobile: "530155514",
        country: "Saudi Arabia",
        language: "English",
        commercialNumber: "2055115472"
      };
      
      res.json(defaultSettings);
    } catch (error) {
      console.error("Error fetching general settings:", error);
      res.status(500).json({ message: "Failed to fetch general settings" });
    }
  });

  // Accounting settings routes
  app.post('/api/settings/accounting', requireAuth, async (req: any, res) => {
    try {
      await db.insert(accountingSettings).values({
        id: 'default',
        ...req.body,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: accountingSettings.id,
        set: {
          ...req.body,
          updatedAt: new Date()
        }
      });
      
      res.json({ 
        message: "Accounting settings saved successfully"
      });
    } catch (error) {
      console.error("Error saving accounting settings:", error);
      res.status(500).json({ message: "Failed to save accounting settings" });
    }
  });

  app.get('/api/settings/accounting', requireAuth, async (req: any, res) => {
    try {
      const result = await db.select().from(accountingSettings).where(eq(accountingSettings.id, 'default')).limit(1);
      const settings = result[0] || {
        yearStartMonth: "January",
        yearStartDay: "1",
        defaultTaxRate: "Vat 15%",
        booksClosing: false,
        inventorySystem: "Periodic",
        closingDate: "2025-06-30",
        enableRetention: false
      };
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching accounting settings:", error);
      res.status(500).json({ message: "Failed to fetch accounting settings" });
    }
  });

  // Product routes
  app.get('/api/products', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const products = await storage.getProducts(userId, req.isCompanyUser);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      const productData: InsertProduct = {
        ...insertProductSchema.parse(req.body),
        companyUserId: req.isCompanyUser ? userId : null,
        replitUserId: req.isCompanyUser ? null : userId,
      };

      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      
      // Check if it's a duplicate product ID error
      if (error.code === '23505' && error.constraint === 'products_product_id_key') {
        return res.status(400).json({ 
          message: "Product ID already exists. Please use a different ID.",
          field: "productId"
        });
      }
      
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.put('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      
      // Check if it's a duplicate product ID error
      if (error.code === '23505' && error.constraint === 'products_product_id_key') {
        return res.status(400).json({ 
          message: "Product ID already exists. Please use a different ID.",
          field: "productId"
        });
      }
      
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Product export routes
  app.get('/api/products/export/pdf', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const products = await storage.getProducts(userId, req.isCompanyUser);
      
      // Use imported jsPDF
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Products List', 20, 20);
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
      
      // Prepare table data
      const tableData = products.map(product => [
        product.productId || '',
        product.nameEnglish || '',
        product.category || '',
        product.type || '',
        product.quantity?.toString() || '0',
        product.buyingPrice || '0',
        product.sellingPrice || '0',
        product.tax || ''
      ]);
      
      // Add table using autoTable
      autoTable(doc, {
        head: [['ID', 'Name', 'Category', 'Type', 'QTY', 'Buying Price', 'Selling Price', 'Tax']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [52, 168, 83] },
        margin: { top: 20 }
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="products.pdf"');
      
      // Send PDF
      const pdfOutput = doc.output('arraybuffer');
      res.send(Buffer.from(pdfOutput));
      
    } catch (error) {
      console.error("Error exporting PDF:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  app.get('/api/products/export/excel', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const products = await storage.getProducts(userId, req.isCompanyUser);
      
      // Use imported XLSX
      
      // Prepare data for Excel
      const excelData = products.map(product => ({
        'Product ID': product.productId || '',
        'Name (English)': product.nameEnglish || '',
        'Name (Arabic)': product.nameArabic || '',
        'Category': product.category || '',
        'Type': product.type || '',
        'Quantity': product.quantity || 0,
        'Unit': product.unit || '',
        'Buying Price': product.buyingPrice || '0',
        'Selling Price': product.sellingPrice || '0',
        'Tax': product.tax || '',
        'Barcode': product.barcode || '',
        'Description': product.description || '',
        'Warehouse': product.warehouse || '',
        'Sales Account': product.salesAccount || '',
        'Purchases Account': product.purchasesAccount || '',
        'Inventory Item': product.inventoryItem ? 'Yes' : 'No',
        'Selling Product': product.sellingProduct ? 'Yes' : 'No',
        'Buying Product': product.buyingProduct ? 'Yes' : 'No',
        'Allow Notification': product.allowNotification ? 'Yes' : 'No',
        'Minimum Quantity': product.minimumQuantity || 0,
        'Created At': product.createdAt || '',
        'Updated At': product.updatedAt || ''
      }));
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="products.xlsx"');
      
      // Send Excel file
      res.send(excelBuffer);
      
    } catch (error) {
      console.error("Error exporting Excel:", error);
      res.status(500).json({ message: "Failed to export Excel" });
    }
  });

  app.post('/api/products/import', requireAuth, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Use imported XLSX
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      let imported = 0;
      let errors = [];
      
      for (const row of data) {
        try {
          // Get next product ID
          const nextProductId = await storage.getNextProductId(userId, req.isCompanyUser);
          
          const productData: InsertProduct = {
            productId: nextProductId,
            nameEnglish: row['Name (English)'] || row['Name'] || '',
            nameArabic: row['Name (Arabic)'] || '',
            category: row['Category'] || 'Default Category',
            type: row['Type'] || 'product',
            quantity: parseInt(row['Quantity']) || 0,
            unit: row['Unit'] || '',
            buyingPrice: row['Buying Price'] || '0',
            sellingPrice: row['Selling Price'] || '0',
            tax: row['Tax'] || 'Vat 15%',
            barcode: row['Barcode'] || '',
            description: row['Description'] || '',
            warehouse: row['Warehouse'] || 'Warehouse',
            salesAccount: row['Sales Account'] || 'Sales',
            purchasesAccount: row['Purchases Account'] || 'Purchases',
            inventoryItem: row['Inventory Item'] === 'Yes' || true,
            sellingProduct: row['Selling Product'] === 'Yes' || true,
            buyingProduct: row['Buying Product'] === 'Yes' || true,
            allowNotification: row['Allow Notification'] === 'Yes' || false,
            minimumQuantity: parseInt(row['Minimum Quantity']) || 0,
            companyUserId: req.isCompanyUser ? userId : null,
            replitUserId: req.isCompanyUser ? null : userId,
          };
          
          await storage.createProduct(productData);
          imported++;
        } catch (error) {
          errors.push(`Row ${data.indexOf(row) + 1}: ${error.message}`);
        }
      }
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json({ 
        message: `Successfully imported ${imported} products`,
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ message: "Failed to import products" });
    }
  });

  // Unit routes
  app.get('/api/units', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      const units = await storage.getUnits(userId, req.isCompanyUser);
      
      // Add product count for each unit
      const unitsWithProductCount = await Promise.all(
        units.map(async (unit) => {
          const productCount = await storage.getProductCountByUnit(unit.name, userId, req.isCompanyUser);
          return {
            ...unit,
            productCount
          };
        })
      );
      
      res.json(unitsWithProductCount);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ message: "Failed to fetch units" });
    }
  });

  app.get('/api/units/:id', requireAuth, async (req, res) => {
    try {
      const unit = await storage.getUnit(req.params.id);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      console.error("Error fetching unit:", error);
      res.status(500).json({ message: "Failed to fetch unit" });
    }
  });

  app.post('/api/units', requireAuth, async (req: any, res) => {
    try {
      const userId = req.isCompanyUser ? req.currentUser.id : req.currentUser.claims.sub;
      
      const unitData: InsertUnit = {
        ...insertUnitSchema.parse(req.body),
        companyUserId: req.isCompanyUser ? userId : null,
        replitUserId: req.isCompanyUser ? null : userId,
      };

      const unit = await storage.createUnit(unitData);
      res.status(201).json(unit);
    } catch (error) {
      console.error("Error creating unit:", error);
      res.status(500).json({ message: "Failed to create unit" });
    }
  });

  app.patch('/api/units/:id', requireAuth, async (req, res) => {
    try {
      const unitData = insertUnitSchema.partial().parse(req.body);
      const unit = await storage.updateUnit(req.params.id, unitData);
      res.json(unit);
    } catch (error) {
      console.error("Error updating unit:", error);
      res.status(500).json({ message: "Failed to update unit" });
    }
  });

  app.delete('/api/units/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteUnit(req.params.id);
      res.json({ message: "Unit deleted successfully" });
    } catch (error) {
      console.error("Error deleting unit:", error);
      res.status(500).json({ message: "Failed to delete unit" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateQRCode(invoiceData: any): string {
  // TODO: Implement ZATCA-compliant QR code generation
  // This should generate a QR code with invoice details for ZATCA compliance
  return `QR-${nanoid()}`;
}
