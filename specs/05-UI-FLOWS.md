# UI Flows & Wireframe Specifications

Complete user interface flows, wireframes, and component specifications for all dashboards.

---

## 1. Farmer Dashboard

### 1.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  AgriDirect                    [Profile] [Logout]       │
├─────────────────────────────────────────────────────────┤
│  [My Crops] [Create Crop] [Choose Distributor] [AI]      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  My Crops    │  │ Notifications│  │  AI Assistant │ │
│  │              │  │              │  │              │ │
│  │  [List View] │  │  [3 New]     │  │  [Chat Box]  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Profile Page

**Route**: `/farmer/profile`

**Fields Displayed**:
- Full Name (editable)
- Farm Name (editable)
- Location (editable)
- Email (read-only, verified badge)
- Mobile Number (read-only, verified badge)
- Farming Experience (editable)
- Metamask Address (link/connect button)
- Payment QR Code (image preview, upload new)

**Document Management**:
- Agriculture Certificate (view/download, replace)
- Land Records (list with type, area, view/download, add new, remove)
- Lease Deed (optional, view/download, add/remove)
- Income Tax Return (optional, view/download, add/remove)
- Bank Passbook (optional, view/download, add/remove - note: cannot add after removal)

**Verification Status**:
- Badge: Pending/Approved/Rejected
- Verified by: Admin name
- Verified at: Date/time
- Rejection reason (if rejected)

**Actions**:
- [Save Changes]
- [Connect MetaMask]
- [Upload Document]

### 1.3 Create Crop Batch Form

**Route**: `/farmer/create-crop`

**Form Fields**:

**Basic Information**:
- Product Name* (text input)
- Category* (dropdown: fruits, vegetables, grains, others)
- Diet Labels* (multi-select checkboxes: Jain, Swaminarayan, Vegan, Organic, Fruitarian, Gluten-free)
- Quantity* (number input)
- Unit* (dropdown: kg, quintal, packet, box)
- Price Per Unit* (number input, ₹ symbol)
- Location* (text input or map picker)

**Media Upload**:
- Images* (file upload, minimum 2, max 5, preview thumbnails)
- Video (file upload, optional, preview)
- Lab Report (file upload, optional, PDF)

**Quality Details**:
- Harvest Date* (date picker)
- Soil pH (number input, 0-14)
- Moisture Percent (number input, %)
- Protein Percent (number input, %)
- Pesticides Used (dynamic list):
  - Name (text)
  - Times Used (number)
  - Dosage (text)
  - [Add More] button

**Actions**:
- [Save as Draft]
- [Create Crop Batch]
- [Cancel]

**Validation**:
- All * fields required
- Minimum 2 images
- Quantity > 0
- Price > 0
- Harvest date not in future
- pH between 0-14

### 1.4 My Crops List

**Route**: `/farmer/my-crops`

**Display**:
- Grid/List view toggle
- Filter by status (dropdown)
- Search by product name

**Crop Card**:
```
┌─────────────────────────────────────┐
│  [Image]  Organic Wheat             │
│           Category: Grains           │
│           Quantity: 1000 kg          │
│           Price: ₹25.50/unit        │
│           Status: created            │
│                                     │
│  [View] [Edit] [Delete] [QR Code]   │
│  [Select Distributor]               │
└─────────────────────────────────────┘
```

**Status Badges**:
- `created` - Blue
- `assignedToDistributor` - Yellow
- `inTransitToDistributor` - Orange
- `withDistributor` - Green
- `processed` - Purple
- `sold` - Gray

**Actions per Status**:
- `created`: Edit, Delete, Select Distributor
- `assignedToDistributor`: View, Dispatch Logistics
- `inTransitToDistributor`: View, Track
- Others: View only

### 1.5 Choose Distributor Modal/Page

**Route**: `/farmer/choose-distributor/:cropId`

**Display**:
- Search bar
- Filters:
  - Location (city/state)
  - Services (milling, coldStorage, packaging, transport)
  - Distance (slider)
- Sort: Distance, Rating, Name

**Distributor Card**:
```
┌─────────────────────────────────────┐
│  ABC Distribution Pvt Ltd            │
│  📍 Mumbai, Maharashtra              │
│  ✅ Verified                         │
│                                     │
│  Services:                          │
│  • Milling                          │
│  • Cold Storage                     │
│  • Packaging                        │
│                                     │
│  Distance: 150 km                   │
│                                     │
│  [Select This Distributor]          │
└─────────────────────────────────────┘
```

**Actions**:
- [Select] - Opens confirmation modal
- [View Profile] - Shows full distributor details

**Confirmation Modal**:
- Crop details summary
- Distributor details
- Offered price (editable)
- [Confirm] [Cancel]

### 1.6 Dispatch Logistics Form

