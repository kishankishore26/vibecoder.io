import axios from "axios";

const API_BASE = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}

export async function reviewCode(
  code,
  language = "python",
  reviewType = "full",
  inputMode = "code",
) {
  const response = await api.post("/api/review", {
    code,
    language,
    review_type: reviewType,
    input_mode: inputMode,
  });
  return response.data;
}

export default api;
