// src/modules/suppliers/suppliers.controller.js
const { Prisma } = require("@prisma/client");
const prisma = require("../../config/database");

function cleanString(value) {
  const s = value == null ? "" : String(value).trim();
  return s || null;
}

function cleanStringStrict(value) {
  return String(value || "").trim();
}

function toInt(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function toMoney(value, fallback = NaN) {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getTenantId(req) {
  return req.user?.tenantId || req.tenantId || null;
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

function getAllowedBranchIds(req) {
  return Array.isArray(req.user?.allowedBranchIds) ? req.user.allowedBranchIds.filter(Boolean) : [];
}

function modelHasField(modelName, fieldName) {
  const model = Prisma.dmmf?.datamodel?.models?.find((item) => item.name === modelName);
  return Boolean(model?.fields?.some((field) => field.name === fieldName));
}

function modelExists(modelName) {
  return Boolean(Prisma.dmmf?.datamodel?.models?.some((item) => item.name === modelName));
}

const HAS_SUPPLIER_SUPPLY_BRANCH = modelHasField("SupplierSupply", "branchId");
const HAS_BRANCH_INVENTORY = modelExists("BranchInventory");
const HAS_STOCK_ADJUSTMENT_BRANCH = modelHasField("StockAdjustment", "branchId");

const ID_TYPES = new Set(["NATIONAL_ID", "PASSPORT"]);
const SUPPLIER_SOURCE_TYPES = new Set(["BOUGHT", "GIFT", "TRADE_IN", "CONSIGNMENT", "OTHER"]);
const SUPPLY_SOURCE_TYPES = new Set(["BOUGHT", "GIFT", "TRADE_IN", "CONSIGNMENT", "OTHER"]);

function normalizeIdType(value) {
  const x = cleanStringStrict(value).toUpperCase();
  return ID_TYPES.has(x) ? x : null;
}

function normalizeSupplierSourceType(value) {
  const x = cleanStringStrict(value).toUpperCase();
  return SUPPLIER_SOURCE_TYPES.has(x) ? x : "OTHER";
}

function normalizeSupplySourceType(value) {
  const x = cleanStringStrict(value).toUpperCase();
  return SUPPLY_SOURCE_TYPES.has(x) ? x : "OTHER";
}

function serializeBranch(branch) {
  if (!branch) return null;

  return {
    id: branch.id,
    name: branch.name || "",
    code: branch.code || "",
    status: branch.status || "",
    isMain: Boolean(branch.isMain),
  };
}

function serializeSupplier(row) {
  if (!row) return null;

  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    idType: row.idType,
    idNumber: row.idNumber,
    phone: row.phone || null,
    email: row.email || null,
    address: row.address || null,
    notes: row.notes || null,
    isActive: Boolean(row.isActive),
    companyName: row.companyName || null,
    taxId: row.taxId || null,
    sourceType: row.sourceType || "OTHER",
    sourceDetails: row.sourceDetails || null,
    verifiedAt: row.verifiedAt || null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

function serializeSupply(row) {
  const items = Array.isArray(row?.SupplierSupplyItem) ? row.SupplierSupplyItem : [];

  const totalCost = items.reduce(
    (sum, item) => sum + Number(item.buyPrice || 0) * Number(item.quantity || 0),
    0
  );

  const totalSell = items.reduce(
    (sum, item) => sum + Number(item.sellPrice || 0) * Number(item.quantity || 0),
    0
  );

  return {
    id: row.id,
    tenantId: row.tenantId,
    supplierId: row.supplierId,
    branchId: row.branchId || null,
    branch: serializeBranch(row.branch),
    sourceType: row.sourceType || "OTHER",
    sourceDetails: row.sourceDetails || null,
    documentRef: row.documentRef || null,
    notes: row.notes || null,
    createdAt: row.createdAt || null,
    itemsCount: items.length,
    totalCost,
    totalSell,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId || null,
      productName: item.productName,
      category: item.category || null,
      subcategory: item.subcategory || null,
      subcategoryOther: item.subcategoryOther || null,
      brand: item.brand || null,
      serial: item.serial || null,
      quantity: Number(item.quantity || 0),
      buyPrice: Number(item.buyPrice || 0),
      sellPrice: Number(item.sellPrice || 0),
      notes: item.notes || null,
    })),
  };
}

function branchScopePayload(scope) {
  return {
    mode: scope?.mode || "SINGLE_BRANCH",
    branchId: scope?.branchId || null,
    canViewAllBranches: Boolean(scope?.canViewAllBranches),
    allowedBranchIds: Array.isArray(scope?.allowedBranchIds) ? scope.allowedBranchIds : [],
  };
}

function throwBranchError(code) {
  const err = new Error(code);
  err.code = code;
  throw err;
}

function resolveSupplierBranchScope(req) {
  const requestedBranchId =
    cleanString(req.query?.branchId) || cleanString(req.headers["x-branch-id"]) || null;

  const allBranchesRequested =
    cleanStringStrict(req.query?.allBranches).toLowerCase() === "true";

  const allowedBranchIds = getAllowedBranchIds(req);
  const canSeeAll = canViewAllBranches(req);

  if (allBranchesRequested) {
    if (!canSeeAll) throwBranchError("BRANCH_ACCESS_DENIED");

    return {
      mode: "ALL_BRANCHES",
      branchId: null,
      canViewAllBranches: true,
      allowedBranchIds,
    };
  }

  if (requestedBranchId) {
    if (!canSeeAll && !allowedBranchIds.includes(requestedBranchId)) {
      throwBranchError("BRANCH_ACCESS_DENIED");
    }

    return {
      mode: "SINGLE_BRANCH",
      branchId: requestedBranchId,
      canViewAllBranches: canSeeAll,
      allowedBranchIds,
    };
  }

  const activeBranchId = getActiveBranchId(req);

  if (activeBranchId) {
    if (!canSeeAll && !allowedBranchIds.includes(activeBranchId)) {
      throwBranchError("BRANCH_ACCESS_DENIED");
    }

    return {
      mode: "SINGLE_BRANCH",
      branchId: activeBranchId,
      canViewAllBranches: canSeeAll,
      allowedBranchIds,
    };
  }

  if (canSeeAll) {
    return {
      mode: "ALL_BRANCHES",
      branchId: null,
      canViewAllBranches: true,
      allowedBranchIds,
    };
  }

  return {
    mode: "NO_BRANCH",
    branchId: null,
    canViewAllBranches: false,
    allowedBranchIds,
  };
}

function supplyBranchWhere(scope) {
  if (!HAS_SUPPLIER_SUPPLY_BRANCH) return {};

  if (scope?.mode === "ALL_BRANCHES") return {};

  if (scope?.mode === "SINGLE_BRANCH" && scope?.branchId) {
    return { branchId: scope.branchId };
  }

  return { branchId: "__NO_BRANCH_ACCESS__" };
}

async function ensureWritableBranchAccessOrThrow(req) {
  const tenantId = getTenantId(req);
  const branchId = getActiveBranchId(req);

  if (!tenantId || !branchId) {
    throwBranchError("BRANCH_REQUIRED");
  }

  const allowedBranchIds = getAllowedBranchIds(req);

  if (!canViewAllBranches(req) && !allowedBranchIds.includes(branchId)) {
    throwBranchError("BRANCH_ACCESS_DENIED");
  }

  const branch = await prisma.branch.findFirst({
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

  if (!branch) throwBranchError("BRANCH_NOT_FOUND");
  if (branch.status !== "ACTIVE") throwBranchError("BRANCH_NOT_ACTIVE");

  return branch;
}

async function incrementBranchInventoryIfPossible(tx, { tenantId, branchId, productId, quantity }) {
  if (!HAS_BRANCH_INVENTORY || !tx.branchInventory || !branchId || !productId) return null;

  const existing = await tx.branchInventory.findFirst({
    where: {
      tenantId,
      branchId,
      productId,
    },
    select: {
      id: true,
      qtyOnHand: true,
    },
  });

  if (existing) {
    return tx.branchInventory.update({
      where: { id: existing.id },
      data: {
        qtyOnHand: Number(existing.qtyOnHand || 0) + Number(quantity || 0),
      },
    });
  }

  return tx.branchInventory.create({
    data: {
      tenantId,
      branchId,
      productId,
      qtyOnHand: Number(quantity || 0),
    },
  });
}

function handleBranchError(res, err) {
  const code = String(err?.code || err?.message || "");

  if (code === "BRANCH_REQUIRED") {
    return res.status(400).json({
      message: "No active branch selected",
      code: "BRANCH_REQUIRED",
    });
  }

  if (code === "BRANCH_ACCESS_DENIED") {
    return res.status(403).json({
      message: "Branch access denied",
      code: "BRANCH_ACCESS_DENIED",
    });
  }

  if (code === "BRANCH_NOT_FOUND") {
    return res.status(404).json({
      message: "Branch not found",
      code: "BRANCH_NOT_FOUND",
    });
  }

  if (code === "BRANCH_NOT_ACTIVE") {
    return res.status(409).json({
      message: "Selected branch is not active",
      code: "BRANCH_NOT_ACTIVE",
    });
  }

  return null;
}

function isDuplicateError(err) {
  const code = String(err?.code || "");
  const msg = String(err?.message || "").toLowerCase();

  return code === "P2002" || msg.includes("unique") || msg.includes("duplicate");
}

async function listSuppliers(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const q = cleanString(req.query.q);
    const activeRaw = cleanString(req.query.active);
    const active = activeRaw == null ? true : cleanStringStrict(activeRaw).toLowerCase() === "true";

    const where = {
      tenantId,
      isActive: active,
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { idNumber: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.supplier.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        tenantId: true,
        name: true,
        idType: true,
        idNumber: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        companyName: true,
        taxId: true,
        sourceType: true,
        sourceDetails: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      suppliers: rows.map(serializeSupplier),
      count: rows.length,
    });
  } catch (err) {
    console.error("listSuppliers error:", err);
    return res.status(500).json({ message: "Failed to load suppliers" });
  }
}

async function createSupplier(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const name = cleanString(req.body.name);
    const idType = normalizeIdType(req.body.idType);
    const idNumber = cleanString(req.body.idNumber);

    if (!name) return res.status(400).json({ message: "Supplier name is required" });

    if (!idType) {
      return res.status(400).json({ message: "ID type must be National ID or Passport" });
    }

    if (!idNumber) {
      return res.status(400).json({ message: "ID number is required" });
    }

    const created = await prisma.supplier.create({
      data: {
        tenantId,
        name,
        idType,
        idNumber,
        phone: cleanString(req.body.phone),
        email: cleanString(req.body.email),
        address: cleanString(req.body.address),
        notes: cleanString(req.body.notes),
        companyName: cleanString(req.body.companyName),
        taxId: cleanString(req.body.taxId),
        sourceType: normalizeSupplierSourceType(req.body.sourceType),
        sourceDetails: cleanString(req.body.sourceDetails),
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        idType: true,
        idNumber: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        companyName: true,
        taxId: true,
        sourceType: true,
        sourceDetails: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      created: true,
      supplier: serializeSupplier(created),
    });
  } catch (err) {
    if (isDuplicateError(err)) {
      return res.status(400).json({
        message: "This ID is already used for another supplier in this store.",
      });
    }

    console.error("createSupplier error:", err);
    return res.status(500).json({ message: "Failed to create supplier" });
  }
}

async function getSupplier(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const id = cleanStringStrict(req.params.id);

    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        idType: true,
        idNumber: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        companyName: true,
        taxId: true,
        sourceType: true,
        sourceDetails: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    return res.json(serializeSupplier(supplier));
  } catch (err) {
    console.error("getSupplier error:", err);
    return res.status(500).json({ message: "Failed to load supplier" });
  }
}

async function updateSupplier(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const id = cleanStringStrict(req.params.id);
    const data = {};

    if (req.body.name != null) {
      const name = cleanString(req.body.name);
      if (!name) return res.status(400).json({ message: "Supplier name cannot be empty" });
      data.name = name;
    }

    if (req.body.phone !== undefined) data.phone = cleanString(req.body.phone);
    if (req.body.email !== undefined) data.email = cleanString(req.body.email);
    if (req.body.address !== undefined) data.address = cleanString(req.body.address);
    if (req.body.notes !== undefined) data.notes = cleanString(req.body.notes);
    if (req.body.companyName !== undefined) data.companyName = cleanString(req.body.companyName);
    if (req.body.taxId !== undefined) data.taxId = cleanString(req.body.taxId);

    if (req.body.idType !== undefined) {
      const idType = normalizeIdType(req.body.idType);
      if (!idType) {
        return res.status(400).json({ message: "ID type must be National ID or Passport" });
      }
      data.idType = idType;
    }

    if (req.body.idNumber !== undefined) {
      const idNumber = cleanString(req.body.idNumber);
      if (!idNumber) return res.status(400).json({ message: "ID number cannot be empty" });
      data.idNumber = idNumber;
    }

    if (req.body.sourceType !== undefined) {
      data.sourceType = normalizeSupplierSourceType(req.body.sourceType);
    }

    if (req.body.sourceDetails !== undefined) {
      data.sourceDetails = cleanString(req.body.sourceDetails);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const result = await prisma.supplier.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) return res.status(404).json({ message: "Supplier not found" });

    const updated = await prisma.supplier.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        idType: true,
        idNumber: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        companyName: true,
        taxId: true,
        sourceType: true,
        sourceDetails: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(serializeSupplier(updated));
  } catch (err) {
    if (isDuplicateError(err)) {
      return res.status(400).json({
        message: "This ID is already used for another supplier in this store.",
      });
    }

    console.error("updateSupplier error:", err);
    return res.status(500).json({ message: "Failed to update supplier" });
  }
}

