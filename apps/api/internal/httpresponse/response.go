package httpresponse

import (
	"encoding/json"
	"net/http"
)

type MessageResponse struct {
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func JSON(
	w http.ResponseWriter,
	status int,
	data any,
) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(data)
}

func Message(
	w http.ResponseWriter,
	status int,
	message string,
) {
	JSON(w, status, MessageResponse{
		Message: message,
	})
}

func Error(
	w http.ResponseWriter,
	status int,
	message string,
) {
	JSON(w, status, ErrorResponse{
		Error: message,
	})
}
