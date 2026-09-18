export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: "mains" | "drinks" | "desserts" | string;
  description: string;
  ingredients: string[];
  aliases?: string[];
  dietary: string[];
  spicy_level: number;
  calories: number;
  prep_time_mins: number;
  rating: number;
  image: string;
}

export interface CartItem {
  slug: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface AgentTraceEvent {
  node: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RestaurantState {
  session_id: string;
  customer_name?: string | null;
  user_message: string;
  messages: ChatMessage[];
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  order_status: "browsing" | "draft" | "awaiting_approval" | "confirmed" | "cooking" | "ready" | "served" | "cancelled" | string;
  hitl_required: boolean;
  hitl_reason?: string | null;
  agent_trace: AgentTraceEvent[];
  response: string;
  suggested_prompts: string[];
}
