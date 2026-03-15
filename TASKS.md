# Gran Kush Project Tasks

## Phase 1: Project Setup & Infrastructure ✅ (Completed)

### 1.1 OpenAPI Code Generation Setup ✅
- [x] Create `packages/api-client` package
- [x] Configure OpenAPI TypeScript code generator
- [x] Add JSON endpoint to Swagger config (`/docs-json`)
- [x] Update API main.ts to initialize Swagger
- [ ] Test API client generation
- [ ] Add generation script to root package.json

### 1.2 Frontend Dependencies Setup ✅
- [x] Install TanStack Query (@tanstack/react-query)
- [x] Install axios for API calls
- [x] Add @workspace/api-client dependency
- [x] Configure QueryClient in providers
- [ ] Create API client configuration (base URL, interceptors)

### 1.3 UI Components & Theming ✅
- [x] Verify shadcn/ui is installed in packages/ui
- [x] Add theme toggle component
- [x] Add navigation components (Header, Footer)
- [ ] Add form components (Input, Select, Checkbox, FileUpload)
- [ ] Add signature canvas component
- [x] Test light/dark theme switching

## Phase 2: Core Frontend Pages ✅ (Completed)

### 2.1 Home Page ✅
- [x] Create hero section with:
  - Large hero image/background
  - Main headline and CTA button
  - Link to login/register
- [x] Create "About Us" section:
  - Company information
  - Mission/vision
  - Key features
- [x] Create "Contacts" section:
  - Contact information
  - Map (optional)
  - Contact form (optional)
- [x] Add navigation header with:
  - Logo
  - Menu items (Home, About, Contacts, Login)
  - Theme toggle
  - User menu (when authenticated)
- [x] Add footer with:
  - Links
  - Copyright information
  - Social media links (optional)

### 2.2 Authentication Pages ✅
- [x] Create `/login` page:
  - Email/password form
  - "Forgot password" link
  - "Register" link
  - Error handling
  - Integration with API (TODO: connect to actual API)
- [x] Create `/register` page:
  - Basic registration form
  - Email validation
  - Password strength indicator
  - Terms & conditions checkbox
  - Link to login
- [x] Create `/confirm-email` page:
  - Email confirmation form
  - Resend confirmation email option
  - Success/error states
- [x] Create `/lk` (Personal Cabinet) page:
  - Dashboard layout
  - User information display
  - Navigation sidebar
  - Protected route (require authentication - TODO: implement auth guard)

## Phase 3: Member Registration Form 🔄 (In Progress)

### 3.1 Form Structure (Based on Old Site)
The registration form should include all fields from the original site (`C:\Projects\Sites\grankush`):

#### Personal Information Section (Left Column)
Fields displayed in left column of the form:
- [ ] **Name** (required, text input)
  - Field name: `name`
  - Placeholder: "Nombre" (or "Name" in English)
  - Validation: Required, min 2 characters
  
- [ ] **Surname** (required, text input)
  - Field name: `surname`
  - Placeholder: "Apellido" (or "Surname" in English)
  - Validation: Required, min 2 characters

- [ ] **Email** (required, email input)
  - Field name: `email`
  - Placeholder: "E-mail"
  - Validation: Required, valid email format

- [ ] **Phone** (optional, phone input with country selector)
  - Field name: `phone`
  - Placeholder: "Número de teléfono" (or "Phone Number")
  - Type: Phone input with country code selector (like react-phone-input-2)
  - Validation: Optional, if provided must be valid phone format

- [ ] **Birthday** (optional, date picker)
  - Field name: `date` or `birthday`
  - Placeholder: "Fecha de cumpleaños" (or "Birthday")
  - Type: Date input
  - Validation: Optional, must be valid date

#### Identity Documents Section (Right Column)
Fields displayed in right column of the form:

- [ ] **Document Type** (required, select dropdown)
  - Field name: `documentType`
  - Placeholder: "Tipo de Documento" (or "Document Type")
  - Type: Select dropdown with options (ID, Passport, etc.)
  - Validation: Required

- [ ] **Document Number** (required, text input)
  - Field name: `documentNumber`
  - Placeholder: "Número del Documento" (or "Document Number")
  - Validation: Required

- [ ] **Document First Page** (required, file upload)
  - Field name: `documentFirst`
  - Placeholder: "Tamaño de la foto del documento 1" (or "Document Photo 1")
  - Type: File input
  - Accept: `.jpg, .png, .jpeg`
  - Features:
    - File preview after selection
    - Display file name in disabled input field
    - Camera icon button to trigger file selection
    - Validation: Required, must be image file

- [ ] **Document Second Page** (required, file upload)
  - Field name: `documentSecond`
  - Placeholder: "Tamaño de la foto del documento 2" (or "Document Photo 2")
  - Type: File input
  - Accept: `.jpg, .png, .jpeg`
  - Features: Same as documentFirst
  - Validation: Required, must be image file