async function activateSupplier(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const id = cleanStringStrict(req.params.id);

    const result = await prisma.supplier.updateMany({
      where: { id, tenantId, isActive: false },
      data: { isActive: true },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: "Supplier not found or already active" });
    }

    return res.json({ message: "Supplier activated" });
  } catch (err) {
    console.error("activateSupplier error:", err);
    return res.status(500).json({ message: "Failed to activate supplier" });
  }
}

async function deactivateSupplier(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const id = cleanStringStrict(req.params.id);

    const result = await prisma.supplier.updateMany({
      where: { id, tenantId, isActive: true },
      data: { isActive: false },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: "Supplier not found or already inactive" });
    }

    return res.json({ message: "Supplier deactivated" });
  } catch (err) {
    console.error("deactivateSupplier error:", err);
    return res.status(500).json({ message: "Failed to deactivate supplier" });
  }
}

async function listSupplies(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const supplierId = cleanStringStrict(req.params.id);
    const scope = resolveSupplierBranchScope(req);

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true },
    });

    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const rows = await prisma.supplierSupply.findMany({
      where: {
        tenantId,
        supplierId,
        ...supplyBranchWhere(scope),
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        supplierId: true,
        createdAt: true,
        sourceType: true,
        sourceDetails: true,
        documentRef: true,
        notes: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            isMain: true,
          },
        },
        SupplierSupplyItem: {
          select: {
            id: true,
            productId: true,
            productName: true,
            category: true,
            subcategory: true,
            subcategoryOther: true,
            brand: true,
            serial: true,
            quantity: true,
            buyPrice: true,
            sellPrice: true,
            notes: true,
          },
        },
      },
    });

    const supplies = rows.map(serializeSupply);

    return res.json({
      supplies,
      count: supplies.length,
      branchScope: branchScopePayload(scope),
    });
  } catch (err) {
    const handled = handleBranchError(res, err);
    if (handled) return handled;

    console.error("listSupplies error:", err);
    return res.status(500).json({ message: "Failed to load supplies" });
  }
}

