"use strict";

const prisma = require("../../config/database");
const { renderProformaHtml } = require("../documents/documentRender.service");
const {
  reserveProformaDocumentNumberTx,
  reserveSaleDocumentNumbersTx,
} = require("../documents/documentNumber.service");
const { buildTenantDocumentBranding } = require("../documents/documentBranding.service");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../lib/pagination");

function getTenantId(req) {
  return req.user?.tenantId || null;
}

function getUserId(req) {
  return req.user?.userId || req.user?.id || null;
}

function getActiveBranchId(req) {
  return req.user?.branchId || req.branch?.id || null;
}

function canViewAllBranches(req) {
  return Boolean(req.user?.canViewAllBranches);
}

function cleanString(value) {
  const s = String(value ?? "").trim();
  return s || null;
}

function oneLine(value) {
  const s = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return s || null;
}

function toInt(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function toNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStatus(value) {
  const v = String(value || "").trim().toUpperCase();
  if (["DRAFT", "SENT", "EXPIRED", "CONVERTED", "CANCELLED"].includes(v)) return v;
  return null;
}

function normalizeSource(value) {
  const source = String(value || "").trim().toUpperCase();
  if (!source) return null;
  if (source === "WHATSAPP") return "WHATSAPP";
  return source.slice(0, 80);
}

function modelHasField(delegate, fieldName) {
  try {
    return typeof delegate?.fields?.[fieldName] !== "undefined";
  } catch {
    return false;
  }
}

function appendUniqueLines(...groups) {
  const seen = new Set();
  const lines = [];

  groups
    .flatMap((group) => String(group || "").split("\n"))
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      lines.push(line);
    });

  return lines.length ? lines.join("\n") : null;
}

function polishedProductName(value) {
  const clean = oneLine(value) || "—";

  if (clean === "—") return clean;

  const hasUppercase = /[A-Z]/.test(clean);
  const hasLowercase = /[a-z]/.test(clean);

  if (hasLowercase && !hasUppercase) {
    return clean
      .split(" ")
      .map((part) => {
        if (!part) return part;
        return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
      })
      .join(" ");
  }

  return clean;
}

function getLocationName(location) {
  if (!location) return null;

  const name = oneLine(location.name);
  const code = oneLine(location.code);

  if (name) return name;
  if (code) return code;

  return null;
}

function getLocationCode(location) {
  if (!location) return null;
  return oneLine(location.code);
}

function serializeSellingLocation(location) {
  if (!location) return null;

  const name = getLocationName(location);
  const code = getLocationCode(location);

  return {
    name,
    code,
    status: location.status || null,
    isMain: Boolean(location.isMain),
    label: name,
  };
}

function resolveProformaBranchScope(req) {
  const requestedBranchId =
    cleanString(req.query?.branchId) ||
    cleanString(req.headers["x-branch-id"]) ||
    null;

  const allBranchesRequested =
    String(req.query?.allBranches || "")
      .trim()
      .toLowerCase() === "true";

  const allowedBranchIds = Array.isArray(req.user?.allowedBranchIds)
    ? req.user.allowedBranchIds
    : [];

  if (allBranchesRequested) {
    if (!canViewAllBranches(req)) {
      const error = new Error("LOCATION_ACCESS_DENIED");
      error.code = "LOCATION_ACCESS_DENIED";
      throw error;
    }

    return {
      mode: "ALL_BRANCHES",
      branchId: null,
      allowedBranchIds,
    };
  }

  if (requestedBranchId) {
    if (
      !canViewAllBranches(req) &&
      allowedBranchIds.length > 0 &&
      !allowedBranchIds.includes(requestedBranchId)
    ) {
      const error = new Error("LOCATION_ACCESS_DENIED");
      error.code = "LOCATION_ACCESS_DENIED";
      throw error;
    }

    return {
      mode: "SINGLE_BRANCH",
      branchId: requestedBranchId,
      allowedBranchIds,
    };
  }

  return {
    mode: "SINGLE_BRANCH",
    branchId: getActiveBranchId(req),
    allowedBranchIds,
  };
}

function applyProformaBranchScope(where, scope) {
  const next = { ...(where || {}) };

  if (
    scope?.mode === "SINGLE_BRANCH" &&
    scope?.branchId &&
    typeof prisma.proforma.fields?.branchId !== "undefined"
  ) {
    next.branchId = scope.branchId;
  }

  return next;
}