**Route**: `/farmer/crops/:cropId/dispatch`

**Form Fields**:
- Vehicle Number* (text input)
- Vehicle Type* (dropdown: tempo, truck, van, other)
- Driver Name* (text input)
- Driver Phone* (text input, phone format)
- Transport Company* (text input)
- Transport Cost* (number input, ₹)
- From Location* (text, auto-filled from crop location)
- To Location* (text, auto-filled from distributor location)
- Expected Arrival* (date/time picker)

**Actions**:
- [Dispatch] - Creates logistics entry, updates status
- [Cancel]

### 1.7 AI Assistant Widget

**Route**: `/farmer/ai-assistant`

**Features**:
- Chat interface
- Image upload button (for disease detection)
- Language toggle (English/Hindi)
- Chat history

**UI**:
```
┌─────────────────────────────────────┐
│  AI Assistant                       │
│  [English] [Hindi]                  │
├─────────────────────────────────────┤
│  Chat Messages...                   │
│                                     │
│  User: What pesticides for wheat?   │
│  AI: For wheat, you can use...      │
│                                     │
├─────────────────────────────────────┤
│  [📷 Upload Image]                  │
│  [Type your question...] [Send]     │
└─────────────────────────────────────┘
```

---

## 2. Distributor Dashboard

### 2.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Distributor Dashboard    [Profile] [Logout]            │
├─────────────────────────────────────────────────────────┤
│  [Requests] [Incoming] [My Listings] [Stock]            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Requests    │  │  Incoming    │  │  My Listings│ │
│  │  [3 Pending] │  │  Shipments  │  │  [12 Active]│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Requests (Farmer Proposals)

**Route**: `/distributor/requests`

**Request Card**:
```
┌─────────────────────────────────────┐
│  Farmer: John Doe                   │
│  Farm: Green Fields Farm             │
│  📍 Pune, Maharashtra                │
│                                     │
│  Product: Organic Wheat              │
│  Quantity: 1000 kg                   │
│  Price: ₹25.50/unit                  │
│                                     │
│  [View Details] [Accept] [Reject]  │
└─────────────────────────────────────┘
```

**View Details Modal**:
- Full crop batch details
- Images/video
- Quality data
- Lab report
- Farmer profile
- [Accept] [Reject] buttons

**Actions**:
- [Accept] - Updates status, notifies farmer
- [Reject] - Requires reason, notifies farmer

### 2.3 Receive Logistics Form

**Route**: `/distributor/crops/:cropId/receive`

**Form Fields**:
- Received Timestamp* (date/time picker, default: now)
- Quality Photos* (file upload, multiple, preview)
- Moisture at Arrival (number input, %)
- Temperature (number input, °C)
- Condition* (dropdown: excellent, good, fair, poor)
- Received Quantity* (number input, may differ from dispatched)
- Notes (textarea)

**Actions**:
- [Receive & Quality Check] - Updates logistics entry, updates crop status
- [Cancel]

### 2.4 Process Crop Form (for Grains)

**Route**: `/distributor/crops/:cropId/process`

**Form Fields**:
- Processing Type* (dropdown: milled, cleaned, polished)
- Processing Date* (date picker)
- Initial Weight* (number input, kg)
- Final Usable Weight* (number input, kg)
- Grade* (dropdown: A, B, C)
- Impurity Percentage (number input, %)
- Notes (textarea)

**Actions**:
- [Process] - Updates crop status, appends ledger entry
- [Cancel]

### 2.5 Cold Storage Form

**Route**: `/distributor/crops/:cropId/cold-storage`

**Form Fields**:
- Temperature* (number input, °C)
- Humidity (number input, %)
- Storage Start Date* (date picker)
- Expected Duration* (number input, days)
- Notes (textarea)

**Actions**:
- [Store] - Appends ledger entry
- [Cancel]

### 2.6 Create Distributor Listing

**Route**: `/distributor/listings/create`

**Form Fields**:

**Product Info** (auto-filled from crop batch):
- Product Name (read-only)
- Category (read-only)
- Crop ID (read-only)

**Dates**:
- Date Distributor Purchased* (date picker)
- Date Product Came From Farmer* (date picker, auto-filled)
- Package Date* (date picker)

**Storage**:
- Cold Storage Used* (checkbox)
- If yes:
  - Temperature (number input, °C)
  - Duration (number input, days)
- Stored Days* (number input)

**Processing** (for grains):
- Processing Status* (dropdown: processed, notProcessed, milled, cleaned)
- Is Cleaned (checkbox)
- Grade* (dropdown: A, B, C)
- Impurity Percentage (number input, %)
- Pack Size* (text input, e.g., "50kg")
- Pack Material* (text input, e.g., "jute")

