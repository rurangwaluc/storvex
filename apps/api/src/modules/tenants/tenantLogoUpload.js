const multer = require("multer");

const MAX_TENANT_LOGO_SIZE_BYTES =
  4 * 1024 * 1024;

/*
 * Multer/Busboy can signal LIMIT_FILE_SIZE when a
 * file lands exactly on its configured parser ceiling.
 *
 * The Storvex business rule is <= 4MB, so allow the
 * parser one extra byte and enforce the exact limit
 * after parsing.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize:
      MAX_TENANT_LOGO_SIZE_BYTES + 1,
    files: 1,
    fields: 0,
  },
});

function tenantLogoUpload(
  req,
  res,
  next,
) {
  upload.single("file")(
    req,
    res,
    (error) => {
      if (!error) {
        if (
          req.file &&
          req.file.size >
            MAX_TENANT_LOGO_SIZE_BYTES
        ) {
          return res
            .status(413)
            .json({
              message:
                "Business logo must be 4MB or smaller",
              code:
                "TENANT_LOGO_TOO_LARGE",
            });
        }

        return next();
      }

      if (
        error instanceof
          multer.MulterError &&
        error.code ===
          "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(413)
          .json({
            message:
              "Business logo must be 4MB or smaller",
            code:
              "TENANT_LOGO_TOO_LARGE",
          });
      }

      return res
        .status(400)
        .json({
          message:
            "Invalid business logo upload",
          code:
            "TENANT_LOGO_UPLOAD_INVALID",
        });
    },
  );
}

module.exports = {
  MAX_TENANT_LOGO_SIZE_BYTES,
  tenantLogoUpload,
};