async function createSupply(req, res) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const activeBranch = await ensureWritableBranchAccessOrThrow(req);
    const supplierId = cleanStringStrict(req.params.id);
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!items.length) return res.status(400).json({ message: "At least one supply item is required" });

    const alsoUpdateStock = cleanStringStrict(req.body.alsoUpdateStock || "true").toLowerCase() !== "false";

    for (const item of items) {
      const productName = cleanString(item.productName);
      const quantity = toInt(item.quantity, NaN);
      const buyPrice = toMoney(item.buyPrice, NaN);
      const sellPrice = toMoney(item.sellPrice, NaN);

      if (!productName) return res.status(400).json({ message: "Each item must have product name" });

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Each item quantity must be more than 0" });
      }

      if (!Number.isFinite(buyPrice) || buyPrice < 0) {
        return res.status(400).json({ message: "Each item buy price must be 0 or more" });
      }

      if (!Number.isFinite(sellPrice) || sellPrice < 0) {
        return res.status(400).json({ message: "Each item sell price must be 0 or more" });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: supplierId, tenantId },
        select: { id: true, name: true },
      });

      if (!supplier) throw new Error("SUPPLIER_NOT_FOUND");

      const supply = await tx.supplierSupply.create({
        data: {
          tenantId,
          supplierId,
          branchId: HAS_SUPPLIER_SUPPLY_BRANCH ? activeBranch.id : undefined,
          sourceType: normalizeSupplySourceType(req.body.sourceType),
          sourceDetails: cleanString(req.body.sourceDetails),
          documentRef: cleanString(req.body.documentRef),
          notes: cleanString(req.body.notes),
        },
        select: {
          id: true,
          tenantId: true,
          branchId: true,
          supplierId: true,
          sourceType: true,
          sourceDetails: true,
          documentRef: true,
          notes: true,
          createdAt: true,
        },
      });

      const createdItems = [];
      const updatedProducts = [];

      for (const item of items) {
        const productId = cleanString(item.productId);
        const productName = cleanString(item.productName);
        const quantity = toInt(item.quantity);
        const buyPrice = toMoney(item.buyPrice);
        const sellPrice = toMoney(item.sellPrice);

        const createdItem = await tx.supplierSupplyItem.create({
          data: {
            tenantId,
            supplyId: supply.id,
            productId: productId || null,
            productName,
            category: cleanString(item.category),
            subcategory: cleanString(item.subcategory),
            subcategoryOther: cleanString(item.subcategoryOther),
            brand: cleanString(item.brand),
            serial: cleanString(item.serial),
            quantity,
            buyPrice,
            sellPrice,
            notes: cleanString(item.notes),
          },
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            buyPrice: true,
            sellPrice: true,
            serial: true,
          },
        });

        createdItems.push(createdItem);

        if (!alsoUpdateStock) continue;

        let product = null;
        let beforeQtyGlobal = 0;
        let afterQtyGlobal = quantity;

        if (productId) {
          product = await tx.product.findFirst({
            where: { id: productId, tenantId },
            select: { id: true, stockQty: true },
          });

          if (!product) continue;

          beforeQtyGlobal = Number(product.stockQty || 0);
          afterQtyGlobal = beforeQtyGlobal + quantity;

          await tx.product.update({
            where: { id: product.id },
            data: {
              stockQty: afterQtyGlobal,
              costPrice: buyPrice,
              sellPrice,
              supplierId,
              supplierName: supplier.name,
              isActive: true,
            },
          });
        } else {
          product = await tx.product.create({
            data: {
              tenantId,
              name: productName,
              category: cleanString(item.category),
              subcategory: cleanString(item.subcategory),
              subcategoryOther: cleanString(item.subcategoryOther),
              brand: cleanString(item.brand),
              serial: cleanString(item.serial),
              costPrice: buyPrice,
              sellPrice,
              stockQty: quantity,
              supplierId,
              supplierName: supplier.name,
              isActive: true,
            },
            select: { id: true, stockQty: true },
          });

          beforeQtyGlobal = 0;
          afterQtyGlobal = Number(product.stockQty || quantity);

          await tx.supplierSupplyItem.update({
            where: { id: createdItem.id },
            data: { productId: product.id },
            select: { id: true },
          });
        }

        await incrementBranchInventoryIfPossible(tx, {
          tenantId,
          branchId: activeBranch.id,
          productId: product.id,
          quantity,
        });

        const stockAdjustmentData = {
          tenantId,
          productId: product.id,
          type: "RESTOCK",
          delta: quantity,
          beforeQty: beforeQtyGlobal,
          afterQty: afterQtyGlobal,
          note: `Supplier supply from ${supplier.name} at ${activeBranch.code || activeBranch.name || "current selling location"}`,
          createdById: userId,
        };

        if (HAS_STOCK_ADJUSTMENT_BRANCH) {
          stockAdjustmentData.branchId = activeBranch.id;
        }

        await tx.stockAdjustment.create({
          data: stockAdjustmentData,
          select: { id: true },
        });

        updatedProducts.push(product.id);
      }

      return {
        branchId: activeBranch.id,
        branchCode: activeBranch.code || null,
        branchName: activeBranch.name || null,
        supply,
        createdItemsCount: createdItems.length,
        updatedProductsCount: updatedProducts.length,
      };
    });

    return res.status(201).json({
      created: true,
      ...result,
    });
  } catch (err) {
    const handled = handleBranchError(res, err);
    if (handled) return handled;

    if (String(err?.message || "") === "SUPPLIER_NOT_FOUND") {
      return res.status(404).json({ message: "Supplier not found" });
    }

    console.error("createSupply error:", err);
    return res.status(500).json({ message: "Failed to create supply" });
  }
}


