package auth

import (
	"encoding/json"
	"net/http"

	"github.com/jmechavez/vape-inventory/internal/httpresponse"
)

type Handler struct {
	repository *Repository
}

func NewHandler(repository *Repository) *Handler {
	return &Handler{repository: repository}
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	User    User   `json:"user,omitempty"`
	Token   string `json:"token,omitempty"`
}

type User struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Username == "" || req.Password == "" {
		httpresponse.Error(w, http.StatusBadRequest, "username and password required")
		return
	}

	user, err := h.repository.Authenticate(r.Context(), req.Username, req.Password)
	if err != nil {
		httpresponse.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	httpresponse.JSON(w, http.StatusOK, LoginResponse{
		Success: true,
		Message: "Login successful",
		User:    user,
		Token:   "temporary-token", // Replace with JWT later
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	httpresponse.Message(w, http.StatusOK, "Logged out successfully")
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	// Get user from session/token
	// For now, return a dummy user
	httpresponse.JSON(w, http.StatusOK, User{
		ID:       1,
		Username: "admin",
		Role:     "ADMIN",
	})
}
