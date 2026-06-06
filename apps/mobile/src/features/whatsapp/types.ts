export type WhatsAppConversationStatus = "OPEN" | "PENDING" | "CLOSED" | string;
export type WhatsAppMessageDirection = "INBOUND" | "OUTBOUND" | string;
export type WhatsAppMessageType = "TEXT" | "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO" | string;
export type WhatsAppSaleType = "CASH" | "CREDIT" | string;
export type WhatsAppPaymentMethod = "CASH" | "MOMO" | "CARD" | "BANK" | string;

export type WhatsAppBroadcastStatus = "DRAFT" | "QUEUED" | "SENT" | "FAILED" | string;

export type WhatsAppTargetMode =
  | "ALL_OPTED_IN"
  | "BRANCH_CUSTOMERS"
  | "CREDIT_CUSTOMERS"
  | "OVERDUE_CREDIT_CUSTOMERS"
  | "PRODUCT_BUYERS"
  | "MANUAL_CUSTOMERS"
  | string;

export type WhatsAppBranch = {
  id: string;
  name?: string | null;
  code?: string | null;
  isMain?: boolean;
  status?: string | null;
};

export type WhatsAppCustomer = {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tinNumber?: string | null;
  idNumber?: string | null;
  notes?: string | null;
  isActive?: boolean;
  whatsappOptIn?: boolean;
};

export type WhatsAppAssignedStaff = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  isActive?: boolean;
};

export type WhatsAppAccount = {
  id: string;
  phoneNumber?: string | null;
  businessName?: string | null;
  isActive?: boolean;
};

export type WhatsAppMessage = {
  id: string;
  direction: WhatsAppMessageDirection;
  type: WhatsAppMessageType;
  textContent?: string | null;
  mediaUrl?: string | null;
  messageId?: string | null;
  createdAt?: string | null;
  sentById?: string | null;
};

export type WhatsAppConversation = {
  id: string;
  phone?: string | null;
  status: WhatsAppConversationStatus;
  assignedToId?: string | null;
  accountId?: string | null;
  customerId?: string | null;
  branchId?: string | null;
  branch?: WhatsAppBranch | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  messageCount?: number;
  unreadCount?: number;
  customer?: WhatsAppCustomer | null;
  assignedTo?: WhatsAppAssignedStaff | null;
  account?: WhatsAppAccount | null;
  latestMessage?: WhatsAppMessage | null;
};

export type WhatsAppDraftProduct = {
  id: string;
  name?: string | null;
  sku?: string | null;
  serial?: string | null;
  barcode?: string | null;
  brand?: string | null;
  category?: string | null;
  sellPrice?: number;
  stockQty?: number;
  branchQty?: number | null;
  availableQty?: number | null;
};

export type WhatsAppDraftItem = {
  id: string;
  saleId?: string | null;
  productId: string;
  quantity: number;
  price: number;
  unitPrice: number;
  product?: WhatsAppDraftProduct | null;
};

export type WhatsAppSaleDraft = {
  id: string;
  tenantId?: string | null;
  cashierId?: string | null;
  customerId?: string | null;
  conversationId?: string | null;
  branchId?: string | null;
  branch?: WhatsAppBranch | null;
  total: number;
  saleType: WhatsAppSaleType;
  amountPaid: number;
  balanceDue: number;
  dueDate?: string | null;
  status?: string | null;
  isDraft?: boolean;
  draftSource?: string | null;
  receiptNumber?: string | null;
  invoiceNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  finalizedAt?: string | null;
  customer?: WhatsAppCustomer | null;
  conversation?: Pick<WhatsAppConversation, "id" | "phone" | "status" | "branchId"> | null;
  items: WhatsAppDraftItem[];
};

export type WhatsAppPayment = {
  id: string;
  amount: number;
  method: string;
  branchId?: string | null;
  createdAt?: string | null;
  note?: string | null;
};

export type WhatsAppCashMovement = {
  id: string;
  type?: string | null;
  reason?: string | null;
  amount?: string | null;
  note?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
};

export type WhatsAppPromotionProduct = {
  id: string;
  name?: string | null;
  sku?: string | null;
  serial?: string | null;
  sellPrice?: number;
  stockQty?: number;
};

export type WhatsAppPromotionCreator = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export type WhatsAppPromotionUsage = {
  broadcastCount: number;
  hasBeenUsedInBroadcast: boolean;
};

export type WhatsAppPromotion = {
  id: string;
  tenantId?: string | null;
  title: string;
  message: string;
  productId?: string | null;
  createdById?: string | null;
  sentAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  status?: "DRAFT" | "SENT" | string;
  canEdit?: boolean;
  canDelete?: boolean;
  usage?: WhatsAppPromotionUsage;
  product?: WhatsAppPromotionProduct | null;
  createdBy?: WhatsAppPromotionCreator | null;
};

export type WhatsAppBroadcastPromotion = {
  id: string;
  title?: string | null;
  message?: string | null;
  productId?: string | null;
  sentAt?: string | null;
  createdAt?: string | null;
};

export type WhatsAppBroadcastCreator = {
  id: string;
  name?: string | null;
  role?: string | null;
};