const SUPPLIER_PAYMENT_METHODS = new Set(["CASH", "MOMO", "BANK", "OTHER"]);

function normalizeSupplierPaymentMethod(value) {
  const x = cleanStringStrict(value || "CASH").toUpperCase();
  return SUPPLIER_PAYMENT_METHODS.has(x) ? x : null;
}

function computeSupplierBillStatus({ totalAmount, paidAmount, dueDate, cancelled = false }) {
  if (cancelled) return "CANCELLED";

  const total = Math.max(0, Number(totalAmount || 0));
  const paid = Math.max(0, Number(paidAmount || 0));
  const balance = Math.max(0, total - paid);

  if (balance <= 0) return "PAID";
  if (paid > 0) return "PARTIAL";

  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!Number.isNaN(due.getTime()) && due < today) {
      return "OVERDUE";
    }
  }

  return "UNPAID";
}

function serializeSupplierBill(row) {
  if (!row) return null;

  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId || null,
    supplierId: row.supplierId,
    supplyId: row.supplyId || null,
    purchaseOrderId: row.purchaseOrderId || null,
    billNumber: row.billNumber || null,
    status: row.status || "UNPAID",
    billDate: row.billDate || null,
    dueDate: row.dueDate || null,
    totalAmount: Number(row.totalAmount || 0),
    paidAmount: Number(row.paidAmount || 0),
    balanceDue: Number(row.balanceDue || 0),
    documentRef: row.documentRef || null,
    notes: row.notes || null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
    branch: serializeBranch(row.branch),
    items: Array.isArray(row.items)
      ? row.items.map((item) => ({
          id: item.id,
          productId: item.productId || null,
          productName: item.productName,
          quantity: Number(item.quantity || 0),
          unitCost: Number(item.unitCost || 0),
          totalCost: Number(item.totalCost || 0),
          notes: item.notes || null,
        }))
      : [],
  };
}

