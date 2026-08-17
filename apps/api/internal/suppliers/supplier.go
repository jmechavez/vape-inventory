package suppliers

type Supplier struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	ContactPerson string `json:"contact_person,omitempty"`
	Phone         string `json:"phone,omitempty"`
	Email         string `json:"email,omitempty"`
	Address       string `json:"address,omitempty"`
}
