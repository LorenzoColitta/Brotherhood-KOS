# Brotherhood KOS API Testing Guide

## Prerequisites

Before testing the API, ensure you have:

1. ✅ Completed database setup (run both SQL scripts in Supabase)
2. ✅ Configured environment variables (.env or Doppler)
3. ✅ Started the Discord bot (for generating auth codes)
4. ✅ Started the API server

## Setup Steps

### 1. Database Setup

Run these SQL scripts in your Supabase SQL Editor:

```bash
# First, run the main schema
src/database/schema.sql

# Then, run the API authentication migration
src/database/api-auth-migration.sql
```

### 2. Environment Configuration

Create a `.env` file with the required variables:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# API Configuration
API_PORT=3000

# Optional
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_optional
TELEGRAM_CHAT_ID=your_telegram_chat_id_optional
```

### 3. Deploy Commands

Deploy the Discord bot commands (including the new `/console` command):

```bash
npm run deploy-commands
# or with Doppler
npm run deploy-commands:doppler
```

### 4. Start Services

Open two terminal windows:

**Terminal 1 - Start Discord Bot:**
```bash
npm start
# or with Doppler
npm run start:doppler
```

**Terminal 2 - Start API Server:**
```bash
npm run start:api
# or with Doppler
npm run start:api:doppler
```

## Testing Workflow

### Test 1: Health Check

Verify the API is running:

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-01T18:00:00.000Z"
}
```

---

### Test 2: Generate Authentication Code

1. Open Discord and go to your server with the bot
2. Run the command:
   ```
   /console
   ```
3. Check your DMs for an 8-character code (e.g., `ABC12345`)

---

### Test 3: Login with Code

Exchange your code for a session token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "ABC12345"}'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "64-character-hex-token",
  "expiresAt": "2024-11-02T18:00:00.000Z",
  "user": {
    "userId": "123456789",
    "username": "YourUsername#1234"
  }
}
```

**Save the token for subsequent requests!**

---

### Test 4: Check User Status

Verify your authentication:

```bash
curl -X GET http://localhost:3000/api/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "userId": "123456789",
    "username": "YourUsername#1234"
  },
  "timestamp": "2024-11-01T18:00:00.000Z"
}
```

---

### Test 5: Get Statistics

Retrieve system statistics:

```bash
curl -X GET http://localhost:3000/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "statistics": {
    "activeEntries": 0,
    "historicalEntries": 0,
    "expiringSoon": 0,
    "totalProcessed": 0
  },
  "botStatus": {
    "enabled": true
  }
}
```

---

### Test 6: List KOS Entries

List all active KOS entries:

```bash
curl -X GET http://localhost:3000/api/kos \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "entries": [],
  "total": 0,
  "limit": 100,
  "offset": 0
}
```

---

### Test 7: Add KOS Entry

Add a test player to the KOS list:

```bash
curl -X POST http://localhost:3000/api/kos \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Roblox",
    "reason": "Test entry via API",
    "duration": "7d"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "KOS entry added successfully",
  "entry": {
    "id": "uuid",
    "roblox_username": "Roblox",
    "roblox_user_id": 1,
    "reason": "Test entry via API",
    "added_by": "YourUsername#1234",
    "added_by_discord_id": "123456789",
    "expiry_date": "2024-11-08T18:00:00.000Z",
    "created_at": "2024-11-01T18:00:00.000Z",
    "updated_at": "2024-11-01T18:00:00.000Z",
    "is_active": true,
    "thumbnail_url": "https://..."
  }
}
```

---

### Test 8: Get Specific Entry

Retrieve the entry you just added:

```bash
curl -X GET http://localhost:3000/api/kos/Roblox \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "entry": {
    "id": "uuid",
    "roblox_username": "Roblox",
    "roblox_user_id": 1,
    "reason": "Test entry via API",
    ...
  }
}
```

---

### Test 9: List with Filter

List entries filtered by username:

```bash
curl -X GET "http://localhost:3000/api/kos?filter=robl" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "entries": [
    {
      "roblox_username": "Roblox",
      ...
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

---

### Test 10: Remove KOS Entry

Remove the test entry:

```bash
curl -X DELETE http://localhost:3000/api/kos/Roblox \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "KOS entry removed successfully",
  "entry": {
    "roblox_username": "Roblox",
    ...
  }
}
```

---

### Test 11: View History

Check the exit registry (history):

```bash
curl -X GET http://localhost:3000/api/history \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "entries": [
    {
      "roblox_username": "Roblox",
      "removed_by": "YourUsername#1234",
      "removal_reason": "manual",
      ...
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

---

### Test 12: Logout

Revoke your session token:

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Test 13: Verify Token is Revoked

Try to use the revoked token:

```bash
curl -X GET http://localhost:3000/api/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired session token"
}
```

---

## Error Testing

### Test Invalid Code

Try to login with an invalid code:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "INVALID1"}'
```

**Expected Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired code"
}
```

---

### Test Missing Authorization

Try to access protected endpoint without token:

```bash
curl -X GET http://localhost:3000/api/kos
```

**Expected Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header"
}
```

