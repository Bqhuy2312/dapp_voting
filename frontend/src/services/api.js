import axios from "axios";

// Axios instance dùng chung để gọi toàn bộ API backend.
const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

export default API;