async function ensureWritableBranchAccessOrThrow(req) {
  const tenantId = getTenantId(req);
  const branchId = getActiveBranchId(req);

  if (!tenantId || !branchId) {
    const error = new Error("LOCATION_REQUIRED");
    error.code = "LOCATION_REQUIRED";
    throw error;
  }

  const allowedBranchIds = Array.isArray(req.user?.allowedBranchIds)
    ? req.user.allowedBranchIds
    : [];

  if (
    !canViewAllBranches(req) &&
    allowedBranchIds.length > 0 &&
    !allowedBranchIds.includes(branchId)
  ) {
    const error = new Error("LOCATION_ACCESS_DENIED");
    error.code = "LOCATION_ACCESS_DENIED";
    throw error;
  }

  const location = await prisma.branch.findFirst({
    where: {
      id: branchId,
      tenantId,
      status: {
        in: ["ACTIVE", "CLOSED"],
      },
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      code: true,
      status: true,
      isMain: true,
    },
  });

  if (!location) {
    const error = new Error("LOCATION_NOT_FOUND");
    error.code = "LOCATION_NOT_FOUND";
    throw error;
  }

  if (location.status !== "ACTIVE") {
    const error = new Error("LOCATION_NOT_ACTIVE");
    error.code = "LOCATION_NOT_ACTIVE";
    throw error;
  }

  return location;
}

function sendLocationError(res, error) {
  const code = String(error?.code || error?.message || "");

  if (code === "LOCATION_REQUIRED" || code === "BRANCH_REQUIRED") {
    return res.status(400).json({
      message: "No active selling location selected",
      code: "LOCATION_REQUIRED",
    });
  }

  if (code === "LOCATION_ACCESS_DENIED" || code === "BRANCH_ACCESS_DENIED") {
    return res.status(403).json({
      message: "You do not have access to this selling location",
      code: "LOCATION_ACCESS_DENIED",
    });
  }

  if (code === "LOCATION_NOT_FOUND" || code === "BRANCH_NOT_FOUND") {
    return res.status(404).json({
      message: "Selling location not found",
      code: "LOCATION_NOT_FOUND",
    });
  }

  if (code === "LOCATION_NOT_ACTIVE" || code === "BRANCH_NOT_ACTIVE") {
    return res.status(409).json({
      message: "Selected selling location is not active",
      code: "LOCATION_NOT_ACTIVE",
    });
  }

  return null;
}

function mapProformaListRow(proforma) {
  const sellingLocation = serializeSellingLocation(proforma.branch);

  return {
    id: proforma.id,
    number: proforma.number,
    status: proforma.status,
    customerName: proforma.customerName,
    customerPhone: proforma.customerPhone,
    customerEmail: proforma.customerEmail,
    total: Number(proforma.total || 0),
    subtotal: Number(proforma.subtotal || 0),
    currency: proforma.currency || "RWF",
    validUntil: proforma.validUntil || null,
    preparedBy: proforma.preparedBy || null,
    reference: proforma.reference || null,
    source: proforma.source || null,
    conversationId: proforma.conversationId || null,
    draftSaleId: proforma.draftSaleId || null,
    convertedToSaleId: proforma.convertedToSaleId || null,
    convertedAt: proforma.convertedAt || null,
    itemsCount: Array.isArray(proforma.items) ? proforma.items.length : 0,
    createdAt: proforma.createdAt,
    updatedAt: proforma.updatedAt,
    sellingLocation,
    storeLocation: sellingLocation,
  };
}

function mapProformaDetail(proforma, tenant) {
  const sellingLocation =
    serializeSellingLocation(proforma.branch) ||
    (tenant?.sellingLocation
      ? {
          name: oneLine(tenant.sellingLocation),
          code: null,
          status: null,
          isMain: false,
          label: oneLine(tenant.sellingLocation),
        }
      : null);

  return {
    proforma: {
      id: proforma.id,
      number: proforma.number,
      status: proforma.status,
      tenantId: proforma.tenantId,
      customerId: proforma.customerId || null,
      createdById: proforma.createdById || null,

      customerName: proforma.customerName,
      customerPhone: proforma.customerPhone || null,
      customerEmail: proforma.customerEmail || null,
      customerAddress: proforma.customerAddress || null,

      subtotal: Number(proforma.subtotal || 0),
      total: Number(proforma.total || 0),
      currency: proforma.currency || "RWF",

      validUntil: proforma.validUntil || null,
      preparedBy: proforma.preparedBy || null,
      reference: proforma.reference || null,
      notes: proforma.notes || null,
      source: proforma.source || null,
      conversationId: proforma.conversationId || null,
      draftSaleId: proforma.draftSaleId || null,

      convertedToSaleId: proforma.convertedToSaleId || null,
      convertedAt: proforma.convertedAt || null,

      createdAt: proforma.createdAt,
      updatedAt: proforma.updatedAt,

      sellingLocation,
      storeLocation: sellingLocation,

      customer: proforma.customer
        ? {
            id: proforma.customer.id,
            name: proforma.customer.name,
            phone: proforma.customer.phone,
            email: proforma.customer.email || null,
            address: proforma.customer.address || null,
            tinNumber: proforma.customer.tinNumber || null,
            idNumber: proforma.customer.idNumber || null,
            notes: proforma.customer.notes || null,
          }
        : null,

      createdBy: proforma.createdBy
        ? {
            id: proforma.createdBy.id,
            name: proforma.createdBy.name || null,
            email: proforma.createdBy.email || null,
            phone: proforma.createdBy.phone || null,
            role: proforma.createdBy.role || null,
          }
        : null,

      store: tenant
        ? {
            name: tenant.name || null,
            phone: tenant.phone || null,
            email: tenant.email || null,
            logoUrl: tenant.logoUrl || null,
            logoSignedUrl: tenant.logoSignedUrl || null,
            receiptHeader: tenant.receiptHeader || null,
            receiptFooter: tenant.receiptFooter || null,
            documentPrimaryColor: tenant.documentPrimaryColor || "#1F365C",
            documentAccentColor: tenant.documentAccentColor || "#D8D2C2",
            documentHeaderDisplay: tenant.documentHeaderDisplay || "LOGO_AND_NAME",
            documentSizeMode: tenant.documentSizeMode || "AUTO",
            invoiceTerms: tenant.invoiceTerms || null,
            warrantyTerms: tenant.warrantyTerms || null,
            proformaTerms: tenant.proformaTerms || null,
            deliveryNoteTerms: tenant.deliveryNoteTerms || null,
            sellingLocation: sellingLocation?.label || tenant.sellingLocation || null,
            storeLocation: sellingLocation?.label || tenant.storeLocation || null,
          }
        : null,

      items: Array.isArray(proforma.items)
        ? proforma.items.map((item) => ({
            id: item.id,
            proformaId: item.proformaId,
            productId: item.productId || null,
            productName: polishedProductName(item.productName),
            serial: item.serial || null,
            quantity: Number(item.quantity || 0),
            unitPrice: Number(item.unitPrice || 0),
            total: Number(item.total || 0),
            createdAt: item.createdAt,
            product: item.product
              ? {
                  id: item.product.id,
                  name: polishedProductName(item.product.name),
                  sku: item.product.sku || null,
                  barcode: item.product.barcode || null,
                  serial: item.product.serial || null,
                }
              : null,
          }))
        : [],
    },
  };
}

