const {
  prepareProviderInput,
} = require("./inventory.productImageStandard.service");

function cleanString(value) {
  return String(value || "").trim();
}

function createProviderError(
  message,
  {
    status = 502,
    code = "BACKGROUND_REMOVAL_FAILED",
  } = {},
) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function configuredProvider() {
  return (
    cleanString(
      process.env.PRODUCT_BACKGROUND_REMOVAL_PROVIDER,
    ).toLowerCase() || "remove_bg"
  );
}

async function removeWithRemoveBg(input) {
  const apiKey = cleanString(
    process.env.REMOVE_BG_API_KEY,
  );

  if (!apiKey) {
    throw createProviderError(
      "Product background removal is not configured.",
      {
        status: 503,
        code: "REMOVE_BG_NOT_CONFIGURED",
      },
    );
  }

  const form = new FormData();

  form.append(
    "image_file",
    new Blob(
      [input.body],
      {
        type: input.contentType,
      },
    ),
    "product.png",
  );

  form.append("size", "auto");
  form.append("format", "png");
  form.append("type", "product");

  let response;

  try {
    response = await fetch(
      "https://api.remove.bg/v1.0/removebg",
      {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body: form,
        signal: AbortSignal.timeout(60_000),
      },
    );
  } catch {
    throw createProviderError(
      "The product photo service could not be reached. Try again.",
      {
        code: "REMOVE_BG_UNAVAILABLE",
      },
    );
  }

  if (!response.ok) {
    let providerMessage = "";

    try {
      const payload = await response.json();

      providerMessage =
        payload?.errors?.[0]?.title ||
        payload?.errors?.[0]?.detail ||
        "";
    } catch {
      providerMessage = "";
    }

    const status =
      response.status === 402 ||
      response.status === 403
        ? 503
        : 502;

    throw createProviderError(
      providerMessage ||
        "The product photo could not be prepared. Try another image.",
      {
        status,
        code:
          response.status === 402
            ? "REMOVE_BG_CREDIT_REQUIRED"
            : "REMOVE_BG_REQUEST_FAILED",
      },
    );
  }

  const body = Buffer.from(
    await response.arrayBuffer(),
  );

  if (!body.length) {
    throw createProviderError(
      "The product photo service returned an empty result.",
      {
        code: "REMOVE_BG_EMPTY_RESULT",
      },
    );
  }

  return {
    body,
    contentType: "image/png",
    provider: "remove_bg",
  };
}

async function removeProductBackground(sourceBody) {
  const provider = configuredProvider();
  const input =
    await prepareProviderInput(sourceBody);

  if (provider === "remove_bg") {
    return removeWithRemoveBg(input);
  }

  throw createProviderError(
    "The configured product background-removal provider is not supported.",
    {
      status: 503,
      code:
        "BACKGROUND_REMOVAL_PROVIDER_UNSUPPORTED",
    },
  );
}

module.exports = {
  configuredProvider,
  removeProductBackground,
};
