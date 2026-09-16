export const MAX_TENANT_LOGO_SIZE_BYTES =
  4 * 1024 * 1024;

export function assertTenantLogoFile(file) {
  if (
    !file ||
    !Number.isFinite(
      Number(file.size),
    )
  ) {
    const error =
      new Error(
        "Choose a business logo file",
      );

    error.code =
      "TENANT_LOGO_FILE_REQUIRED";

    throw error;
  }

  if (
    Number(file.size) >
    MAX_TENANT_LOGO_SIZE_BYTES
  ) {
    const error =
      new Error(
        "Business logo must be 4MB or smaller",
      );

    error.code =
      "TENANT_LOGO_TOO_LARGE";

    throw error;
  }

  return file;
}