function serializeSupplierPayment(row) {
  if (!row) return null;

  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId || null,
    supplierId: row.supplierId,
    billId: row.billId || null,
    amount: Number(row.amount || 0),
    method: row.method || "CASH",
    reference: row.reference || null,
    note: row.note || null,
    paidAt: row.paidAt || null,
    cashMovementId: row.cashMovementId || null,
    createdAt: row.createdAt || null,
    branch: serializeBranch(row.branch),
    bill: row.bill
      ? {
          id: row.bill.id,
          billNumber: row.bill.billNumber || null,
          status: row.bill.status || "UNPAID",
          totalAmount: Number(row.bill.totalAmount || 0),
          paidAmount: Number(row.bill.paidAmount || 0),
          balanceDue: Number(row.bill.balanceDue || 0),
        }
      : null,
  };
}

async function getOpenCashSessionForSupplierPayment(tx, tenantId, branchId) {
  if (!tenantId || !branchId) return null;

  const rows = await tx.$queryRaw`
    select
      cs.id,
      cs.opening_cash,
      (
        cs.opening_cash
        + coalesce(sum(case when cm.type = 'IN' then cm.amount else 0 end), 0)
        - coalesce(sum(case when cm.type = 'OUT' then cm.amount else 0 end), 0)
      ) as expected_cash
    from public.cash_sessions cs
    left join public.cash_movements cm
      on cm.session_id = cs.id
      and cm.tenant_id = cs.tenant_id
      and cm.branch_id = cs.branch_id
    where cs.tenant_id::text = ${String(tenantId)}::text
      and cs.branch_id::text = ${String(branchId)}::text
      and cs.closed_at is null
    group by cs.id
    order by cs.opened_at desc
    limit 1
  `;

  return rows?.[0] || null;
}

async function recordSupplierCashOutMovement(tx, { tenantId, branchId, sessionId, amount, userId, note }) {
  const amountBigInt = BigInt(Math.round(Number(amount || 0)));

  const rows = await tx.$queryRaw`
    insert into public.cash_movements
      (tenant_id, branch_id, session_id, type, reason, amount, note, created_by)
    values
      (
        ${String(tenantId)}::uuid,
        ${String(branchId)}::text,
        ${String(sessionId)}::uuid,
        'OUT'::cash_movement_type,
        'WITHDRAWAL'::cash_movement_reason,
        ${amountBigInt},
        ${cleanString(note)},
        ${userId ? String(userId) : null}::uuid
      )
    returning id
  `;

  return rows?.[0]?.id || null;
}

