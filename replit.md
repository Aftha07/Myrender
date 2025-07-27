# replit.md

## Overview

This is a full-stack web application built with React (frontend) and Express.js (backend), featuring a comprehensive Second Support accounting platform. The application supports dual authentication systems - both Replit OAuth and company-specific user login - and provides a complete financial management solution with ZATCA compliance for Saudi Arabian businesses.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Components**: Shadcn/ui components built on Radix UI primitives with "new-york" style
- **Styling**: Tailwind CSS with CSS custom properties for theming and dark mode support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation and @hookform/resolvers
- **Internationalization**: Custom i18n system supporting English and Arabic with RTL layout

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Dual authentication system:
  - Replit OAuth (OpenID Connect) for platform integration
  - Company user authentication with bcrypt password hashing
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **Security**: reCAPTCHA integration for bot protection (currently mocked for demo)

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect using @neondatabase/serverless
- **Schema Location**: `shared/schema.ts` for type sharing between frontend and backend
- **Key Tables**:
  - `sessions`: Required for session storage (Replit Auth compliance)
  - `users`: Replit OAuth users (mandatory for Replit Auth)
  - `company_users`: Company-specific user accounts with authentication
  - `invoices`: Invoice management with ZATCA compliance features
  - `expenses`: Expense tracking and categorization

## Key Components

### Authentication System
The application implements a sophisticated dual authentication approach:

1. **Replit OAuth**: Full OpenID Connect integration using `openid-client` and Passport.js
2. **Company Authentication**: Traditional email/password system with secure password hashing

**Rationale**: This design allows seamless integration with the Replit platform while supporting external company users, providing maximum flexibility for different deployment scenarios.

### UI Component System
- **Design System**: Shadcn/ui with comprehensive component library
- **Theme Configuration**: Neutral color palette with CSS custom properties
- **Accessibility**: WCAG-compliant components built on Radix UI primitives
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Internationalization**: Full RTL support for Arabic language

### Financial Management Features
- **Invoice Management**: Create, track, and manage invoices with ZATCA compliance
- **Expense Tracking**: Categorize and monitor business expenses
- **Dashboard Analytics**: Financial overview with key performance indicators
- **ZATCA Integration**: Saudi Arabian tax authority compliance features
- **Multi-language Support**: English and Arabic with automatic text direction

## Data Flow

### Authentication Flow
1. **Replit OAuth**: Standard OpenID Connect flow with session management
2. **Company Login**: Email/password validation with bcrypt comparison
3. **Session Storage**: PostgreSQL-backed sessions with configurable TTL

### API Architecture
- **REST Endpoints**: Express routes with TypeScript type safety
- **Error Handling**: Centralized error handling with appropriate HTTP status codes
- **Data Validation**: Zod schemas shared between frontend and backend
- **Query Management**: TanStack Query for efficient data fetching and caching

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL via Neon serverless (@neondatabase/serverless)
- **Authentication**: OpenID Connect (openid-client, passport)
- **Security**: bcrypt for password hashing, reCAPTCHA for bot protection
- **Session Storage**: connect-pg-simple for PostgreSQL session management
- **Validation**: Zod for schema validation across the stack

### Development Tools
- **Build Tools**: Vite with React plugin and TypeScript support
- **Code Quality**: ESBuild for production builds
- **Development**: TSX for TypeScript execution, Replit-specific plugins
- **Database**: Drizzle Kit for schema management and migrations

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **TypeScript**: Incremental compilation with path mapping
- **Database**: Drizzle push for schema synchronization

### Production Build
- **Frontend**: Vite build to `dist/public` directory
- **Backend**: ESBuild bundle to `dist/index.js`
- **Static Assets**: Served via Express static middleware
- **Environment**: NODE_ENV-based configuration

### Replit Integration
- **Development Banner**: Automatic Replit development banner injection
- **Cartographer Plugin**: Development-only Replit tooling integration
- **Runtime Error Overlay**: Enhanced error reporting for development

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Session encryption key (required)
- `REPL_ID`: Replit application identifier
- `ISSUER_URL`: OpenID Connect issuer (defaults to Replit)
- `REPLIT_DOMAINS`: Allowed Replit domains

## Changelog