**Weight**:
- Initial Weight* (number input, kg)
- Final Usable Weight* (number input, kg)

**Pricing**:
- Price Per Unit* (number input, ₹)
- Distributor Margin* (number input, ₹, auto-calculated or manual)

**Final Image**:
- Upload Final Product Image* (file upload, preview)

**Actions**:
- [Create Listing] - Generates badgeId, creates certificate, lists in marketplace
- [Cancel]

### 2.7 My Listings

**Route**: `/distributor/listings`

**Display**:
- List of all listings
- Filter by status (listed, sold, archived)
- Search

**Listing Card**:
```
┌─────────────────────────────────────┐
│  [Image]  Organic Wheat              │
│           Badge: BADGE-20251202-001  │
│           Price: ₹30.00/unit         │
│           Quantity: 950 kg           │
│           Status: listed             │
│                                     │
│  [View] [Edit] [Archive] [QR]      │
└─────────────────────────────────────┘
```

---

## 3. Retailer Dashboard

### 3.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Retailer Dashboard      [Profile] [Logout]             │
├─────────────────────────────────────────────────────────┤
│  [Marketplace] [My Orders] [My Products]                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Distributor │  │  My Orders   │  │ My Products  │ │
│  │ Marketplace │  │  [5 Active] │  │ [12 Listed]  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Distributor Marketplace

**Route**: `/retailer/marketplace`

**Filters**:
- Category (dropdown)
- Price Range (slider)
- Location (text input)
- Sort (price_asc, price_desc, newest)

**Product Card**:
```
┌─────────────────────────────────────┐
│  [Image]  Organic Wheat              │
│           Distributor: ABC Dist.     │
│           Price: ₹30.00/unit         │
│           Quantity: 950 kg           │
│           Grade: A                   │
│           Badge: BADGE-20251202-001  │
│                                     │
│  [View Details] [Buy Now]          │
└─────────────────────────────────────┘
```

**View Details Modal**:
- Full product details
- Certificate preview
- Distributor info
- Quality data
- [Buy Now] button

### 3.3 Checkout Form

**Route**: `/retailer/checkout/:listingId`

**Form Fields**:
- Product Details (read-only summary)
- Quantity* (number input, max: available)
- Unit Price (read-only)
- Total Price (auto-calculated, read-only)
- Payment Method* (radio: COD, QR Code, UPI)
- If QR/UPI: Show QR code image
- Delivery Address* (textarea)

**Actions**:
- [Place Order] - Creates order, redirects to orders page
- [Cancel]

### 3.4 Confirm Receipt Form

**Route**: `/retailer/orders/:orderId/receive`

**Form Fields**:
- Received Timestamp* (date/time picker)
- Received Temperature (number input, °C)
- Received Quality* (dropdown: excellent, good, fair, poor)
- Received Quantity* (number input, may differ)
- Cold Storage Used (checkbox)
- If yes:
  - Temperature (number input)
  - Duration (number input, days)
- Notes (textarea)

**Actions**:
- [Confirm Receipt] - Updates order, updates crop status
- [Cancel]

### 3.5 Set Retailer Price

**Route**: `/retailer/orders/:orderId/set-price`

**Form Fields**:
- Product Name (read-only)
- Buying Price (read-only, from order)
- Retailer Price* (number input, ₹/unit)
- Margin (auto-calculated, read-only)

**Actions**:
- [Set Price] - Updates price trace, enables listing
- [Cancel]

### 3.6 My Orders

**Route**: `/retailer/orders`

**Order Card**:
```
┌─────────────────────────────────────┐
│  Order #ORD-001                     │
│  Product: Organic Wheat             │
│  Quantity: 100 kg                   │
│  Total: ₹3,000                      │
│  Status: pending                    │
│                                     │
│  [View] [Confirm Receipt]           │
└─────────────────────────────────────┘
```

---

## 4. Consumer View (QR Page)

### 4.1 QR Scan Result Page

**Route**: `/public/crop/:cropId` or `/qr/:qrId`

**Layout**:
```
┌─────────────────────────────────────┐
│  ✅ Verified Product                 │
│                                     │
│  [Product Image]                    │
│  Organic Wheat                      │
│  Category: Grains                   │
│                                     │
├─────────────────────────────────────┤
│  📍 Journey Timeline                 │
│  • Created by Farmer (Nov 29)        │
│  • Assigned to Distributor (Nov 29) │
│  • Dispatched (Nov 30)              │
│  • Received by Distributor (Nov 30) │
│  • Processed (Dec 1)                 │
│  • Listed (Dec 2)                    │
│  • Sold to Retailer (Dec 2)          │
│  • Received by Retailer (Dec 3)      │
│                                     │
├─────────────────────────────────────┤
│  💰 Price Breakdown                  │
│  Farmer: ₹25.50                     │
│  Transport: ₹5.00                    │
│  Distributor: ₹30.00                │
│  Retailer: ₹35.00                    │
│                                     │
├─────────────────────────────────────┤
│  👤 Stakeholders                     │
│  Farmer: John Doe                   │
│  Distributor: ABC Distribution      │
│  Retailer: Fresh Mart               │
│                                     │
├─────────────────────────────────────┤
│  📊 Quality                          │
│  Soil pH: 6.8                       │
│  Moisture: 12.5%                    │
│  Protein: 10.2%                      │
│  Grade: A                            │
│                                     │
│  [View Full Certificate]            │
│  [Download PDF]                     │
└─────────────────────────────────────┘
```