async function listSupplierBills(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const supplierId = cleanStringStrict(req.params.id);
    const status = cleanString(req.query.status);

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true },
    });

    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const where = {
      tenantId,
      supplierId,
      ...(status ? { status: cleanStringStrict(status).toUpperCase() } : {}),
    };

    const rows = await prisma.supplierBill.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            isMain: true,
          },
        },
        items: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    return res.json({
      bills: rows.map(serializeSupplierBill),
      count: rows.length,
    });
  } catch (err) {
    console.error("listSupplierBills error:", err);
    return res.status(500).json({ message: "Failed to load supplier bills" });
  }
}

async function createSupplierBill(req, res) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const activeBranch = await ensureWritableBranchAccessOrThrow(req);
    const supplierId = cleanStringStrict(req.params.id);
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!items.length) {
      return res.status(400).json({ message: "At least one bill item is required" });
    }

    const preparedItems = [];

    for (const item of items) {
      const productName = cleanString(item.productName);
      const quantity = toInt(item.quantity, NaN);
      const unitCost = toMoney(item.unitCost ?? item.buyPrice, NaN);

      if (!productName) return res.status(400).json({ message: "Each item must have product name" });
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Each item quantity must be more than 0" });
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        return res.status(400).json({ message: "Each item cost must be 0 or more" });
      }

      preparedItems.push({
        productId: cleanString(item.productId),
        productName,
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
        notes: cleanString(item.notes),
      });
    }

    const totalAmount = preparedItems.reduce((sum, item) => sum + item.totalCost, 0);
    const paidAmount = 0;
    const balanceDue = totalAmount;
    const dueDate = cleanString(req.body.dueDate);
    const status = computeSupplierBillStatus({ totalAmount, paidAmount, dueDate });

    const created = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: supplierId, tenantId },
        select: { id: true },
      });

      if (!supplier) throw new Error("SUPPLIER_NOT_FOUND");

      const bill = await tx.supplierBill.create({
        data: {
          tenantId,
          branchId: activeBranch.id,
          supplierId,
          supplyId: cleanString(req.body.supplyId),
          purchaseOrderId: cleanString(req.body.purchaseOrderId),
          billNumber: cleanString(req.body.billNumber),
          status,
          billDate: req.body.billDate ? new Date(req.body.billDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          totalAmount,
          paidAmount,
          balanceDue,
          documentRef: cleanString(req.body.documentRef),
          notes: cleanString(req.body.notes),
          createdById: userId,
          items: {
            create: preparedItems.map((item) => ({
              tenantId,
              productId: item.productId || null,
              productName: item.productName,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              notes: item.notes,
            })),
          },
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              isMain: true,
            },
          },
          items: true,
        },
      });

      return bill;
    });

    return res.status(201).json({
      created: true,
      bill: serializeSupplierBill(created),
    });
  } catch (err) {
    const handled = handleBranchError(res, err);
    if (handled) return handled;

    if (String(err?.message || "") === "SUPPLIER_NOT_FOUND") {
      return res.status(404).json({ message: "Supplier not found" });
    }

    if (isDuplicateError(err)) {
      return res.status(400).json({
        message: "This bill number already exists in this store.",
      });
    }

    console.error("createSupplierBill error:", err);
    return res.status(500).json({ message: "Failed to create supplier bill" });
  }
}


