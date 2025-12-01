# Consumer Model Duplicate Fix

## ✅ Issue Fixed

### Problem
- **Error**: `OverwriteModelError: Cannot overwrite 'Consumer' model once compiled`
- **Cause**: `Consumer` model was being defined twice:
  1. Imported from `models/index.js` as `ConsumerEnhanced` (line 18)
  2. Declared again in `server.js` (line 82)
- **Location**: `server.js:82`

### Solution
1. ✅ Removed duplicate `Consumer` model declaration in `server.js`
2. ✅ Set `Consumer = ConsumerEnhanced` to use the imported model
3. ✅ Updated consumer routes to use correct field names from enhanced model:
   - `mobile` → `mobileNumber`
   - `password` → `passwordHash`

## Changes Made

### 1. Model Declaration (server.js:72-75)
**Before:**
```javascript
const consumerSchema = new mongoose.Schema({...});
const Consumer = mongoose.model("Consumer", consumerSchema);
```

**After:**
```javascript
const Consumer = ConsumerEnhanced; // Use imported Consumer from models/index.js
```

### 2. Consumer Registration Route (server.js:1632)
**Before:**
```javascript
const consumer = new Consumer({ name, email, mobile, password: hashedPassword });
```

**After:**
```javascript
const consumer = new Consumer({ 
  name, 
  email, 
  mobileNumber: mobile, // Map mobile to mobileNumber
  passwordHash: hashedPassword // Map password to passwordHash
});
```

### 3. Consumer Login Route (server.js:1650)
**Before:**
```javascript
const isMatch = await bcrypt.compare(password, consumer.password);
```

**After:**
```javascript
const isMatch = await bcrypt.compare(password, consumer.passwordHash || consumer.password);
```

## Enhanced Consumer Model Fields

From `models/index.js`, the Consumer model has:
- `name` (String)
- `email` (String, unique, sparse)
- `mobileNumber` (String, unique, sparse) ← Note: not `mobile`
- `passwordHash` (String) ← Note: not `password`
- `metamaskAddress` (String)
- `preferences` (Array of strings)
- `createdAt`, `updatedAt` (Dates)

## Status

✅ Duplicate model declaration removed
✅ Routes updated to use correct field names
✅ No linter errors
✅ Server should now start without OverwriteModelError