**Features**:
- Responsive design (mobile-friendly)
- Timeline visualization
- Price breakdown chart
- Certificate download
- Blockchain verification badge
- Share button

### 4.2 Certificate View

**Route**: `/public/certificate/:cropId`

**Display**:
- Full certificate JSON rendered as formatted document
- All stakeholder details
- Complete timeline
- Price trace
- Quality data
- Logistics details
- Blockchain verification info
- [Download PDF] button

---

## 5. Admin Dashboard

### 5.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Admin Dashboard          [Profile] [Logout]            │
├─────────────────────────────────────────────────────────┤
│  [Verifications] [Users] [Crops] [Logs]                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Pending      │  │  Approved     │  │  Rejected    │ │
│  │ Verifications│  │  Today: 12    │  │  Today: 2    │ │
│  │ [15]         │  └──────────────┘  └──────────────┘ │
│  └──────────────┘                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Verification Page

**Route**: `/admin/verifications`

**Filters**:
- Role (farmer, distributor, retailer)
- Status (pending, approved, rejected)
- Date range

**Verification Card**:
```
┌─────────────────────────────────────┐
│  Farmer: John Doe                    │
│  Email: farmer@example.com           │
│  Status: pending                     │
│  Submitted: Nov 29, 2025             │
│                                     │
│  Documents:                          │
│  ✅ Agriculture Certificate          │
│  ✅ Land Records (2)                 │
│  ⚠️  Bank Passbook (missing)         │
│                                     │
│  [View Details] [Approve] [Reject]  │
└─────────────────────────────────────┘
```

**View Details Modal**:
- Full user profile
- All documents (view/download from IPFS)
- Verification checklist
- [Approve] [Reject] buttons
- Rejection reason input (if reject)

**Actions**:
- [Approve] - Updates status, triggers blockchain registration (if MetaMask linked)
- [Reject] - Requires reason, notifies user

---

## 6. Common Components

### 6.1 Navigation Bar

- Logo (links to home)
- Role-specific menu
- Profile dropdown
- Logout button

### 6.2 File Upload Component

- Drag & drop area
- File preview
- Progress bar
- Remove button
- Validation messages

### 6.3 Status Badge Component

- Color-coded badges
- Icons
- Tooltips

### 6.4 Notification Bell

- Badge with count
- Dropdown list
- Mark as read
- Clear all

### 6.5 MetaMask Connect Button

- "Connect MetaMask" button
- Shows address when connected
- Network indicator
- Disconnect option

---

## 7. Responsive Design

### Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile Optimizations

- Hamburger menu
- Stacked layouts
- Touch-friendly buttons
- Swipe gestures for cards
- Bottom navigation (optional)

---

## 8. Color Scheme

### Primary Colors

- Green: `#00796b` (main brand)
- Dark Green: `#004d40`
- Light Green: `#b2dfdb`
- Accent: `#ff6f00`

### Status Colors

- Pending: `#ffa726` (Orange)
- Approved: `#66bb6a` (Green)
- Rejected: `#ef5350` (Red)
- In Transit: `#42a5f5` (Blue)
- Completed: `#78909c` (Gray)

---

## 9. Typography

- Headings: 'Segoe UI', sans-serif
- Body: 'Segoe UI', sans-serif
- Code: 'Courier New', monospace

### Font Sizes

- H1: 32px
- H2: 24px
- H3: 20px
- Body: 16px
- Small: 14px

---

## 10. Accessibility

- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

---

## 11. Loading States

- Skeleton loaders
- Progress indicators
- Spinner animations
- Placeholder content

---

## 12. Error Handling UI

- Error messages (toast notifications)
- Form validation errors (inline)
- 404 page
- 500 error page
- Network error handling

---

## Summary

- **5 Dashboards**: Farmer, Distributor, Retailer, Consumer, Admin
- **Responsive Design**: Mobile-first approach
- **Component Library**: Reusable UI components
- **Accessibility**: WCAG compliant
- **User Experience**: Intuitive flows, clear actions
- **Visual Feedback**: Loading states, error handling, notifications