```
Changelog:
- July 27, 2025. Successfully migrated project from Replit Agent to Replit environment
  - Fixed database configuration and connectivity issues
  - Resolved session management by adding fallback SESSION_SECRET
  - Updated security settings for development environment
  - Verified all core features working: authentication, database operations, UI components
  - Application now running successfully on port 5000 with full functionality
- July 27, 2025. Prepared project for Railway deployment with production optimizations
  - Added CORS support with production-ready configuration
  - Enhanced security headers for production environment
  - Updated session configuration for Railway PostgreSQL integration
  - Created comprehensive Railway deployment guide (README-RAILWAY.md)
  - Added health check endpoint (/health) for Railway monitoring
  - Configured build process for production deployment
  - Enhanced error handling with production-safe error messages
  - Added environment variable support for Railway's auto-generated values
  - Created nixpacks.toml and railway.json for optimized deployment
  - Updated database connection to support Railway's PostgreSQL service
- June 29, 2025. Initial setup
- July 14, 2025. Enhanced quotation system with full product database integration
  - Fixed product dropdown to display actual product names instead of system IDs
  - Improved dropdown layout with cleaner product selection interface
  - Made all table columns fully editable with proper placeholders
  - Added real-time calculations for VAT, discounts, and totals
  - Connected quotation system to Products/Services database
  - Enhanced input field behavior with auto-select and removed spinner buttons
  - Applied same improvements to Create Proforma Invoice page
  - Fixed null value handling in calculated fields
  - Optimized proforma invoice performance with:
    - Removed unnecessary totals section from right sidebar
    - Removed Terms & Conditions, Notes, and Attachments sections  
    - Added query caching (5 minutes stale time) for customers and products
    - Debounced calculations (100ms delay) for better performance
    - Cleaned up unused imports and state variables
    - Moved Save button to header and removed bottom buttons
    - Streamlined interface for faster loading and creation
    - Enhanced performance optimizations for faster page loading:
      - Extended cache times to 10 minutes for customers/products
      - Added 15-minute cache time for better data persistence
      - Disabled refetchOnWindowFocus for faster interactions
      - Memoized expensive functions with useCallback
      - Increased debounce timing to 300ms for better performance
      - Added performance-focused React optimizations
    - Critical database performance improvements:
      - Added database indexes on frequently queried columns (company_user_id, replit_user_id, created_at)
      - Implemented proper query optimization for customers and products tables
      - Added data prefetching on list pages for instant navigation
      - Implemented proper loading states with skeleton UI
      - Memoized dropdown options to prevent unnecessary re-renders
      - Added infinite caching for relatively static data (customers/products)
      - Optimized component rendering with Suspense-like patterns
    - Advanced performance optimizations for proforma invoice list:
      - Implemented 5-minute server-side caching with automatic invalidation
      - Added 15-minute client-side caching with disabled window focus refetch
      - Optimized database queries with selective field loading (reduced data transfer)
      - Added result limits (100 records) to prevent excessive data loading
      - Implemented React performance patterns: useCallback, useMemo for expensive operations
      - Added client-side caching headers for better browser performance
      - Memoized filtered data and pagination to prevent unnecessary recalculations
- July 16, 2025. Enhanced proforma invoice system with comprehensive export functionality
  - Replaced Copy, Export, Print buttons with Download Excel, Download PDF, and Print buttons
  - Added Excel export functionality using XLSX library for proforma invoice lists
  - Added PDF download functionality using jsPDF and autoTable for summary reports
  - Enhanced print functionality to generate detailed individual proforma invoices
  - Print now creates complete invoices with company header, customer details, itemized products, totals, payment info, and terms
  - Fixed Arabic currency symbol display issues in PDF exports
  - Added separate formatAmountForPDF function for clean numeric display in exports
  - Implemented comprehensive proforma invoice printing matching quotation system functionality
  - Fixed critical database query issue: Added termsAndConditions, notes, and attachments fields to getProformaInvoices() API endpoint
  - Resolved data retrieval problem where terms, notes, and attachments were stored in database but not returned by API
  - Print function now correctly displays all proforma invoice details including terms, conditions, notes, and attachments
  - Enhanced quotation list print functionality with same comprehensive features as proforma invoices:
    - Added detailed individual quotation printing with complete company header, customer details, itemized products, and totals
    - Implemented proper HTML tag removal and text cleanup for terms and conditions and notes
    - Added image embedding capability for attachment display in PDFs (shows actual images instead of filenames)
    - Enhanced PDF formatting with proper spacing, page breaks, and error handling
    - Added loadImageAsBase64 helper function for converting images to base64 for PDF embedding
- July 17, 2025. Enhanced proforma invoice list functionality to match quotation system behavior:
  - Updated handleView function to directly navigate to view page without try-catch wrapper
  - Updated handleEdit function to directly navigate to edit page without try-catch wrapper
  - Enhanced handlePrint function to match quotation print behavior with immediate feedback and fallback options
  - Added referenceId parameter to handlePrint function for better user feedback
  - Enhanced handleDelete function to show confirmation dialog with referenceId reference
  - Updated all action button calls to include referenceId parameter for consistency
  - Completely redesigned ProformaInvoiceView.tsx to match QuotationView.tsx layout with:
    - Comprehensive header with VoM branding and action buttons
    - Two-column layout with main content and sidebar
    - Complete proforma invoice details display
    - Detailed items table with all product information
    - Terms and conditions, notes, and attachments sections
    - Customer details sidebar with full contact information
    - Financial summary with proper formatting and totals
    - Consistent styling and behavior with quotation system
  - Fixed critical data display issues in both quotation and proforma invoice views:
    - Enhanced getProformaInvoice database method to include customer details with proper joins
    - Added missing dueDate field to proforma_invoices table schema and database
    - Fixed Product/Service column to display actual product names instead of system IDs
    - Updated product name lookup to use nameEnglish field from products table
    - Enhanced attachment display to show actual images instead of filename text
    - Added proper image preview functionality with responsive sizing
    - Applied consistent improvements to both QuotationView and ProformaInvoiceView
  - Enhanced Create Tax Invoice page with advanced features:
    - Added product dropdown selection showing all existing products from database
    - Implemented automatic unit price population from product's selling price
    - Added real-time VAT and amount calculations based on quantity and unit price
    - Integrated Clear All button to reset all product items
    - Enhanced file attachment functionality with image preview support
    - Files now display with thumbnails for images or document icons for other files
    - Added remove functionality for each attached file
    - Removed bottom Cancel and Create Invoice buttons for cleaner interface
    - Changed Save Draft button to Save with proper form submission
    - Fixed API request parameter order issue (method, url, data)
    - Added proper handling for productService field mapping
    - Save functionality now stores invoice data with attached file names
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```