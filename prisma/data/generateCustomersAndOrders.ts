export const customers = [
  { id: "cust_1", name: "Alice Smith", email: "alice@example.com" },
  { id: "cust_2", name: "Bob Jones", email: "bob@example.com" },
  { id: "cust_3", name: "Charlie Brown", email: "charlie@example.com" },
  { id: "cust_4", name: "Diana Prince", email: "diana@example.com" }
];

// Generate dates relative to today for accurate policy testing
const now = new Date();
const _daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

export const orders = [
  { id: "ord_1", customerId: "cust_1", status: "DELIVERED", total: 120.50, createdAt: _daysAgo(10) }, // Eligible for standard return
  { id: "ord_2", customerId: "cust_2", status: "DELIVERED", total: 45.00, createdAt: _daysAgo(40) },  // Past 30-day window
  { id: "ord_3", customerId: "cust_3", status: "PROCESSING", total: 800.00, createdAt: _daysAgo(1) }, // High value, escalate risk
  { id: "ord_4", customerId: "cust_4", status: "SHIPPED", total: 35.20, createdAt: _daysAgo(8) }    // Delayed in transit
];
