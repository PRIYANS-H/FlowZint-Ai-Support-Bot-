// ── Knowledge base ─────────────────────────────────────────────────
export const FAQ_KB = [
  { q: "refund policy", a: "Our refund policy allows returns within 30 days of purchase. You'll receive a full refund to your original payment method within 5–7 business days once we receive the item.", conf: 0.92, cat: "refunds" },
  { q: "track shipment", a: "You can track your shipment by visiting our tracking page and entering your order ID. You'll also receive an email with a tracking link once your order ships.", conf: 0.89, cat: "shipping" },
  { q: "cancel order", a: "Orders can be cancelled within 2 hours of placement. After that, please wait for delivery and use our standard returns process.", conf: 0.87, cat: "orders" },
  { q: "delivery time", a: "Standard delivery takes 5–7 business days. Express shipping (2–3 days) is available at checkout for an additional fee.", conf: 0.91, cat: "shipping" },
  { q: "payment methods", a: "We accept all major credit cards, UPI, net banking, and wallets including Paytm and PhonePe.", conf: 0.94, cat: "payments" },
  { q: "contact support", a: "Our support team is available 24/7 via this chat or at support@flowzint.com. Average response time is under 2 hours.", conf: 0.88, cat: "support" },
  { q: "exchange item", a: "Exchanges are supported within 14 days of delivery. Visit our returns portal to start an exchange request.", conf: 0.85, cat: "returns" },
  { q: "account password", a: "To reset your password, click 'Forgot password' on the login page. A reset link will be sent to your registered email.", conf: 0.90, cat: "account" },
  { q: "size guide", a: "Our size guide is available on each product page. If you're between sizes, we recommend sizing up for comfort. Still unsure? Contact support for personalised advice.", conf: 0.86, cat: "products" },
  { q: "damaged item", a: "We're sorry to hear that! Please share a photo of the damaged item via chat and we'll arrange a free replacement or full refund within 24 hours.", conf: 0.91, cat: "returns" },
  { q: "loyalty points", a: "Your loyalty points are visible in your account dashboard. Points can be redeemed at checkout — 100 points = ₹10 discount. Points expire after 12 months.", conf: 0.88, cat: "loyalty" },
  { q: "bulk order", a: "For bulk or corporate orders of 10+ items, please email bulk@flowzint.com for a custom quote and priority processing with dedicated support.", conf: 0.83, cat: "orders" },
  { q: "international shipping", a: "We ship to 45+ countries. International delivery takes 10–15 business days. Customs duties may apply depending on your destination country.", conf: 0.87, cat: "shipping" },
  { q: "warranty", a: "All products include a 1-year manufacturer warranty. To raise a warranty claim, contact support with your order ID and a description of the issue.", conf: 0.90, cat: "products" },
  { q: "promo code", a: "Enter your promo code at checkout in the 'Discount code' field. Codes are case-sensitive and can only be used once per account.", conf: 0.93, cat: "payments" },
  { q: "app not working", a: "Try force-closing the app and reopening it. If that doesn't help, clear the app cache in your phone settings or reinstall. Contact support if the issue persists.", conf: 0.85, cat: "support" },
];

// ── NLP word lists ──────────────────────────────────────────────────
export const HINGLISH_WORDS = ["nahi", "yaar", "mera", "abhi", "karo", "hai", "hua", "bhai", "iska", "kyun", "aaya", "kab", "kuch", "dekho", "bilkul", "theek"];
export const NEG_WORDS     = ["frustrated", "angry", "terrible", "horrible", "worst", "disappointed", "useless", "ridiculous", "third time", "unresolved", "still waiting", "never", "pathetic", "awful", "outrageous", "unacceptable", "disgusting", "furious", "incompetent"];
export const POS_WORDS     = ["thank", "great", "excellent", "perfect", "wonderful", "happy", "love", "awesome", "fast", "resolved", "helpful", "amazing", "appreciate", "good"];
export const ESCALATE_TRIGGERS = ["third time", "never resolved", "unacceptable", "speak to manager", "this is a joke", "three times", "demanding refund", "legal action", "consumer forum", "chargeback"];
export const HINGLISH_NEG  = ["nahi aaya", "problem hai", "kab aayega", "kuch nahi hua", "abhi tak nahi"];

// ── Quick demo messages ─────────────────────────────────────────────
export const QUICK_MSGS = [
  { label: "Refund policy",  text: "What is your refund policy?" },
  { label: "Track order",    text: "How do I track my shipment?" },
  { label: "Angry",          text: "My order hasn't arrived and I'm really frustrated!" },
  { label: "Escalation",     text: "This is the third time my issue hasn't been resolved!" },
  { label: "Hinglish",       text: "Mera order abhi tak nahi aaya yaar" },
  { label: "Unknown",        text: "Can I change my delivery address after ordering?" },
];

// ── Seed data for dashboard & tickets ──────────────────────────────
export const INIT_TICKETS = [
  { id: "#1042", customer: "Rahul M.",  issue: "Order not delivered after 12 days",  pri: "high", status: "escalated", trigger: "Drift detection",        ts: "09:14" },
  { id: "#1039", customer: "Sneha P.",  issue: "Wrong item shipped",                 pri: "high", status: "open",      trigger: "Frustration keywords",   ts: "10:32" },
  { id: "#1035", customer: "Arjun K.",  issue: "Refund not processed in 10 days",    pri: "med",  status: "open",      trigger: "Auto-ticket",             ts: "11:05" },
  { id: "#1031", customer: "Divya R.",  issue: "App login issue – can't access acct",pri: "low",  status: "resolved",  trigger: "Auto-ticket",             ts: "08:47" },
];

export const CLUSTERS = [
  { label: "Delivery delays",        count: 47, pct: 0.85 },
  { label: "Refund not processed",   count: 31, pct: 0.56 },
  { label: "Wrong item received",    count: 18, pct: 0.33 },
  { label: "App login issues",       count: 12, pct: 0.22 },
];

export const CHURN_RISKS = [
  { name: "Rahul M.",  risk: "high", driver: "3 unresolved tickets",          action: "Priority escalation to senior agent"   },
  { name: "Priya K.",  risk: "high", driver: "Sustained negative sentiment",  action: "Personalized discount offer"           },
  { name: "Amit S.",   risk: "med",  driver: "Extended inactivity (8 days)",  action: "Re-engagement campaign"               },
  { name: "Nisha R.",  risk: "med",  driver: "2 escalations this week",       action: "Assign dedicated account manager"     },
];

// Hourly sentiment seed for sparkline (8 hrs × 3 categories)
export const HOURLY_SENTIMENT = [
  { hour: "9am",  pos: 12, neu: 20, neg: 8  },
  { hour: "10am", pos: 18, neu: 22, neg: 6  },
  { hour: "11am", pos: 15, neu: 25, neg: 10 },
  { hour: "12pm", pos: 22, neu: 18, neg: 5  },
  { hour: "1pm",  pos: 19, neu: 24, neg: 7  },
  { hour: "2pm",  pos: 25, neu: 20, neg: 4  },
  { hour: "3pm",  pos: 21, neu: 23, neg: 6  },
  { hour: "4pm",  pos: 28, neu: 19, neg: 3  },
];