function proformaInclude() {
  return {
    ...(typeof prisma.proforma.fields?.branchId !== "undefined"
      ? {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              isMain: true,
            },
          },
        }
      : {}),
    customer: {
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        tinNumber: true,
        idNumber: true,
        notes: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    },
    items: {
      orderBy: [{ createdAt: "asc" }],
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            serial: true,
          },
        },
      },
    },
  };
}

async function listProformas(req, res) {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope = resolveProformaBranchScope(req);
    const q = cleanString(req.query.q);
    const status = normalizeStatus(req.query.status);

    const pagination = parsePagination(req.query, {
      defaultLimit: 30,
      maxLimit: 100,
    });

    const where = applyProformaBranchScope({ tenantId }, scope);

    if (status) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { number: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { preparedBy: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
      ];
    }


    await prisma.proforma.updateMany({
      where: {
        tenantId,
        status: {
          in: ["DRAFT", "SENT"],
        },
        validUntil: {
          lt: new Date(),
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    const [total, rows] = await prisma.$transaction([
      prisma.proforma.count({ where }),
      prisma.proforma.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.limit,
        select: {
          id: true,
          ...(typeof prisma.proforma.fields?.branchId !== "undefined" ? { branchId: true } : {}),
          ...(typeof prisma.proforma.fields?.branchId !== "undefined"
            ? {
                branch: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    status: true,
                    isMain: true,
                  },
                },
              }
            : {}),
          number: true,
          status: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          subtotal: true,
          total: true,
          currency: true,
          validUntil: true,
          preparedBy: true,
          reference: true,
          ...(modelHasField(prisma.proforma, "source") ? { source: true } : {}),
          ...(modelHasField(prisma.proforma, "conversationId") ? { conversationId: true } : {}),
          ...(modelHasField(prisma.proforma, "draftSaleId") ? { draftSaleId: true } : {}),
          convertedToSaleId: true,
          convertedAt: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: { id: true },
          },
        },
      }),
    ]);

    return res.json({
      proformas: rows.map(mapProformaListRow),
      count: rows.length,
      pagination: buildPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    });
  } catch (error) {
    const handled = sendLocationError(res, error);
    if (handled) return handled;

    console.error("listProformas error:", error);
    return res.status(500).json({ message: "Failed to load proformas" });
  }
}