#### Usage Status Section (Right Column, after document fields)
Special checkbox section with conditional logic:

- [ ] **"Do you consume marijuana?" checkbox**
  - Field name: `status` or `isMj`
  - Label: "¿Consumes marihuana?" (or "Do you consume marijuana?")
  - Type: Checkbox
  - Behavior:
    - When checked: Show additional checkboxes below
    - When unchecked: Hide additional checkboxes and clear their values
  - Validation: Not directly required, but triggers conditional validation

- [ ] **Conditional Checkboxes** (shown only if status is checked):
  - [ ] **"Medical use" checkbox**
    - Field name: `isMedical`
    - Label: "¿Con médicos?" (or "Medical use")
    - Type: Checkbox
    - Validation: At least one (medical OR recreational) must be selected if status is checked

  - [ ] **"Recreational use" checkbox**
    - Field name: `isRecreation`
    - Label: "¿Con recreativos?" (or "Recreational use")
    - Type: Checkbox
    - Validation: At least one (medical OR recreational) must be selected if status is checked

- [ ] **Validation Logic**:
  - If `status` is checked, at least one of `isMedical` or `isRecreation` must be checked
  - Error message: "Por favor seleccione al menos un tipo de uso" (or "Please select at least one type of use")
  - Show error when user leaves the checkbox area (onMouseLeave) if validation fails

#### Signature Section (Right Column, after checkboxes)
- [ ] **Digital Signature Canvas**
  - Field name: `signature`
  - Placeholder: "Su firma" (or "Your Signature")
  - Type: Canvas-based signature component
  - Features:
    - Touch support for mobile devices
    - Clear button (cancel icon)
    - Save button (checkmark icon) - only shown when signature is drawn
    - Auto-save on mouse leave or touch end
    - Preview of saved signature
    - Export as base64 data URL (image/png)
  - Validation: Required
  - Styling: Different states (normal, error, done) with visual feedback

#### Password Section (Right Column, after signature)
- [ ] **Password** (required, password input)
  - Field name: `password`
  - Placeholder: "Contraseña" (or "Password")
  - Validation:
    - Required
    - Minimum 8 characters
    - Must contain uppercase letter
    - Must contain lowercase letter
    - Must contain number
    - Error message: "Password must contain uppercase, lowercase and number"

- [ ] **Repeat Password** (required, password input)
  - Field name: `repeatPassword`
  - Placeholder: "Repita la contraseña" (or "Repeat Password")
  - Validation:
    - Required
    - Must match `password` field
    - Error message: "Password is wrong" or "Passwords do not match"

### 3.2 Form Implementation Details

#### 3.2.1 Form Layout
- [ ] Create two-column layout (left and right columns)
  - Left column: Personal information fields (name, surname, email, phone, birthday)
  - Right column: Documents, checkboxes, signature, passwords
  - Responsive: Stack columns on mobile devices
  - Match styling from old site or create modern equivalent

#### 3.2.2 Form Library & State Management
- [ ] Use React Hook Form for form management
  - Install: `react-hook-form`
  - Install: `@hookform/resolvers` for Zod validation
  - Create form schema with Zod
- [ ] Create custom form components:
  - `FormInput` - Text, email, password inputs
  - `FormPhoneInput` - Phone input with country selector
  - `FormDateInput` - Date picker
  - `FormSelect` - Document type dropdown
  - `FormFileInput` - File upload with preview
  - `FormCheckbox` - Checkbox component
  - `FormSignature` - Signature canvas component

#### 3.2.3 Validation Schema
- [ ] Create Zod schema with all validations:
  ```typescript
  - name: z.string().min(2, "Name must be at least 2 characters")
  - surname: z.string().min(2, "Surname must be at least 2 characters")
  - email: z.string().email("Invalid email format")
  - phone: z.string().optional() or z.string().regex(...)
  - birthday: z.string().optional() or z.date()
  - documentType: z.string().min(1, "Document type is required")
  - documentNumber: z.string().min(1, "Document number is required")
  - documentFirst: z.instanceof(File) or z.string() (after upload)
  - documentSecond: z.instanceof(File) or z.string() (after upload)
  - signature: z.string().min(1, "Signature is required")
  - password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase and number")
  - repeatPassword: z.string().refine((val) => val === password, "Passwords do not match")
  - status: z.boolean().optional()
  - isMedical: z.boolean().optional()
  - isRecreation: z.boolean().optional()
  ```
- [ ] Add conditional validation:
  - If `status` is true, at least one of `isMedical` or `isRecreation` must be true
  - Use `.refine()` or `.superRefine()` in Zod schema

#### 3.2.4 File Upload Components
- [ ] Create `FormFileInput` component:
  - Hidden file input with label trigger
  - Display selected file name in disabled text input
  - Camera/upload icon button
  - Image preview (if image file)
  - File size validation (max 5MB recommended)
  - File type validation (jpg, png, jpeg only)
  - Error display
  - Styling matches old site or modern equivalent