---

### Test Non-existent User

Try to add a non-existent Roblox user:

```bash
curl -X POST http://localhost:3000/api/kos \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ThisUserDoesNotExist123456789",
    "reason": "Test",
    "duration": "1d"
  }'
```

**Expected Response (404):**
```json
{
  "error": "Not Found",
  "message": "Could not find Roblox user: ThisUserDoesNotExist123456789"
}
```

---

### Test Duplicate Entry

Try to add the same user twice:

1. Add a user
2. Try to add the same user again

**Expected Response (409):**
```json
{
  "error": "Conflict",
  "message": "This user is already on the KOS list"
}
```

---

## Integration with Discord Bot

Verify that API actions are also reflected in Discord:

1. **Add via API**, check with `/list` in Discord
2. **Add via Discord (`/add`)**, check with API GET `/api/kos`
3. **Remove via API**, check with `/list` in Discord
4. **Remove via Discord (`/remove`)**, check with API GET `/api/history`

---

## Automated Testing Script

Create a test script `test-api.sh`:

```bash
#!/bin/bash

API_BASE="http://localhost:3000"

echo "=== Brotherhood KOS API Test Suite ==="
echo ""

# Health check
echo "1. Health Check"
curl -s $API_BASE/health | jq
echo ""

# Login (requires manual code from /console)
echo "2. Login (you need to run /console in Discord first)"
read -p "Enter your auth code: " CODE
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$CODE\"}")
echo $LOGIN_RESPONSE | jq
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo ""

# Status
echo "3. Check Status"
curl -s -X GET $API_BASE/api/status \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Stats
echo "4. Get Statistics"
curl -s -X GET $API_BASE/api/stats \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# List KOS
echo "5. List KOS Entries"
curl -s -X GET $API_BASE/api/kos \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Add KOS
echo "6. Add KOS Entry (Roblox user)"
curl -s -X POST $API_BASE/api/kos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "Roblox", "reason": "Test entry", "duration": "1d"}' | jq
echo ""

# Get specific
echo "7. Get Specific Entry"
curl -s -X GET $API_BASE/api/kos/Roblox \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Remove KOS
echo "8. Remove KOS Entry"
curl -s -X DELETE $API_BASE/api/kos/Roblox \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# History
echo "9. View History"
curl -s -X GET $API_BASE/api/history \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Logout
echo "10. Logout"
curl -s -X POST $API_BASE/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "=== Test Suite Complete ==="
```

Make it executable and run:

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Notes

- Authentication codes expire after 60 minutes
- Session tokens expire after 24 hours
- Expired codes and sessions are automatically cleaned up every hour
- The API automatically sends Telegram notifications if configured
- All actions are logged in the audit trail

## Troubleshooting

### "Invalid or expired code"
- The code may have expired (60-minute limit)
- The code may have already been used
- Generate a new code with `/console`

### "Could not find Roblox user"
- Verify the username is correct (case-sensitive)
- Check if the user exists on Roblox.com

### "Connection refused"
- Ensure the API server is running on port 3000
- Check if another service is using port 3000

### "Database connection error"
- Verify Supabase credentials in .env
- Check if both SQL scripts have been run
- Test database connection from Supabase dashboard