async function updateSupplierBill(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    await ensureWritableBranchAccessOrThrow(req);

    const supplierId = cleanStringStrict(req.params.id);
    const billId = cleanStringStrict(req.params.billId);
    const body = req.body || {};
    const incomingItems = Array.isArray(body.items) ? body.items : null;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.supplierBill.findFirst({
        where: { id: billId, supplierId, tenantId },
        include: { items: true },
      });

      if (!existing) throw new Error("SUPPLIER_BILL_NOT_FOUND");

      const paidAmount = Number(existing.paidAmount || 0);
      const hasPayment = paidAmount > 0;

      if (hasPayment && incomingItems) {
        throw new Error("SUPPLIER_BILL_HAS_PAYMENTS");
      }

      let preparedItems = null;
      let totalAmount = Number(existing.totalAmount || 0);

      if (incomingItems) {
        if (!incomingItems.length) {
          throw new Error("SUPPLIER_BILL_ITEMS_REQUIRED");
        }

        preparedItems = [];

        for (const item of incomingItems) {
          const productName = cleanString(item.productName);
          const quantity = toInt(item.quantity, NaN);
          const unitCost = toMoney(item.unitCost ?? item.buyPrice, NaN);

          if (!productName) throw new Error("SUPPLIER_BILL_ITEM_NAME_REQUIRED");
          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new Error("SUPPLIER_BILL_ITEM_QTY_INVALID");
          }
          if (!Number.isFinite(unitCost) || unitCost < 0) {
            throw new Error("SUPPLIER_BILL_ITEM_COST_INVALID");
          }

          preparedItems.push({
            productId: cleanString(item.productId) || null,
            productName,
            quantity,
            unitCost,
            totalCost: quantity * unitCost,
            notes: cleanString(item.notes),
          });
        }

        totalAmount = preparedItems.reduce((sum, item) => sum + item.totalCost, 0);
      }

      if (totalAmount < paidAmount) {
        throw new Error("SUPPLIER_BILL_TOTAL_BELOW_PAID");
      }

      const dueDateInput = Object.prototype.hasOwnProperty.call(body, "dueDate")
        ? cleanString(body.dueDate)
        : existing.dueDate;

      const dueDate = dueDateInput ? new Date(dueDateInput) : null;
      const balanceDue = Math.max(0, totalAmount - paidAmount);
      const status = computeSupplierBillStatus({
        totalAmount,
        paidAmount,
        dueDate,
      });

      if (preparedItems) {
        await tx.supplierBillItem.deleteMany({
          where: { billId: existing.id, tenantId },
        });
      }

      const bill = await tx.supplierBill.update({
        where: { id: existing.id },
        data: {
          billNumber: Object.prototype.hasOwnProperty.call(body, "billNumber")
            ? cleanString(body.billNumber)
            : existing.billNumber,
          documentRef: Object.prototype.hasOwnProperty.call(body, "documentRef")
            ? cleanString(body.documentRef)
            : existing.documentRef,
          dueDate,
          notes: Object.prototype.hasOwnProperty.call(body, "notes")
            ? cleanString(body.notes)
            : existing.notes,
          totalAmount,
          balanceDue,
          status,
          ...(preparedItems
            ? {
                items: {
                  create: preparedItems.map((item) => ({
                    tenantId,
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    totalCost: item.totalCost,
                    notes: item.notes,
                  })),
                },
              }
            : {}),
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              isMain: true,
            },
          },
          items: {
            orderBy: [{ createdAt: "asc" }],
          },
        },
      });

      return bill;
    });

    return res.json({
      updated: true,
      bill: serializeSupplierBill(updated),
    });
  } catch (err) {
    const handled = handleBranchError(res, err);
    if (handled) return handled;

    const code = String(err?.message || "");

    if (code === "SUPPLIER_BILL_NOT_FOUND") {
      return res.status(404).json({ message: "Supplier bill not found" });
    }

    if (code === "SUPPLIER_BILL_HAS_PAYMENTS") {
      return res.status(400).json({
        message: "This bill already has payments. You can edit bill number, document reference, due date, and notes, but not items or total.",
      });
    }

    if (code === "SUPPLIER_BILL_TOTAL_BELOW_PAID") {
      return res.status(400).json({
        message: "Bill total cannot be lower than the amount already paid.",
      });
    }

    if (
      code === "SUPPLIER_BILL_ITEMS_REQUIRED" ||
      code === "SUPPLIER_BILL_ITEM_NAME_REQUIRED" ||
      code === "SUPPLIER_BILL_ITEM_QTY_INVALID" ||
      code === "SUPPLIER_BILL_ITEM_COST_INVALID"
    ) {
      return res.status(400).json({ message: "Check the bill items and try again." });
    }

    if (isDuplicateError(err)) {
      return res.status(400).json({
        message: "This bill number already exists in this store.",
      });
    }

    console.error("updateSupplierBill error:", err);
    return res.status(500).json({ message: "Failed to update supplier bill" });
  }
}


async function listSupplierPayments(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const supplierId = cleanStringStrict(req.params.id);

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true },
    });

    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const rows = await prisma.supplierPayment.findMany({
      where: { tenantId, supplierId },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            isMain: true,
          },
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
            balanceDue: true,
          },
        },
      },
    });

    return res.json({
      payments: rows.map(serializeSupplierPayment),
      count: rows.length,
    });
  } catch (err) {
    console.error("listSupplierPayments error:", err);
    return res.status(500).json({ message: "Failed to load supplier payments" });
  }
}