export type WhatsAppBroadcast = {
  id: string;
  tenantId?: string | null;
  accountId?: string | null;
  promotionId?: string | null;
  templateName: string;
  languageCode: string;
  status: WhatsAppBroadcastStatus;
  createdById?: string | null;
  queuedAt?: string | null;
  sentAt?: string | null;
  createdAt?: string | null;
  account?: WhatsAppAccount | null;
  promotion?: WhatsAppBroadcastPromotion | null;
  createdBy?: WhatsAppBroadcastCreator | null;
  recipientCount?: number;
  deliveredCount?: number;
};

export type WhatsAppBroadcastTargeting = {
  mode: WhatsAppTargetMode;
  branchId?: string | null;
  productId?: string | null;
  customerIds?: string[];
};

export type WhatsAppBroadcastSendSummary = {
  targetMode?: WhatsAppTargetMode;
  branchId?: string | null;
  productId?: string | null;
  attempted?: number;
  delivered?: number;
  failed?: number;
  skippedDuplicate?: number;
  failurePreview?: Array<{
    customerId?: string | null;
    phone?: string | null;
    message?: string | null;
  }>;
};

export type WhatsAppConversationsResponse = {
  ok?: boolean;
  conversations?: WhatsAppConversation[];
};

export type WhatsAppMessagesResponse = {
  ok?: boolean;
  conversationId?: string;
  conversation?: WhatsAppConversation | null;
  messages?: WhatsAppMessage[];
};

export type WhatsAppSaleDraftsResponse = {
  ok?: boolean;
  drafts?: WhatsAppSaleDraft[];
};

export type WhatsAppSaleDraftResponse = {
  ok?: boolean;
  draft?: WhatsAppSaleDraft | null;
};

export type WhatsAppReplyResponse = {
  sent?: boolean;
  message?: WhatsAppMessage | null;
};

export type WhatsAppStatusResponse = {
  updated?: {
    id: string;
    status: WhatsAppConversationStatus;
    updatedAt?: string | null;
  } | null;
};

export type WhatsAppPromotionsResponse = {
  ok?: boolean;
  promotions?: WhatsAppPromotion[];
};

export type WhatsAppPromotionResponse = {
  ok?: boolean;
  created?: boolean;
  updated?: boolean;
  promotion?: WhatsAppPromotion | null;
};

export type WhatsAppDeletePromotionResponse = {
  ok?: boolean;
  deleted?: boolean;
  promotionId?: string;
};

export type WhatsAppBroadcastsResponse = {
  ok?: boolean;
  broadcasts?: WhatsAppBroadcast[];
};

export type WhatsAppBroadcastResponse = {
  ok?: boolean;
  message?: string;
  broadcast?: WhatsAppBroadcast | null;
};

export type WhatsAppSendBroadcastResponse = {
  ok?: boolean;
  message?: string;
  broadcast?: WhatsAppBroadcast | null;
  summary?: WhatsAppBroadcastSendSummary;
};

export type CreateWhatsAppSaleDraftPayload = {
  branchId?: string | null;
  customerId?: string | null;
  customer?: {
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    tinNumber?: string | null;
    idNumber?: string | null;
    notes?: string | null;
  } | null;
  saleType?: WhatsAppSaleType;
  dueDate?: string | null;
  items: Array<{
    productId: string;
    quantity: number | string;
    unitPrice?: number | string | null;
  }>;
};

export type UpdateWhatsAppSaleDraftPayload = Partial<CreateWhatsAppSaleDraftPayload>;

export type FinalizeWhatsAppSaleDraftPayload = {
  branchId?: string | null;
  saleType?: WhatsAppSaleType;
  amountPaid?: number | string;
  paymentMethod?: WhatsAppPaymentMethod;
  method?: WhatsAppPaymentMethod;
  dueDate?: string | null;
  note?: string | null;
  customer?: CreateWhatsAppSaleDraftPayload["customer"];
};

export type CreateWhatsAppPromotionPayload = {
  title: string;
  message: string;
  productId?: string | null;
};

export type UpdateWhatsAppPromotionPayload = Partial<CreateWhatsAppPromotionPayload>;

export type CreateWhatsAppBroadcastPayload = {
  accountId?: string | null;
  promotionId?: string | null;
  templateName: string;
  languageCode?: string | null;
  targeting?: WhatsAppBroadcastTargeting;
};

export type UpdateWhatsAppBroadcastPayload = Partial<CreateWhatsAppBroadcastPayload>;

export type SendWhatsAppBroadcastPayload = {
  limit?: number | string;
  targeting?: WhatsAppBroadcastTargeting;
};

export type CreateWhatsAppSaleDraftResponse = {
  created?: boolean;
  draft?: WhatsAppSaleDraft | null;
  branch?: WhatsAppBranch | null;
};

export type UpdateWhatsAppSaleDraftResponse = {
  updated?: boolean;
  draft?: WhatsAppSaleDraft | null;
  branch?: WhatsAppBranch | null;
};

export type DeleteWhatsAppSaleDraftResponse = {
  deleted?: boolean;
  saleId?: string;
};

export type FinalizeWhatsAppSaleDraftResponse = {
  finalized?: boolean;
  sale?: WhatsAppSaleDraft | null;
  branch?: WhatsAppBranch | null;
  payment?: WhatsAppPayment | null;
  cashMovement?: WhatsAppCashMovement | null;
};