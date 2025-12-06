# Debug Farmer Login Issue

## Steps to Debug:

1. **Check Server Logs** - Look for the detailed logs I added:
   - `🔍 Farmer login attempt for email:`
   - `✅ Farmer found:` or `❌ Farmer not found`
   - `🔐 Comparing password...`
   - `🔐 Password match result:`
   - `✅ Login successful` or `❌ Password mismatch`

2. **Check Browser Console** - Open browser DevTools (F12) and check Console tab for:
   - `📤 Sending login request:` - Shows what's being sent
   - `📥 Response status:` - Shows HTTP status
   - `📥 Response data:` - Shows server response

3. **Verify Farmer Exists** - Check MongoDB:
   ```javascript
   // In MongoDB shell or Compass
   db.farmers.findOne({ email: "your-email@example.com" })
   ```

4. **Check Password Hash** - Verify passwordHash field exists:
   ```javascript
   db.farmers.findOne({ email: "your-email@example.com" }, { passwordHash: 1, email: 1 })
   ```

5. **Test Password Hash** - If you know the password, test it:
   ```javascript
   const bcrypt = require('bcryptjs');
   const hash = "your-hash-from-db";
   const password = "your-password";
   bcrypt.compare(password, hash).then(result => console.log("Match:", result));
   ```

## Common Issues:

1. **Farmer registered with old schema** - Password might be in `password` field instead of `passwordHash`
2. **Case sensitivity** - Email might be case-sensitive in database
3. **Whitespace** - Extra spaces in email/password
4. **MongoDB not connected** - Check server logs for "✅ MongoDB Connected"

## Quick Fix:

If farmer was registered with old schema, update the login route to check both fields:
```javascript
const passwordField = farmer.passwordHash || farmer.password;
```

This is already implemented! ✅