#### 3.2.5 Signature Canvas Component
- [ ] Install signature library:
  - Option 1: `react-signature-canvas` (used in old site)
  - Option 2: `react-signature-pad` or similar
- [ ] Create `FormSignature` component:
  - Canvas element with proper sizing
  - Touch event handlers for mobile
  - Clear button (X icon) - clears canvas and form value
  - Save button (checkmark icon) - only visible when signature is drawn
  - Auto-save on mouse leave or touch end
  - Convert to base64 data URL (image/png)
  - Visual states: normal, error (red border), done (green border)
  - Responsive canvas sizing
  - Prevent scrolling on touch devices

#### 3.2.6 Phone Input Component
- [ ] Install phone input library:
  - Option: `react-phone-input-2` (used in old site)
  - Option: `react-phone-number-input` (modern alternative)
- [ ] Create `FormPhoneInput` component:
  - Country code selector
  - Phone number input
  - Format validation
  - Integration with React Hook Form

#### 3.2.7 Checkbox Group Component
- [ ] Create checkbox group for usage status:
  - Main checkbox: "Do you consume marijuana?"
  - Conditional checkboxes (shown when main is checked):
    - "Medical use"
    - "Recreational use"
  - Validation error display
  - Visual feedback for error state
  - Handle mouse leave event for validation trigger

#### 3.2.8 Form Submission Flow
- [ ] Create submission handler:
  1. Validate form with React Hook Form
  2. If validation fails, show errors and return
  3. Show loading state
  4. Upload files to storage API:
     - Upload `documentFirst` → get URL
     - Upload `documentSecond` → get URL
     - Upload `signature` (base64) → get URL (or send as base64)
  5. Prepare registration data:
     - Map form values to API DTO format
     - Replace files with URLs
     - Map checkbox values to `isMj`, `isMedical`, `isRecreation`
  6. Call registration API: `POST /lk/auth/member/register`
  7. Handle response:
     - Success: Store tokens, redirect to `/lk` or show success message
     - Error: Display error message, allow retry
  8. Hide loading state

#### 3.2.9 Error Handling
- [ ] Display field-level errors below each input
- [ ] Display form-level errors at top of form
- [ ] Handle API errors:
  - Network errors
  - Validation errors (400)
  - Conflict errors (409 - user already exists)
  - Server errors (500)
- [ ] Show user-friendly error messages
- [ ] Allow form resubmission after error

#### 3.2.10 Loading States
- [ ] Disable form inputs during submission
- [ ] Show loading spinner/indicator
- [ ] Prevent double submission
- [ ] Show progress for file uploads (optional)

### 3.3 API Integration
- [ ] Create API service for member registration
- [ ] Create API service for file uploads
- [ ] Integrate with `/lk/auth/member/register` endpoint
- [ ] Handle API errors and display to user
- [ ] Handle success response:
  - Store authentication tokens
  - Redirect to personal cabinet
  - Show success message

### 3.4 Form Styling & UX
- [ ] Match design from old site (or create new modern design)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states during submission
- [ ] Error messages display
- [ ] Success confirmation
- [ ] Form field grouping and sections
- [ ] Progress indicator (if multi-step)

## Phase 4: Additional Features

### 4.1 Navigation & Routing
- [ ] Set up Next.js App Router structure
- [ ] Create protected route wrapper
- [ ] Add navigation menu component
- [ ] Add breadcrumbs (optional)
- [ ] Add 404 page
- [ ] Add error boundary

### 4.2 User Experience
- [ ] Add loading spinners
- [ ] Add toast notifications
- [ ] Add form auto-save (optional)
- [ ] Add form validation feedback
- [ ] Add accessibility features (ARIA labels, keyboard navigation)

### 4.3 Testing
- [ ] Test registration form with all fields
- [ ] Test file uploads
- [ ] Test signature capture
- [ ] Test form validation
- [ ] Test API integration
- [ ] Test responsive design
- [ ] Test theme switching

## Phase 5: Polish & Optimization

### 5.1 Performance
- [ ] Optimize images
- [ ] Code splitting
- [ ] Lazy loading
- [ ] API request optimization

### 5.2 SEO
- [ ] Add meta tags
- [ ] Add Open Graph tags
- [ ] Add structured data
- [ ] Add sitemap

### 5.3 Documentation
- [ ] Update README
- [ ] Document API usage
- [ ] Document component usage
- [ ] Add code comments

## Notes

- All tasks should be completed incrementally
- Test after each major feature
- Follow TypeScript best practices
- Use shadcn/ui components where possible
- Maintain consistent code style
- Keep components reusable and modular

## Current Status

**Active Phase**: Phase 3 - Member Registration Form
**Next Steps**: 
1. Install form dependencies (react-hook-form, zod, react-signature-canvas, react-phone-input-2)
2. Create form components (Input, Select, FileUpload, Signature)
3. Create registration form page with all fields
4. Implement validation schema
5. Integrate with API