async function createSupplierPayment(req, res) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const activeBranch = await ensureWritableBranchAccessOrThrow(req);
    const supplierId = cleanStringStrict(req.params.id);
    const billId = cleanString(req.body.billId);
    const amount = toMoney(req.body.amount, NaN);
    const method = normalizeSupplierPaymentMethod(req.body.method || req.body.paymentMethod);

    if (!billId) {
      return res.status(400).json({ message: "Choose the supplier bill being paid." });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Payment amount must be more than 0" });
    }

    if (!method) {
      return res.status(400).json({ message: "Payment method must be Cash, MoMo, Bank, or Other" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: supplierId, tenantId },
        select: { id: true, name: true },
      });

      if (!supplier) throw new Error("SUPPLIER_NOT_FOUND");

      const bill = await tx.supplierBill.findFirst({
        where: {
          id: billId,
          tenantId,
          supplierId,
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          billNumber: true,
          totalAmount: true,
          paidAmount: true,
          balanceDue: true,
          status: true,
        },
      });

      if (!bill) throw new Error("SUPPLIER_BILL_NOT_FOUND");

      const currentBalance = Math.max(0, Number(bill.balanceDue || 0));

      if (amount > currentBalance) {
        throw new Error("SUPPLIER_PAYMENT_TOO_HIGH");
      }

      let cashMovementId = null;

      if (method === "CASH") {
        const openCash = await getOpenCashSessionForSupplierPayment(tx, tenantId, activeBranch.id);

        if (!openCash) {
          throw new Error("SUPPLIER_CASH_DRAWER_CLOSED");
        }

        const expectedCash = BigInt(openCash.expected_cash || 0);
        const amountBigInt = BigInt(Math.round(amount));

        if (expectedCash < amountBigInt) {
          throw new Error("SUPPLIER_CASH_NOT_ENOUGH");
        }

        cashMovementId = await recordSupplierCashOutMovement(tx, {
          tenantId,
          branchId: activeBranch.id,
          sessionId: openCash.id,
          amount,
          userId,
          note: `Supplier payment to ${supplier.name}${bill.billNumber ? ` for ${bill.billNumber}` : ""}`,
        });
      }

      const newPaidAmount = Number(bill.paidAmount || 0) + amount;
      const newBalanceDue = Math.max(0, Number(bill.totalAmount || 0) - newPaidAmount);
      const newStatus = computeSupplierBillStatus({
        totalAmount: bill.totalAmount,
        paidAmount: newPaidAmount,
      });

      const payment = await tx.supplierPayment.create({
        data: {
          tenantId,
          branchId: activeBranch.id,
          supplierId,
          billId,
          amount,
          method,
          reference: cleanString(req.body.reference),
          note: cleanString(req.body.note),
          paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(),
          createdById: userId,
          cashMovementId,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              isMain: true,
            },
          },
          bill: {
            select: {
              id: true,
              billNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
              balanceDue: true,
            },
          },
        },
      });

      const updatedBill = await tx.supplierBill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              isMain: true,
            },
          },
          items: true,
        },
      });

      return { payment, bill: updatedBill };
    });

    return res.status(201).json({
      created: true,
      payment: serializeSupplierPayment(result.payment),
      bill: serializeSupplierBill(result.bill),
    });
  } catch (err) {
    const handled = handleBranchError(res, err);
    if (handled) return handled;

    const code = String(err?.message || "");

    if (code === "SUPPLIER_NOT_FOUND") {
      return res.status(404).json({ message: "Supplier not found" });
    }

    if (code === "SUPPLIER_BILL_NOT_FOUND") {
      return res.status(404).json({ message: "Supplier bill not found" });
    }

    if (code === "SUPPLIER_PAYMENT_TOO_HIGH") {
      return res.status(400).json({ message: "Payment is higher than the supplier bill balance" });
    }

    if (code === "SUPPLIER_CASH_DRAWER_CLOSED") {
      return res.status(409).json({
        message: "Open cash drawer before paying supplier with cash.",
        code: "CASH_DRAWER_CLOSED",
      });
    }

    if (code === "SUPPLIER_CASH_NOT_ENOUGH") {
      return res.status(409).json({
        message: "Not enough cash in drawer to pay this supplier.",
        code: "CASH_DRAWER_NOT_ENOUGH",
      });
    }

    console.error("createSupplierPayment error:", err);
    return res.status(500).json({ message: "Failed to record supplier payment" });
  }
}

async function getSupplierBalance(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const supplierId = cleanStringStrict(req.params.id);

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true, name: true },
    });

    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const [billTotals, openBills, paymentsCount, lastPayment, lastSupply] = await Promise.all([
      prisma.supplierBill.aggregate({
        where: { tenantId, supplierId, status: { not: "CANCELLED" } },
        _sum: {
          totalAmount: true,
          paidAmount: true,
          balanceDue: true,
        },
      }),
      prisma.supplierBill.count({
        where: {
          tenantId,
          supplierId,
          status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
          balanceDue: { gt: 0 },
        },
      }),
      prisma.supplierPayment.count({
        where: { tenantId, supplierId },
      }),
      prisma.supplierPayment.findFirst({
        where: { tenantId, supplierId },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        select: {
          amount: true,
          method: true,
          paidAt: true,
        },
      }),
      prisma.supplierSupply.findFirst({
        where: { tenantId, supplierId },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          createdAt: true,
          documentRef: true,
        },
      }),
    ]);

    return res.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
      },
      totals: {
        totalBilled: Number(billTotals._sum.totalAmount || 0),
        totalPaid: Number(billTotals._sum.paidAmount || 0),
        balanceDue: Number(billTotals._sum.balanceDue || 0),
        openBills,
        paymentsCount,
      },
      lastPayment: lastPayment
        ? {
            amount: Number(lastPayment.amount || 0),
            method: lastPayment.method || "CASH",
            paidAt: lastPayment.paidAt || null,
          }
        : null,
      lastSupply: lastSupply
        ? {
            id: lastSupply.id,
            createdAt: lastSupply.createdAt || null,
            documentRef: lastSupply.documentRef || null,
          }
        : null,
    });
  } catch (err) {
    console.error("getSupplierBalance error:", err);
    return res.status(500).json({ message: "Failed to load supplier balance" });
  }
}

module.exports = {
  listSuppliers,
  createSupplier,
  getSupplier,
  updateSupplier,
  activateSupplier,
  deactivateSupplier,
  listSupplies,
  createSupply,
  getSupplierBalance,
  listSupplierBills,
  createSupplierBill,
  updateSupplierBill,
  listSupplierPayments,
  createSupplierPayment,
};