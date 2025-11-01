# Brotherhood KOS REST API Documentation

## Overview

The Brotherhood KOS REST API provides programmatic access to the KOS (Kill On Sight) management system. The API requires authentication via Discord-generated codes and provides the same functionality as the Discord bot (excluding admin functions).

## Base URL

```
http://localhost:3000
```

*Note: In production, replace with your deployed API URL*

## Authentication

### Getting Started

1. **Generate an authentication code** using the Discord bot:
   ```
   /console
   ```
   This will send you an 8-character code via DM (or ephemeral message).

2. **Exchange the code for a session token** using the login endpoint.

3. **Use the session token** in the Authorization header for all API requests.

### Authentication Flow

```
Discord Bot (/console) → Auth Code → API Login → Session Token → API Access
```

## API Endpoints

### Authentication

#### Login with Code

Exchange a Discord-generated code for a session token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "code": "ABC12345"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "your-session-token-here",
  "expiresAt": "2024-11-02T18:00:00.000Z",
  "user": {
    "userId": "123456789",
    "username": "username#1234"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Code is missing
- `401 Unauthorized` - Invalid or expired code

---

#### Logout

Revoke your current session token.

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### KOS Entries

#### List All KOS Entries

Retrieve all active KOS entries with pagination.

**Endpoint:** `GET /api/kos`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Query Parameters:**
- `limit` (optional, default: 100) - Number of entries to return
- `offset` (optional, default: 0) - Offset for pagination
- `filter` (optional) - Filter by username (case-insensitive substring match)

**Example Request:**
```
GET /api/kos?limit=10&offset=0&filter=john
```

**Response (200):**
```json
{
  "success": true,
  "entries": [
    {
      "id": "uuid",
      "roblox_username": "JohnDoe",
      "roblox_user_id": 123456789,
      "reason": "Rule violation",
      "added_by": "admin#1234",
      "added_by_discord_id": "987654321",
      "expiry_date": null,
      "created_at": "2024-11-01T12:00:00.000Z",
      "updated_at": "2024-11-01T12:00:00.000Z",
      "is_active": true,
      "thumbnail_url": "https://..."
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

#### Get Specific KOS Entry

Retrieve a specific KOS entry by username.

**Endpoint:** `GET /api/kos/:username`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Example Request:**
```
GET /api/kos/JohnDoe
```

**Response (200):**
```json
{
  "success": true,
  "entry": {
    "id": "uuid",
    "roblox_username": "JohnDoe",
    "roblox_user_id": 123456789,
    "reason": "Rule violation",
    "added_by": "admin#1234",
    "added_by_discord_id": "987654321",
    "expiry_date": null,
    "created_at": "2024-11-01T12:00:00.000Z",
    "updated_at": "2024-11-01T12:00:00.000Z",
    "is_active": true,
    "thumbnail_url": "https://..."
  }
}
```

**Error Responses:**
- `404 Not Found` - KOS entry not found

---

#### Add KOS Entry

Add a new player to the KOS list.

**Endpoint:** `POST /api/kos`

**Headers:**
```
Authorization: Bearer your-session-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "JohnDoe",
  "reason": "Rule violation - harassment",
  "duration": "7d"
}
```

**Body Parameters:**
- `username` (required) - Roblox username
- `reason` (required) - Reason for adding to KOS
- `duration` (optional) - Duration (e.g., "7d", "30d", "1y", "6mo"). Omit for permanent.

**Response (201):**
```json
{
  "success": true,
  "message": "KOS entry added successfully",
  "entry": {
    "id": "uuid",
    "roblox_username": "JohnDoe",
    "roblox_user_id": 123456789,
    "reason": "Rule violation - harassment",
    "added_by": "username#1234",
    "added_by_discord_id": "123456789",
    "expiry_date": "2024-11-08T12:00:00.000Z",
    "created_at": "2024-11-01T12:00:00.000Z",
    "updated_at": "2024-11-01T12:00:00.000Z",
    "is_active": true,
    "thumbnail_url": "https://..."
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid duration
- `404 Not Found` - Roblox user not found
- `409 Conflict` - User already on KOS list

---

#### Remove KOS Entry

Remove a player from the KOS list (archives to history).

**Endpoint:** `DELETE /api/kos/:username`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Example Request:**
```
DELETE /api/kos/JohnDoe
```

**Response (200):**
```json
{
  "success": true,
  "message": "KOS entry removed successfully",
  "entry": {
    "id": "uuid",
    "roblox_username": "JohnDoe",
    "roblox_user_id": 123456789,
    "reason": "Rule violation",
    "added_by": "admin#1234",
    "added_by_discord_id": "987654321",
    "expiry_date": null,
    "created_at": "2024-11-01T12:00:00.000Z",
    "updated_at": "2024-11-01T12:00:00.000Z",
    "is_active": true,
    "thumbnail_url": "https://..."
  }
}
```

**Error Responses:**
- `404 Not Found` - KOS entry not found

---

### History

#### List Exit Registry

Retrieve historical (removed) KOS entries.

**Endpoint:** `GET /api/history`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Query Parameters:**
- `limit` (optional, default: 100) - Number of entries to return
- `offset` (optional, default: 0) - Offset for pagination

**Example Request:**
```
GET /api/history?limit=10&offset=0
```

**Response (200):**
```json
{
  "success": true,
  "entries": [
    {
      "id": "uuid",
      "original_entry_id": "uuid",
      "roblox_username": "JohnDoe",
      "roblox_user_id": 123456789,
      "reason": "Rule violation",
      "added_by": "admin#1234",
      "added_by_discord_id": "987654321",
      "removed_by": "moderator#5678",
      "removed_by_discord_id": "111222333",
      "expiry_date": null,
      "created_at": "2024-11-01T12:00:00.000Z",
      "removed_at": "2024-11-01T13:00:00.000Z",
      "removal_reason": "manual",
      "thumbnail_url": "https://..."
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

### Statistics

#### Get Statistics

Retrieve system statistics.

**Endpoint:** `GET /api/stats`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Response (200):**
```json
{
  "success": true,
  "statistics": {
    "activeEntries": 15,
    "historicalEntries": 42,
    "expiringSoon": 3,
    "totalProcessed": 57
  },
  "botStatus": {
    "enabled": true
  }
}
```

---

#### Get User Status

Get information about the current authenticated user.

**Endpoint:** `GET /api/status`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "userId": "123456789",
    "username": "username#1234"
  },
  "timestamp": "2024-11-01T18:00:00.000Z"
}
```

---

### Health Check

#### Health Check

Check if the API is running.

**Endpoint:** `GET /health`

**No authentication required**

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-11-01T18:00:00.000Z"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required or invalid token
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate entry)
- `500 Internal Server Error` - Server error

---

## Rate Limiting

Currently, there is no rate limiting implemented. This may be added in future versions.

---

## Example Usage

### Python Example

```python
import requests

# 1. Get auth code from Discord bot using /console command
# 2. Login with the code
login_response = requests.post(
    'http://localhost:3000/api/auth/login',
    json={'code': 'ABC12345'}
)
token = login_response.json()['token']

# 3. Use the token for API requests
headers = {'Authorization': f'Bearer {token}'}

# List KOS entries
response = requests.get(
    'http://localhost:3000/api/kos',
    headers=headers
)
print(response.json())

# Add KOS entry
response = requests.post(
    'http://localhost:3000/api/kos',
    headers=headers,
    json={
        'username': 'BadPlayer',
        'reason': 'Griefing',
        'duration': '30d'
    }
)
print(response.json())

# Remove KOS entry
response = requests.delete(
    'http://localhost:3000/api/kos/BadPlayer',
    headers=headers
)
print(response.json())
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function main() {
  // 1. Get auth code from Discord bot using /console command
  // 2. Login with the code
  const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
    code: 'ABC12345'
  });
  const token = loginResponse.data.token;
  
  // 3. Use the token for API requests
  const headers = { Authorization: `Bearer ${token}` };
  
  // List KOS entries
  const kosResponse = await axios.get(`${API_BASE}/api/kos`, { headers });
  console.log(kosResponse.data);
  
  // Add KOS entry
  const addResponse = await axios.post(
    `${API_BASE}/api/kos`,
    {
      username: 'BadPlayer',
      reason: 'Griefing',
      duration: '30d'
    },
    { headers }
  );
  console.log(addResponse.data);
  
  // Remove KOS entry
  const removeResponse = await axios.delete(
    `${API_BASE}/api/kos/BadPlayer`,
    { headers }
  );
  console.log(removeResponse.data);
}

main();
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "ABC12345"}'

# List KOS entries
curl -X GET http://localhost:3000/api/kos \
  -H "Authorization: Bearer your-token-here"

# Add KOS entry
curl -X POST http://localhost:3000/api/kos \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"username": "BadPlayer", "reason": "Griefing", "duration": "30d"}'

# Remove KOS entry
curl -X DELETE http://localhost:3000/api/kos/BadPlayer \
  -H "Authorization: Bearer your-token-here"

# Get statistics
curl -X GET http://localhost:3000/api/stats \
  -H "Authorization: Bearer your-token-here"
```

---

## Security Best Practices

1. **Keep your auth code private** - Never share your authentication code
2. **Store tokens securely** - Don't commit tokens to version control
3. **Use HTTPS in production** - Always use secure connections in production
4. **Rotate tokens regularly** - Logout and re-authenticate periodically
5. **Monitor API usage** - Check logs for suspicious activity

---

## Notes

- Authentication codes expire after 60 minutes
- Session tokens expire after 24 hours
- Expired codes and sessions are automatically cleaned up
- The API automatically sends Telegram notifications (if configured) when KOS entries are added/removed
- Admin functions (toggle bot status) are not available via API - use the Discord bot's `/manage` command instead
