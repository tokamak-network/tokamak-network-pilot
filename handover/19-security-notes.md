# Security Notes

[← Back to Index](./README.md)

---

> **IMPORTANT:** The `.env` file in the repository currently contains real API keys (OpenAI, GitHub). These should be rotated immediately if they were ever committed to version control.

- **Rotate these keys now:**
  - `OPENAI_API_KEY` — the current `.env` has a real key
  - `GITHUB_TOKEN` — the current `.env` has a real token
- **JWT secret** is set to `change-me-in-production` — must be changed for any non-local deployment
- **API keys** are stored as bcrypt hashes (not plaintext) in the database
- **OTP codes** expire after a configurable period
- **CORS** is configured to only allow specific origins
