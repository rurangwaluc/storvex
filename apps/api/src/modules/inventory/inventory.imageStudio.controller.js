const imageStudioService = require("./inventory.imageStudio.service");

function cleanString(value) {
  const result = String(value || "").trim();
  return result || null;
}

function requestContext(req) {
  return {
    tenantId: cleanString(req.user?.tenantId),
    userId: cleanString(
      req.user?.userId || req.user?.id,
    ),
    branchId: cleanString(
      req.user?.activeBranchId ||
      req.user?.branchId ||
      req.branchAccess?.activeBranchId ||
      req.branch?.id,
    ),
    productId: cleanString(req.params.id),
    imageId: cleanString(req.params.imageId),
  };
}

function handleImageStudioError(error, res, fallbackMessage) {
  console.error(
    `${fallbackMessage}:`,
    error?.message || error,
  );

  return res
    .status(Number(error?.status) || 500)
    .json({
      message:
        error?.message || fallbackMessage,
      code:
        error?.code ||
        "IMAGE_STUDIO_REQUEST_FAILED",
    });
}

async function getImageStudioState(req, res) {
  const context = requestContext(req);

  if (!context.tenantId) {
    return res
      .status(401)
      .json({ message: "Unauthorized" });
  }

  try {
    const studio =
      await imageStudioService.getImageStudioState(
        context,
      );

    return res.json({ studio });
  } catch (error) {
    return handleImageStudioError(
      error,
      res,
      "Failed to load Image Studio",
    );
  }
}

async function cleanProductImage(req, res) {
  const context = requestContext(req);

  if (!context.tenantId) {
    return res
      .status(401)
      .json({ message: "Unauthorized" });
  }

  try {
    const result =
      await imageStudioService.cleanProductImage(
        context,
      );

    return res.status(201).json({
      message: "Cleaned image is ready for review",
      ...result,
    });
  } catch (error) {
    return handleImageStudioError(
      error,
      res,
      "Failed to clean product image",
    );
  }
}

async function approveProductImage(req, res) {
  const context = requestContext(req);

  if (!context.tenantId) {
    return res
      .status(401)
      .json({ message: "Unauthorized" });
  }

  try {
    const image =
      await imageStudioService.approveProductImage(
        context,
      );

    return res.json({
      message: "Image approved for marketplace use",
      image,
    });
  } catch (error) {
    return handleImageStudioError(
      error,
      res,
      "Failed to approve product image",
    );
  }
}

async function removeProductImageApproval(req, res) {
  const context = requestContext(req);

  if (!context.tenantId) {
    return res
      .status(401)
      .json({ message: "Unauthorized" });
  }

  try {
    const image =
      await imageStudioService.removeProductImageApproval(
        context,
      );

    return res.json({
      message: "Marketplace approval removed",
      image,
    });
  } catch (error) {
    return handleImageStudioError(
      error,
      res,
      "Failed to remove product image approval",
    );
  }
}

async function useProductImageAsMain(req, res) {
  const context = requestContext(req);

  if (!context.tenantId) {
    return res
      .status(401)
      .json({ message: "Unauthorized" });
  }

  try {
    const image =
      await imageStudioService.useProductImageAsMain(
        context,
      );

    return res.json({
      message: "Main product image updated",
      image,
    });
  } catch (error) {
    return handleImageStudioError(
      error,
      res,
      "Failed to update the main product image",
    );
  }
}

module.exports = {
  approveProductImage,
  cleanProductImage,
  getImageStudioState,
  removeProductImageApproval,
  useProductImageAsMain,
};