async function createProforma(req, res) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const activeLocation = await ensureWritableBranchAccessOrThrow(req);

    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      validUntil,
      preparedBy,
      reference,
      notes,
      currency,
      items,
      status,
      source,
      conversationId,
      draftSaleId,
    } = req.body || {};

    const cleanCustomerName = cleanString(customerName);

    if (!cleanCustomerName) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    const list = Array.isArray(items) ? items : [];

    if (list.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    for (const item of list) {
      const productName = cleanString(item.productName);
      const quantity = toInt(item.quantity, NaN);
      const unitPrice = toNumber(item.unitPrice, NaN);

      if (!productName) {
        return res.status(400).json({ message: "Each item must have a product name" });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: "Each item quantity must be a positive whole number",
        });
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({
          message: "Each item price must be a valid number",
        });
      }
    }

    const parsedValidUntil = validUntil ? new Date(validUntil) : null;

    if (validUntil && Number.isNaN(parsedValidUntil.getTime())) {
      return res.status(400).json({ message: "Valid until date is invalid" });
    }

    const finalStatus = normalizeStatus(status) || "DRAFT";

    if (["CONVERTED", "EXPIRED"].includes(finalStatus)) {
      return res.status(400).json({
        message: "Cannot create a proforma directly in this status",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let customer = null;
      let linkedConversation = null;
      let linkedDraftSale = null;

      const cleanSource = normalizeSource(source);
      let cleanConversationId = cleanString(conversationId);
      const cleanDraftSaleId = cleanString(draftSaleId);

      if (cleanConversationId) {
        linkedConversation = await tx.whatsAppConversation.findFirst({
          where: {
            id: cleanConversationId,
            tenantId,
          },
          select: {
            id: true,
            customerId: true,
            phone: true,
          },
        });

        if (!linkedConversation) {
          throw new Error("WHATSAPP_CONVERSATION_NOT_FOUND");
        }
      }

      if (cleanDraftSaleId) {
        linkedDraftSale = await tx.sale.findFirst({
          where: {
            id: cleanDraftSaleId,
            tenantId,
            isDraft: true,
            draftSource: "WHATSAPP",
          },
          select: {
            id: true,
            customerId: true,
            conversationId: true,
          },
        });

        if (!linkedDraftSale) {
          throw new Error("WHATSAPP_DRAFT_SALE_NOT_FOUND");
        }

        if (!cleanConversationId && linkedDraftSale.conversationId) {
          cleanConversationId = linkedDraftSale.conversationId;
          linkedConversation = await tx.whatsAppConversation.findFirst({
            where: {
              id: cleanConversationId,
              tenantId,
            },
            select: {
              id: true,
              customerId: true,
              phone: true,
            },
          });
        }
      }

      const resolvedCustomerId =
        cleanString(customerId) ||
        cleanString(linkedDraftSale?.customerId) ||
        cleanString(linkedConversation?.customerId);

      if (resolvedCustomerId) {
        customer = await tx.customer.findFirst({
          where: {
            id: resolvedCustomerId,
            tenantId,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        });

        if (!customer) {
          throw new Error("CUSTOMER_NOT_FOUND");
        }
      }

      const createdAt = new Date();
      const documentNumber = await reserveProformaDocumentNumberTx(tx, {
        tenantId,
        createdAt,
      });

      const preparedByText =
        cleanString(preparedBy) || req.user?.name || req.user?.email || "Store staff";

      const itemRows = list.map((item) => {
        const quantity = toInt(item.quantity, 0);
        const unitPrice = toNumber(item.unitPrice, 0);

        return {
          productId: cleanString(item.productId),
          productName: polishedProductName(item.productName),
          serial: cleanString(item.serial),
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        };
      });

      const subtotal = itemRows.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const total = subtotal;

      const createData = {
        tenantId,
        customerId: customer?.id || resolvedCustomerId || null,
        createdById: userId || null,

        number: documentNumber.proformaNumber,
        status: finalStatus,

        customerName: cleanCustomerName,
        customerPhone: cleanString(customerPhone) || customer?.phone || null,
        customerEmail: cleanString(customerEmail) || customer?.email || null,
        customerAddress: cleanString(customerAddress) || customer?.address || null,

        subtotal,
        total,
        currency: cleanString(currency) || "RWF",

        validUntil: parsedValidUntil,
        preparedBy: preparedByText,
        reference: cleanString(reference) || (cleanConversationId ? `WHATSAPP:${cleanConversationId}` : null),
        notes: appendUniqueLines(
          cleanSource === "WHATSAPP" ? "Source: WhatsApp" : null,
          cleanConversationId ? `Conversation ID: ${cleanConversationId}` : null,
          cleanDraftSaleId ? `Draft sale ID: ${cleanDraftSaleId}` : null,
          notes,
        ),
      };

      if (typeof tx.proforma.fields?.branchId !== "undefined") {
        createData.branchId = activeLocation.id;
      }

      if (modelHasField(tx.proforma, "source")) {
        createData.source = cleanSource;
      }

      if (modelHasField(tx.proforma, "conversationId")) {
        createData.conversationId = cleanConversationId || null;
      }

      if (modelHasField(tx.proforma, "draftSaleId")) {
        createData.draftSaleId = cleanDraftSaleId || null;
      }

      const proforma = await tx.proforma.create({
        data: createData,
        select: {
          id: true,
          ...(typeof tx.proforma.fields?.branchId !== "undefined" ? { branchId: true } : {}),
          number: true,
          status: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          customerAddress: true,
          subtotal: true,
          total: true,
          currency: true,
          validUntil: true,
          preparedBy: true,
          reference: true,
          notes: true,
          ...(modelHasField(tx.proforma, "source") ? { source: true } : {}),
          ...(modelHasField(tx.proforma, "conversationId") ? { conversationId: true } : {}),
          ...(modelHasField(tx.proforma, "draftSaleId") ? { draftSaleId: true } : {}),
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.proformaItem.createMany({
        data: itemRows.map((item) => ({
          proformaId: proforma.id,
          productId: item.productId || null,
          productName: item.productName,
          serial: item.serial || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      });

      return proforma;
    });

    return res.status(201).json({
      created: true,
      proforma: result,
    });
  } catch (error) {
    const handled = sendLocationError(res, error);
    if (handled) return handled;

    const code = String(error?.message || "");

    if (code === "CUSTOMER_NOT_FOUND") {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (code === "WHATSAPP_CONVERSATION_NOT_FOUND") {
      return res.status(404).json({ message: "WhatsApp conversation not found" });
    }

    if (code === "WHATSAPP_DRAFT_SALE_NOT_FOUND") {
      return res.status(404).json({ message: "WhatsApp draft sale not found" });
    }

    console.error("createProforma error:", error);
    return res.status(500).json({ message: "Failed to create proforma" });
  }
}

async function getProforma(req, res) {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope = resolveProformaBranchScope(req);
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({ message: "Proforma reference is required" });
    }

    const proforma = await prisma.proforma.findFirst({
      where: applyProformaBranchScope(
        {
          tenantId,
          OR: [{ id }, { number: id }],
        },
        scope,
      ),
      include: proformaInclude(),
    });

    if (!proforma) {
      return res.status(404).json({ message: "Proforma not found" });
    }

    const tenant = await buildTenantDocumentBranding(
      prisma,
      tenantId,
      proforma.branchId || null,
    );

    return res.json(mapProformaDetail(proforma, tenant));
  } catch (error) {
    const handled = sendLocationError(res, error);
    if (handled) return handled;

    console.error("getProforma error:", error);
    return res.status(500).json({ message: "Failed to load proforma" });
  }
}

async function updateProforma(req, res) {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope = resolveProformaBranchScope(req);
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({ message: "Proforma reference is required" });
    }

    const existing = await prisma.proforma.findFirst({
      where: applyProformaBranchScope(
        {
          tenantId,
          OR: [{ id }, { number: id }],
        },
        scope,
      ),
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Proforma not found" });
    }

    if (existing.status === "CONVERTED" || existing.status === "CANCELLED") {
      return res.status(400).json({ message: "This proforma can no longer be edited" });
    }

    const nextStatus = req.body?.status ? normalizeStatus(req.body.status) : null;

    if (req.body?.status && !nextStatus) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (nextStatus === "CONVERTED") {
      return res.status(400).json({
        message: "Use the conversion flow to mark a proforma as converted",
      });
    }

    const payloadItems = Array.isArray(req.body?.items) ? req.body.items : null;

    if (payloadItems) {
      if (payloadItems.length === 0) {
        return res.status(400).json({ message: "Items cannot be empty" });
      }

      for (const item of payloadItems) {
        const productName = cleanString(item.productName);
        const quantity = toInt(item.quantity, NaN);
        const unitPrice = toNumber(item.unitPrice, NaN);

        if (!productName) {
          return res.status(400).json({ message: "Each item must have a product name" });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
          return res.status(400).json({
            message: "Each item quantity must be a positive whole number",
          });
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          return res.status(400).json({
            message: "Each item price must be a valid number",
          });
        }
      }
    }

    const parsedValidUntil =
      req.body?.validUntil === undefined
        ? undefined
        : req.body?.validUntil
          ? new Date(req.body.validUntil)
          : null;

    if (parsedValidUntil !== undefined && parsedValidUntil !== null) {
      if (Number.isNaN(parsedValidUntil.getTime())) {
        return res.status(400).json({ message: "Valid until date is invalid" });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let subtotal;
      let total;

      if (payloadItems) {
        const itemRows = payloadItems.map((item) => {
          const quantity = toInt(item.quantity, 0);
          const unitPrice = toNumber(item.unitPrice, 0);

          return {
            productId: cleanString(item.productId),
            productName: polishedProductName(item.productName),
            serial: cleanString(item.serial),
            quantity,
            unitPrice,
            total: quantity * unitPrice,
          };
        });

        subtotal = itemRows.reduce((sum, item) => sum + Number(item.total || 0), 0);
        total = subtotal;

        await tx.proformaItem.deleteMany({
          where: { proformaId: existing.id },
        });

        await tx.proformaItem.createMany({
          data: itemRows.map((item) => ({
            proformaId: existing.id,
            productId: item.productId || null,
            productName: item.productName,
            serial: item.serial || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        });
      }

      return tx.proforma.update({
        where: { id: existing.id },
        data: {
          ...(req.body?.customerName !== undefined
            ? { customerName: cleanString(req.body.customerName) || undefined }
            : {}),
          ...(req.body?.customerPhone !== undefined
            ? { customerPhone: cleanString(req.body.customerPhone) }
            : {}),
          ...(req.body?.customerEmail !== undefined
            ? { customerEmail: cleanString(req.body.customerEmail) }
            : {}),
          ...(req.body?.customerAddress !== undefined
            ? { customerAddress: cleanString(req.body.customerAddress) }
            : {}),
          ...(req.body?.currency !== undefined
            ? { currency: cleanString(req.body.currency) || "RWF" }
            : {}),
          ...(req.body?.preparedBy !== undefined
            ? { preparedBy: cleanString(req.body.preparedBy) }
            : {}),
          ...(req.body?.reference !== undefined
            ? { reference: cleanString(req.body.reference) }
            : {}),
          ...(req.body?.notes !== undefined ? { notes: cleanString(req.body.notes) } : {}),
          ...(parsedValidUntil !== undefined ? { validUntil: parsedValidUntil } : {}),
          ...(nextStatus ? { status: nextStatus } : {}),
          ...(subtotal !== undefined ? { subtotal } : {}),
          ...(total !== undefined ? { total } : {}),
        },
        select: {
          id: true,
          ...(typeof tx.proforma.fields?.branchId !== "undefined" ? { branchId: true } : {}),
          number: true,
          status: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          customerAddress: true,
          subtotal: true,
          total: true,
          currency: true,
          validUntil: true,
          preparedBy: true,
          reference: true,
          notes: true,
          convertedToSaleId: true,
          convertedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    return res.json({
      updated: true,
      proforma: result,
    });
  } catch (error) {
    const handled = sendLocationError(res, error);
    if (handled) return handled;

    console.error("updateProforma error:", error);
    return res.status(500).json({ message: "Failed to update proforma" });
  }
}

async function deleteProforma(req, res) {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope = resolveProformaBranchScope(req);
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({ message: "Proforma reference is required" });
    }

    const existing = await prisma.proforma.findFirst({
      where: applyProformaBranchScope(
        {
          tenantId,
          OR: [{ id }, { number: id }],
        },
        scope,
      ),
      select: {
        id: true,
        number: true,
        status: true,
        convertedToSaleId: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Proforma not found" });
    }

    if (existing.status === "CONVERTED" || existing.convertedToSaleId) {
      return res.status(400).json({
        message: "Converted proformas cannot be deleted",
      });
    }

    await prisma.proforma.delete({
      where: { id: existing.id },
    });

    return res.json({
      deleted: true,
      id: existing.id,
      number: existing.number || null,
    });
  } catch (error) {
    const handled = sendLocationError(res, error);
    if (handled) return handled;

    console.error("deleteProforma error:", error);
    return res.status(500).json({ message: "Failed to delete proforma" });
  }
}


async function duplicateProforma(req, res) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const activeLocation = await ensureWritableBranchAccessOrThrow(req);
    const scope = resolveProformaBranchScope(req);
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({ message: "Proforma reference is required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.proforma.findFirst({
        where: applyProformaBranchScope(
          {
            tenantId,
            OR: [{ id }, { number: id }],
          },
          scope,
        ),
        include: {
          items: {
            orderBy: [{ createdAt: "asc" }],
          },
        },
      });

      if (!source) {
        throw new Error("PROFORMA_NOT_FOUND");
      }

      if (!Array.isArray(source.items) || source.items.length === 0) {
        throw new Error("PROFORMA_HAS_NO_ITEMS");
      }

      const createdAt = new Date();
      const documentNumber = await reserveProformaDocumentNumberTx(tx, {
        tenantId,
        createdAt,
      });

      const created = await tx.proforma.create({
        data: {
          tenantId,
          branchId: typeof tx.proforma.fields?.branchId !== "undefined"
            ? source.branchId || activeLocation.id
            : undefined,
          customerId: source.customerId || null,
          createdById: userId || source.createdById || null,

          number: documentNumber.proformaNumber,
          status: "DRAFT",

          customerName: source.customerName,
          customerPhone: source.customerPhone || null,
          customerEmail: source.customerEmail || null,
          customerAddress: source.customerAddress || null,

          subtotal: Number(source.subtotal || 0),
          total: Number(source.total || 0),
          currency: source.currency || "RWF",

          validUntil: source.validUntil || null,
          preparedBy: source.preparedBy || req.user?.name || req.user?.email || "Store staff",
          reference: source.reference || null,
          notes: source.notes || null,
        },
        select: {
          id: true,
          number: true,
          status: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          customerAddress: true,
          subtotal: true,
          total: true,
          currency: true,
          validUntil: true,
          preparedBy: true,
          reference: true,
          notes: true,
          ...(modelHasField(tx.proforma, "source") ? { source: true } : {}),
          ...(modelHasField(tx.proforma, "conversationId") ? { conversationId: true } : {}),
          ...(modelHasField(tx.proforma, "draftSaleId") ? { draftSaleId: true } : {}),
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.proformaItem.createMany({
        data: source.items.map((item) => ({
          proformaId: created.id,
          productId: item.productId || null,
          productName: polishedProductName(item.productName),
          serial: item.serial || null,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
          total: Number(item.total || 0),
        })),
      });

      return created;
    });

    return res.status(201).json({
      duplicated: true,
      proforma: result,
    });
  } catch (error) {
    const handled = sendLocationError(res, error);
    if (handled) return handled;

    const msg = String(error?.message || "");

    if (msg === "PROFORMA_NOT_FOUND") {
      return res.status(404).json({ message: "Proforma not found" });
    }

    if (msg === "PROFORMA_HAS_NO_ITEMS") {
      return res.status(400).json({ message: "This proforma has no products to duplicate" });
    }

    console.error("duplicateProforma error:", error);
    return res.status(500).json({ message: "Failed to duplicate proforma" });
  }
}

async function printProformaHtml(req, res) {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).send("Unauthorized");
    }

    const scope = resolveProformaBranchScope(req);
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).send("Proforma reference is required");
    }

    const proforma = await prisma.proforma.findFirst({
      where: applyProformaBranchScope(
        {
          tenantId,
          OR: [{ id }, { number: id }],
        },
        scope,
      ),
      include: {
        ...(typeof prisma.proforma.fields?.branchId !== "undefined"
          ? {
              branch: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  status: true,
                  isMain: true,
                },
              },
            }
          : {}),
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        items: {
          orderBy: [{ createdAt: "asc" }],
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                serial: true,
              },
            },
          },
        },
      },
    });

    if (!proforma) {
      return res.status(404).send("Proforma not found");
    }

    const tenant = await buildTenantDocumentBranding(
      prisma,
      tenantId,
      proforma.branchId || null,
    );

    const sellingLocation =
      getLocationName(proforma.branch) ||
      oneLine(tenant?.sellingLocation) ||
      oneLine(tenant?.storeLocation) ||
      oneLine(tenant?.locationName) ||
      null;

    const items = (proforma.items || []).map((item) => ({
      productName: polishedProductName(item.productName || item.product?.name || "—"),
      serial: item.serial || item.product?.serial || null,
      sku: item.product?.sku || null,
      barcode: item.product?.barcode || null,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      price: Number(item.unitPrice || 0),
      total: Number(item.total || 0),
    }));

    const subtotalFromItems = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const subtotal = Number(proforma.subtotal || 0) || subtotalFromItems;
    const total = Number(proforma.total || 0) || subtotal;

    const html = renderProformaHtml({
      tenant: {
        ...tenant,
        sellingLocation,
        storeLocation: sellingLocation,
        locationName: sellingLocation,
      },
      document: {
        number: proforma.number,
        date: proforma.createdAt,
        createdAt: proforma.createdAt,
      },
      customer: proforma.customer
        ? {
            name: proforma.customer.name || proforma.customerName || "Walk-in Customer",
            phone: proforma.customer.phone || proforma.customerPhone || null,
            email: proforma.customer.email || proforma.customerEmail || null,
            address: proforma.customer.address || proforma.customerAddress || null,
          }
        : {
            name: proforma.customerName || "Walk-in Customer",
            phone: proforma.customerPhone || null,
            email: proforma.customerEmail || null,
            address: proforma.customerAddress || null,
          },
      items,
      totals: {
        subtotal,
        total,
        amountPaid: 0,
        balanceDue: 0,
        currency: proforma.currency || "RWF",
      },
      extra: {
        notes:
          proforma.notes ||
          tenant?.proformaTerms ||
          "This proforma is not a final invoice and does not confirm payment.",
        preparedBy: oneLine(proforma.preparedBy) || "Store staff",
        validUntil: proforma.validUntil,
        reference: oneLine(proforma.reference) || "—",
        sellingLocation,
        storeLocation: sellingLocation,
        locationLabel: "Selling location",
      },
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    const code = String(error?.code || error?.message || "");

    if (code === "LOCATION_ACCESS_DENIED" || code === "BRANCH_ACCESS_DENIED") {
      return res.status(403).send("You do not have access to this selling location");
    }

    console.error("printProformaHtml error:", error);
    return res.status(500).send("Failed to render proforma");
  }
}

async function convertProformaToSale(req, res) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const activeLocation = await ensureWritableBranchAccessOrThrow(req);
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({ message: "Proforma reference is required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const proforma = await tx.proforma.findFirst({
        where: {
          tenantId,
          OR: [{ id }, { number: id }],
        },
        include: {
          customer: true,
          items: true,
        },
      });

      if (!proforma) throw new Error("PROFORMA_NOT_FOUND");
      if (proforma.status === "CONVERTED" || proforma.convertedToSaleId) {
        throw new Error("PROFORMA_ALREADY_CONVERTED");
      }
      if (proforma.status === "CANCELLED") throw new Error("PROFORMA_CANCELLED");
      if (!Array.isArray(proforma.items) || proforma.items.length === 0) {
        throw new Error("PROFORMA_HAS_NO_ITEMS");
      }

      let customerId = proforma.customerId || null;

      if (!customerId && proforma.customerName && proforma.customerPhone) {
        const existingCustomer = await tx.customer.findFirst({
          where: {
            tenantId,
            phone: proforma.customerPhone,
          },
          select: { id: true },
        });

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const createdCustomer = await tx.customer.create({
            data: {
              tenantId,
              name: proforma.customerName,
              phone: proforma.customerPhone,
              email: proforma.customerEmail || null,
              address: proforma.customerAddress || null,
            },
            select: { id: true },
          });

          customerId = createdCustomer.id;
        }
      }

      const productIds = proforma.items
        .map((item) => item.productId)
        .filter(Boolean)
        .map(String);

      if (productIds.length !== proforma.items.length) {
        throw new Error("PROFORMA_ITEM_PRODUCT_REQUIRED");
      }

      const products = await tx.product.findMany({
        where: {
          tenantId,
          id: { in: productIds },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          stockQty: true,
        },
      });

      const productById = new Map(products.map((product) => [product.id, product]));

      for (const item of proforma.items) {
        const product = productById.get(String(item.productId));
        if (!product) throw new Error("PRODUCT_NOT_FOUND");

        const quantity = Number(item.quantity || 0);
        if (quantity <= 0) throw new Error("INVALID_QUANTITY");

        const updated = await tx.product.updateMany({
          where: {
            id: product.id,
            tenantId,
            isActive: true,
            stockQty: { gte: quantity },
          },
          data: {
            stockQty: { decrement: quantity },
          },
        });

        if (!updated || updated.count !== 1) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name || product.id}`);
        }
      }

      const createdAt = new Date();
      const numbers = await reserveSaleDocumentNumbersTx(tx, {
        tenantId,
        createdAt,
      });

      const subtotal = Number(proforma.subtotal || proforma.total || 0);
      const total = Number(proforma.total || subtotal || 0);

      const sale = await tx.sale.create({
        data: {
          tenantId,
          branchId: proforma.branchId || activeLocation.id,
          cashierId: userId,
          customerId,
          total,
          subtotalAmount: subtotal,
          taxableAmount: subtotal,
          taxMode: "NONE",
          taxDisplayMode: "HIDDEN",
          taxRateBps: 0,
          taxAmount: 0,
          pricesIncludeTax: false,
          showTaxOnCustomerDocuments: false,
          saleType: "CREDIT",
          amountPaid: 0,
          balanceDue: total,
          status: "UNPAID",
          dueDate: proforma.validUntil || null,
          receiptNumber: numbers.receiptNumber,
          invoiceNumber: numbers.invoiceNumber,
          createdAt,
          isDraft: false,
          draftSource: `PROFORMA:${proforma.number || proforma.id}`,
          finalizedAt: createdAt,
        },
        select: {
          id: true,
          invoiceNumber: true,
          receiptNumber: true,
          total: true,
          status: true,
        },
      });

      await tx.saleItem.createMany({
        data: proforma.items.map((item) => ({
          saleId: sale.id,
          productId: String(item.productId),
          quantity: Number(item.quantity || 1),
          price: Number(item.unitPrice || 0),
        })),
      });

      const updatedProforma = await tx.proforma.update({
        where: { id: proforma.id },
        data: {
          status: "CONVERTED",
          convertedToSaleId: sale.id,
          convertedAt: createdAt,
        },
        select: {
          id: true,
          number: true,
          status: true,
          convertedToSaleId: true,
          convertedAt: true,
        },
      });

      return { sale, proforma: updatedProforma };
    });

    return res.status(201).json({
      converted: true,
      saleId: result.sale.id,
      invoiceNumber: result.sale.invoiceNumber,
      receiptNumber: result.sale.receiptNumber,
      sale: result.sale,
      proforma: result.proforma,
    });
  } catch (error) {
    const handled = sendLocationError(res, error);
    if (handled) return handled;

    const msg = String(error?.message || "");

    if (msg === "PROFORMA_NOT_FOUND") {
      return res.status(404).json({ message: "Proforma not found" });
    }

    if (msg === "PROFORMA_ALREADY_CONVERTED") {
      return res.status(400).json({ message: "This proforma is already converted" });
    }

    if (msg === "PROFORMA_CANCELLED") {
      return res.status(400).json({ message: "Cancelled proformas cannot be converted" });
    }

    if (msg === "PROFORMA_HAS_NO_ITEMS") {
      return res.status(400).json({ message: "This proforma has no products" });
    }

    if (msg === "PROFORMA_ITEM_PRODUCT_REQUIRED") {
      return res.status(400).json({
        message: "Every proforma item must be linked to an inventory product before conversion",
      });
    }

    if (msg.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(400).json({
        message: msg.replace("INSUFFICIENT_STOCK:", "Insufficient stock for "),
      });
    }

    console.error("convertProformaToSale error:", error);
    return res.status(500).json({ message: "Failed to convert proforma to sale" });
  }
}

module.exports = {
  listProformas,
  createProforma,
  getProforma,
  updateProforma,
  deleteProforma,
  duplicateProforma,
  printProformaHtml,
  convertProformaToSale,
};
