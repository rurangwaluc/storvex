// src/modules/tenants/tenants.controller.js
const crypto = require("crypto");
const prisma = require("../../config/database");
const sharp = require("sharp");
const {
  deleteObject,
  signGetUrl,
  uploadObject,
} = require("../../lib/storage/objectStorage");

function getTenantId(req) {
  return req.user?.tenantId || null;
}

function cleanString(x) {
  const s = x == null ? "" : String(x).trim();
  return s || null;
}

function assertAllowedImageContentType(ct) {
  const c = String(ct || "").toLowerCase();
  if (c === "image/png") return { ext: "png", contentType: "image/png" };
  if (c === "image/jpeg") return { ext: "jpg", contentType: "image/jpeg" };
  if (c === "image/webp") return { ext: "webp", contentType: "image/webp" };
  return null;
}

// GET /api/tenants/settings
async function getTenantSettings(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        logoKey: true,
        logoUrl: true,
        receiptHeader: true,
        receiptFooter: true,
      },
    });

    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    let logoSignedUrl = null;
    if (tenant.logoKey) {
      try {
        logoSignedUrl = await signGetUrl(tenant.logoKey, 300);
      } catch (e) {
        console.error("signGetUrl failed:", e?.message || e);
      }
    }

    return res.json({ tenant: { ...tenant, logoSignedUrl } });
  } catch (err) {
    console.error("getTenantSettings error:", err);
    return res.status(500).json({ message: "Failed to load tenant settings" });
  }
}

// PATCH /api/tenants/settings
async function updateTenantSettings(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const receiptHeader =
      req.body?.receiptHeader === undefined ? undefined : cleanString(req.body.receiptHeader);
    const receiptFooter =
      req.body?.receiptFooter === undefined ? undefined : cleanString(req.body.receiptFooter);

    const data = {};
    if (receiptHeader !== undefined) data.receiptHeader = receiptHeader;
    if (receiptFooter !== undefined) data.receiptFooter = receiptFooter;

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        logoKey: true,
        logoUrl: true,
        receiptHeader: true,
        receiptFooter: true,
      },
    });

    let logoSignedUrl = null;
    if (tenant.logoKey) {
      try {
        logoSignedUrl = await signGetUrl(tenant.logoKey, 300);
      } catch {}
    }

    return res.json({ updated: true, tenant: { ...tenant, logoSignedUrl } });
  } catch (err) {
    console.error("updateTenantSettings error:", err);
    return res.status(500).json({ message: "Failed to update tenant settings" });
  }
}

// POST /api/tenants/logo/upload (multipart form-data: file)
async function uploadTenantLogo(req, res) {
  let uploadedKey = null;

  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res
        .status(401)
        .json({ message: "Unauthorized" });
    }

    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ message: "file is required" });
    }

    const allowed =
      assertAllowedImageContentType(
        file.mimetype,
      );

    if (!allowed) {
      return res.status(400).json({
        message:
          "Only PNG, JPEG, or WEBP allowed",
      });
    }

    let polishedLogo;

    try {
      polishedLogo = await sharp(
        file.buffer,
        {
          failOn: "error",
          limitInputPixels:
            40_000_000,
        },
      )
        .rotate()
        .ensureAlpha()
        .trim({
          background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0,
          },
          threshold: 10,
        })
        .resize({
          width: 1024,
          height: 1024,
          fit: "inside",
          position: "centre",
          withoutEnlargement: true,
        })
        .webp({
          lossless: true,
          alphaQuality: 100,
          effort: 5,
        })
        .toBuffer({
          resolveWithObject: true,
        });
    } catch (error) {
      return res.status(422).json({
        message:
          "The logo could not be prepared. Upload a clear PNG, JPEG, or WebP logo.",
      });
    }

    const width =
      Number(
        polishedLogo.info?.width || 0,
      );

    const height =
      Number(
        polishedLogo.info?.height || 0,
      );

    if (
      !width ||
      !height ||
      width < 8 ||
      height < 8
    ) {
      return res.status(422).json({
        message:
          "The logo has no visible content.",
      });
    }

    const existing =
      await prisma.tenant.findUnique({
        where: {
          id: tenantId,
        },
        select: {
          logoKey: true,
        },
      });

    const rand =
      crypto
        .randomBytes(8)
        .toString("hex");

    const key =
      `tenants/${tenantId}/` +
      `logo_${Date.now()}_${rand}.webp`;

    await uploadObject({
      key,
      body: polishedLogo.data,
      contentType: "image/webp",
    });

    uploadedKey = key;

    const tenant =
      await prisma.tenant.update({
        where: {
          id: tenantId,
        },
        data: {
          logoKey: key,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          logoKey: true,
          logoUrl: true,
          receiptHeader: true,
          receiptFooter: true,
        },
      });

    const oldKey =
      existing?.logoKey;

    if (
      oldKey &&
      oldKey !== key
    ) {
      try {
        await deleteObject(oldKey);
      } catch (error) {
        console.error(
          "delete old logo failed:",
          error?.message || error,
        );
      }
    }

    let logoSignedUrl = null;

    try {
      logoSignedUrl =
        await signGetUrl(
          tenant.logoKey,
          300,
        );
    } catch {}

    return res.json({
      updated: true,
      tenant: {
        ...tenant,
        logoSignedUrl,
      },
    });
  } catch (error) {
    if (uploadedKey) {
      try {
        await deleteObject(
          uploadedKey,
        );
      } catch {}
    }

    console.error(
      "uploadTenantLogo error:",
      error,
    );

    return res.status(500).json({
      message: "Logo upload failed",
    });
  }
}

// POST /api/tenants/logo/remove
async function removeTenantLogo(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoKey: true },
    });

    // Clear DB first (so UI stops showing it even if delete fails)
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { logoKey: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        logoKey: true,
        logoUrl: true,
        receiptHeader: true,
        receiptFooter: true,
      },
    });

    // Delete object best-effort
    if (existing?.logoKey) {
      try {
        await deleteObject(existing.logoKey);
      } catch (e) {
        console.error("delete logo failed:", e?.message || e);
      }
    }

    return res.json({ updated: true, tenant: { ...tenant, logoSignedUrl: null } });
  } catch (err) {
    console.error("removeTenantLogo error:", err);
    return res.status(500).json({ message: "Failed to remove logo" });
  }
}

module.exports = {
  getTenantSettings,
  updateTenantSettings,
  uploadTenantLogo,
  removeTenantLogo,
};