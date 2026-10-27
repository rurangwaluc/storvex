import { useMemo, useState } from "react";
import { API_BASE_URL, getActiveBranchId } from "../../services/apiClient";
import { createProduct, uploadProductImage, getProductImages, cleanProductImage, approveProductImageForListing, getProductById, publishProductListing } from "../../services/inventoryApi";

const EXPECTED_CATEGORIES = [
  "electronics",
  "hardware",
  "home-and-kitchen",
  "lighting",
  "spare-parts",
];

const DEMO_PREFIX = "SVX-DEMO-20261018-";

export default function DevCatalogImport() {
  const [manifest, setManifest] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const [photoProgress, setPhotoProgress] = useState("");
  const [prepareProgress, setPrepareProgress] = useState("");
  const [approvalProgress, setApprovalProgress] = useState("");
  const [publishProgress, setPublishProgress] = useState("");
  const [createdProduct, setCreatedProduct] = useState(null);

  const development = process.env.NODE_ENV === "development";

  const report = useMemo(() => {
    const errors = [];
    const rows = [];

    if (!manifest) {
      return { errors, rows, ready: false };
    }

    if (
      manifest.developmentOnly !== true ||
      !Array.isArray(manifest.products) ||
      manifest.products.length !== 15
    ) {
      errors.push("Expected exactly 15 development-only products.");
    }

    const seen = new Set();
    const photoMap = new Map(
      photos.map((file) => [file.name.toLowerCase(), file])
    );

    for (const product of manifest.products || []) {
      const sku = String(product.sku || "");
      const category = String(product.category || "");
      const expectedName = `${sku.toLowerCase()}.webp`;
      const photo = photoMap.get(expectedName);

      if (
        !sku.startsWith(DEMO_PREFIX) ||
        seen.has(sku)
      ) {
        errors.push(`Invalid or duplicate demo SKU: ${sku}`);
      }

      seen.add(sku);

      if (!EXPECTED_CATEGORIES.includes(category)) {
        errors.push(`Invalid category for ${sku}`);
      }

      if (
        product.developmentOnly !== true ||
        product.currency !== "RWF" ||
        !String(product.title || "").startsWith("Demo")
      ) {
        errors.push(`Invalid demo listing details: ${sku}`);
      }

      if (
        !Number.isFinite(product.marketplacePrice) ||
        product.marketplacePrice <= 0 ||
        !Number.isInteger(product.stockQty) ||
        product.stockQty < 0
      ) {
        errors.push(`Invalid price or stock: ${sku}`);
      }

      if (
        product.marketplaceSalePrice !== null &&
        product.marketplaceSalePrice !== undefined &&
        (
          !Number.isFinite(product.marketplaceSalePrice) ||
          product.marketplaceSalePrice >= product.marketplacePrice
        )
      ) {
        errors.push(`Invalid sale price: ${sku}`);
      }

      if (!photo || photo.type !== "image/webp") {
        errors.push(`Missing WebP photograph: ${sku}`);
      }

      rows.push({ ...product, photo });
    }

    for (const category of EXPECTED_CATEGORIES) {
      if (rows.filter((row) => row.category === category).length !== 3) {
        errors.push(`Expected three products in ${category}`);
      }
    }

    return {
      errors,
      rows,
      ready:
        errors.length === 0 &&
        rows.length === 15 &&
        photos.length === 15,
    };
  }, [manifest, photos]);

  async function loadManifest(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      setManifest(data);
      setMessage("");
    } catch {
      setManifest(null);
      setMessage("The selected manifest is not valid JSON.");
    }
  }

  async function importFirstProduct() {
    if (!development || !report.ready || importing || createdProduct) return;

    const branchId = getActiveBranchId();
    if (!branchId) {
      setMessage("Select a branch before importing.");
      return;
    }

    const item = report.rows[0];

    const confirmed = window.confirm(
      `Create ONE development inventory product?\n\n` +
      `${item.title}\n${item.sku}\n` +
      `Branch: ${branchId}\n\n` +
      `This writes to the local inventory database. ` +
      `No image will be uploaded or listing published yet.`
    );

    if (!confirmed) return;

    setImporting(true);
    setMessage("Creating the first demonstration product...");

    try {
      const result = await createProduct({
        name: item.title,
        sku: item.sku,
        category: item.category,
        costPrice: item.costPrice,
        sellPrice: item.marketplacePrice,
        stockQty: item.stockQty,
      }, { branchId });

      const id =
        result?.product?.id ||
        result?.data?.product?.id ||
        result?.data?.id ||
        result?.id;

      setCreatedProduct({ sku: item.sku, id: id || null });
      setMessage(
        `Created ${item.sku} successfully. ` +
        (id ? `Product ID: ${id}` : "Check the inventory list for its ID.") +
        " No image uploaded or listing published."
      );
    } catch (error) {
      setMessage(
        `Import stopped: ${error?.message || "Product creation failed"}. ` +
        "Check inventory for this SKU before attempting another import."
      );
    } finally {
      setImporting(false);
    }
  }


  async function importRemainingProducts() {
    if (
      !development ||
      !report.ready ||
      importing ||
      !getActiveBranchId()
    ) {
      return;
    }

    const branchId = getActiveBranchId();

    const journalKey =
      `storvex-demo-import-20261018:${branchId}`;

    let journal;

    try {
      const saved = localStorage.getItem(journalKey);
      journal = saved ? JSON.parse(saved) : {};

      if (
        !journal ||
        typeof journal !== "object" ||
        Array.isArray(journal)
      ) {
        throw new Error("Invalid progress journal");
      }
    } catch {
      setBulkProgress(
        "STOP: The saved import journal could not be read."
      );
      return;
    }

    const remaining = report.rows.filter(
      (product) => product.sku !== "SVX-DEMO-20261018-001"
    );

    if (remaining.length !== 14) {
      setBulkProgress(
        "STOP: Expected exactly 14 remaining demo products."
      );
      return;
    }

    const invalidJournal = Object.values(journal).some(
      (entry) =>
        !entry ||
        !["created"].includes(entry.status) ||
        !entry.id
    );

    if (invalidJournal) {
      setBulkProgress(
        "STOP: The previous import may have been interrupted. " +
        "Review the saved results before trying again."
      );
      return;
    }

    const pending = remaining.filter(
      (product) => !journal[product.sku]
    );

    if (pending.length === 0) {
      setBulkProgress(
        "All 14 remaining inventory products are already " +
        "recorded as created. No duplicates attempted."
      );
      return;
    }

    const confirmed = window.confirm(
      `STORVEX DEVELOPMENT IMPORT\n\n` +
      `Branch: ${branchId}\n` +
      `Products to create: ${pending.length}\n\n` +
      `Each successful product will be recorded locally.\n` +
      `An interrupted or uncertain import will stop.\n\n` +
      `NO images will be uploaded.\n` +
      `NO listings will be published.\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setImporting(true);

    let completed = 0;

    try {
      for (const product of pending) {
        if (getActiveBranchId() !== branchId) {
          throw new Error(
            "Active branch changed. Import stopped."
          );
        }

        setBulkProgress(
          `Creating ${completed + 1} of ${pending.length}: ` +
          product.sku
        );

        // Save an in-flight marker BEFORE sending the request.
        // If the connection fails, a retry cannot silently
        // duplicate a product that may already exist.
        journal[product.sku] = {
          status: "pending",
          startedAt: new Date().toISOString(),
        };

        localStorage.setItem(
          journalKey,
          JSON.stringify(journal)
        );

        const response = await createProduct(
          {
            name: product.title,
            sku: product.sku,
            category: product.category,
            costPrice: product.costPrice,
            sellPrice: product.marketplacePrice,
            stockQty: product.stockQty,
          },
          { branchId }
        );

        const id =
          response?.product?.id ||
          response?.data?.product?.id ||
          response?.data?.id ||
          response?.id;

        if (!id) {
          throw new Error(
            `Product ${product.sku} returned no ID. ` +
            `Manual reconciliation required.`
          );
        }

        journal[product.sku] = {
          status: "created",
          id,
          createdAt: new Date().toISOString(),
        };

        localStorage.setItem(
          journalKey,
          JSON.stringify(journal)
        );

        completed += 1;
      }

      setBulkProgress(
        `SUCCESS: ${completed} products created this run. ` +
        `All 14 remaining products are recorded in the ` +
        `local import journal. Images and publication pending.`
      );
    } catch (error) {
      setBulkProgress(
        `STOPPED after ${completed} successful creations: ` +
        `${error?.message || "Unknown error"}. ` +
        `Previously created IDs remain saved. ` +
        `Do not clear browser storage or retry an uncertain ` +
        `product without checking the inventory.`
      );
    } finally {
      setImporting(false);
    }
  }


  async function uploadRemainingPhotos() {
    if (!development || !report.ready || importing) return;

    const branchId = getActiveBranchId();

    if (!branchId) {
      setPhotoProgress("STOP: No active branch selected.");
      return;
    }

    const productKey = `storvex-demo-import-20261018:${branchId}`;
    const photoKey = `storvex-demo-photos-20261018:${branchId}`;

    let products;
    let uploads;

    try {
      products = JSON.parse(localStorage.getItem(productKey) || "{}");
      uploads = JSON.parse(localStorage.getItem(photoKey) || "{}");

      if (
        !products || Array.isArray(products) ||
        typeof products !== "object" ||
        !uploads || Array.isArray(uploads) ||
        typeof uploads !== "object"
      ) {
        throw new Error("Invalid import journal");
      }
    } catch {
      setPhotoProgress("STOP: Saved import records are invalid.");
      return;
    }

    const remaining = report.rows.filter(
      (item) => item.sku !== "SVX-DEMO-20261018-001"
    );

    if (
      remaining.length !== 14 ||
      remaining.some(
        (item) =>
          products[item.sku]?.status !== "created" ||
          !products[item.sku]?.id ||
          !item.photo ||
          item.photo.type !== "image/webp" ||
          !item.photo.webkitRelativePath
            .replaceAll("\\", "/")
            .toLowerCase()
            .endsWith(
              `/${item.category}/${item.sku.toLowerCase()}.webp`
            )
      )
    ) {
      setPhotoProgress(
        "STOP: Product IDs or category-specific images do not match."
      );
      return;
    }

    const invalidSaved = Object.entries(uploads).some(
      ([sku, entry]) =>
        !remaining.some((item) => item.sku === sku) ||
        !["pending", "uploaded"].includes(entry?.status) ||
        (entry.status === "uploaded" && !entry.productId)
    );

    if (invalidSaved) {
      setPhotoProgress("STOP: Invalid photo journal.");
      return;
    }

    const uncertain = remaining.filter(
      (item) => uploads[item.sku]?.status === "pending"
    );

    if (uncertain.length) {
      setPhotoProgress(
        "STOP: An earlier image upload has an uncertain result: " +
        uncertain.map((item) => item.sku).join(", ") +
        ". Check the product's image page before resuming."
      );
      return;
    }

    const pending = remaining.filter(
      (item) => !uploads[item.sku]
    );

    if (!pending.length) {
      setPhotoProgress(
        "All 14 product-image uploads are already recorded."
      );
      return;
    }

    if (
      uploads &&
      Object.entries(uploads).some(
        ([sku, entry]) =>
          entry.status === "uploaded" &&
          entry.productId !== products[sku]?.id
      )
    ) {
      setPhotoProgress(
        "STOP: Photo journal product IDs have changed."
      );
      return;
    }

    const confirmed = window.confirm(
      `STORVEX LOCAL DEMO PHOTO UPLOAD\n\n` +
      `Branch: ${branchId}\n` +
      `Photos to upload: ${pending.length}\n\n` +
      `One correct photo will be attached to each product.\n` +
      `Images will not be cleaned, approved, or published yet.\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setImporting(true);
    let completed = 0;

    try {
      for (const item of pending) {
        if (getActiveBranchId() !== branchId) {
          throw new Error("Active branch changed.");
        }

        const productId = products[item.sku].id;

        setPhotoProgress(
          `Uploading ${completed + 1}/${pending.length}: ${item.sku}`
        );

        uploads[item.sku] = {
          status: "pending",
          productId,
          startedAt: new Date().toISOString(),
        };

        localStorage.setItem(photoKey, JSON.stringify(uploads));

        await uploadProductImage(
          productId,
          item.photo,
          {
            altText: item.title,
            sortOrder: 0,
            isPrimary: true,
          },
          { branchId }
        );

        uploads[item.sku] = {
          status: "uploaded",
          productId,
          filename: item.photo.name,
          uploadedAt: new Date().toISOString(),
        };

        localStorage.setItem(photoKey, JSON.stringify(uploads));
        completed += 1;
      }

      setPhotoProgress(
        `SUCCESS: ${completed} photographs uploaded this run. ` +
        `All 14 photo uploads are recorded. ` +
        `Image Studio preparation and publication are pending.`
      );
    } catch (error) {
      setPhotoProgress(
        `STOPPED after ${completed} successful uploads. ` +
        `${error?.message || "Upload failed"}. ` +
        `Check the affected product before retrying.`
      );
    } finally {
      setImporting(false);
    }
  }


  async function prepareRemainingPhotos() {
    if (!development || !report.ready || importing) return;

    const branchId = getActiveBranchId();
    if (!branchId) {
      setPrepareProgress("STOP: Select the RURAXIS branch.");
      return;
    }

    const prefix = "storvex-demo-";
    const suffix = `20261018:${branchId}`;

    const productKey = `${prefix}import-${suffix}`;
    const photoKey = `${prefix}photos-${suffix}`;
    const prepareKey = `${prefix}prepared-${suffix}`;

    let products, uploads, prepared;

    try {
      products = JSON.parse(localStorage.getItem(productKey) || "{}");
      uploads = JSON.parse(localStorage.getItem(photoKey) || "{}");
      prepared = JSON.parse(localStorage.getItem(prepareKey) || "{}");

      for (const item of [products, uploads, prepared]) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          throw new Error("Invalid progress journal");
        }
      }
    } catch {
      setPrepareProgress("STOP: Import journals could not be read.");
      return;
    }

    const remaining = report.rows.filter(
      (item) => item.sku !== "SVX-DEMO-20261018-001"
    );

    if (
      remaining.length !== 14 ||
      remaining.some(
        (item) =>
          products[item.sku]?.status !== "created" ||
          !products[item.sku]?.id ||
          uploads[item.sku]?.status !== "uploaded" ||
          uploads[item.sku]?.productId !== products[item.sku]?.id
      )
    ) {
      setPrepareProgress(
        "STOP: All 14 product creations and uploads must be verified."
      );
      return;
    }

    if (
      Object.values(prepared).some(
        (entry) =>
          !entry ||
          !["pending", "prepared"].includes(entry.status)
      )
    ) {
      setPrepareProgress("STOP: Invalid preparation journal.");
      return;
    }

    if (
      remaining.some(
        (item) =>
          prepared[item.sku]?.status === "pending" ||
          (
            prepared[item.sku]?.status === "prepared" &&
            prepared[item.sku]?.productId !== products[item.sku]?.id
          )
      )
    ) {
      setPrepareProgress(
        "STOP: A previous preparation is uncertain or has a " +
        "mismatched product ID. Inspect the product photos first."
      );
      return;
    }

    const pending = remaining.filter(
      (item) => !prepared[item.sku]
    );

    if (!pending.length) {
      setPrepareProgress(
        "All 14 photographs are recorded as prepared."
      );
      return;
    }

    if (!window.confirm(
      `Prepare ${pending.length} uploaded photographs in Image Studio?\n\n` +
      `Branch: ${branchId}\n` +
      `Existing headphones photographs will be untouched.\n` +
      `No Marketplace approvals or publications will occur.\n\n` +
      `Continue?`
    )) return;

    setImporting(true);
    let completed = 0;

    try {
      for (const item of pending) {
        if (getActiveBranchId() !== branchId) {
          throw new Error("Active branch changed.");
        }

        const productId = products[item.sku].id;

        setPrepareProgress(
          `Preparing ${completed + 1}/${pending.length}: ${item.sku}`
        );

        // Read the actual product images before acting.
        const response = await getProductImages(
          productId,
          { branchId }
        );

        const images =
          Array.isArray(response) ? response :
          Array.isArray(response?.images) ? response.images :
          Array.isArray(response?.data?.images) ? response.data.images :
          Array.isArray(response?.productImages) ? response.productImages :
          Array.isArray(response?.data?.productImages)
            ? response.data.productImages
            : null;

        if (!images) {
          throw new Error(
            `Unexpected image API response for ${item.sku}`
          );
        }

        const originals = images.filter((image) => {
          const type = String(
            image.imageType || image.type || ""
          ).toUpperCase();

          return (
            type === "ORIGINAL" ||
            (!type && !image.sourceImageId)
          );
        });

        // Each of these 14 products received exactly
        // one photograph through the bulk uploader.
        if (
          originals.length !== 1 ||
          images.some((image) =>
            String(image.imageType || image.type || "")
              .toUpperCase() === "CLEANED"
          )
        ) {
          throw new Error(
            `Unexpected image state for ${item.sku}; ` +
            `review its Product Images page.`
          );
        }

        const originalId = originals[0].id;

        if (!originalId) {
          throw new Error(`Missing original image ID: ${item.sku}`);
        }

        prepared[item.sku] = {
          status: "pending",
          productId,
          originalId,
          startedAt: new Date().toISOString(),
        };

        localStorage.setItem(
          prepareKey,
          JSON.stringify(prepared)
        );

        const result = await cleanProductImage(
          productId,
          originalId,
          { branchId }
        );

        const resultImageId =
          result?.resultImage?.id ||
          result?.data?.resultImage?.id ||
          result?.image?.id ||
          null;

        prepared[item.sku] = {
          status: "prepared",
          productId,
          originalId,
          resultImageId,
          completedAt: new Date().toISOString(),
        };

        localStorage.setItem(
          prepareKey,
          JSON.stringify(prepared)
        );

        completed += 1;
      }

      setPrepareProgress(
        `SUCCESS: ${completed} photos prepared this run. ` +
        `Image Studio preparation is recorded for all 14 products. ` +
        `Marketplace approval and publication are still pending.`
      );
    } catch (error) {
      setPrepareProgress(
        `STOPPED after ${completed} successful preparations: ` +
        `${error?.message || "Unknown error"}. ` +
        `Progress was retained. Do not clear browser storage.`
      );
    } finally {
      setImporting(false);
    }
  }


  async function approveRemainingPhotos() {
    if (!development || !report.ready || importing) return;

    const branchId = getActiveBranchId();
    if (!branchId) {
      setApprovalProgress("STOP: No active branch selected.");
      return;
    }

    const suffix = `20261018:${branchId}`;

    const productKey = `storvex-demo-import-${suffix}`;
    const photoKey = `storvex-demo-photos-${suffix}`;
    const prepareKey = `storvex-demo-prepared-${suffix}`;
    const approvalKey = `storvex-demo-approved-${suffix}`;

    let products, uploads, prepared, approved;

    try {
      const load = (key) => {
        const value = JSON.parse(localStorage.getItem(key) || "{}");
        if (
          !value ||
          typeof value !== "object" ||
          Array.isArray(value)
        ) {
          throw new Error(`Invalid journal: ${key}`);
        }
        return value;
      };

      products = load(productKey);
      uploads = load(photoKey);
      prepared = load(prepareKey);
      approved = load(approvalKey);
    } catch (error) {
      setApprovalProgress(`STOP: ${error.message}`);
      return;
    }

    const remaining = report.rows.filter(
      (item) => item.sku !== "SVX-DEMO-20261018-001"
    );

    if (
      remaining.length !== 14 ||
      remaining.some((item) => {
        const id = products[item.sku]?.id;
        return (
          products[item.sku]?.status !== "created" ||
          !id ||
          uploads[item.sku]?.status !== "uploaded" ||
          uploads[item.sku]?.productId !== id ||
          prepared[item.sku]?.status !== "prepared" ||
          prepared[item.sku]?.productId !== id ||
          !prepared[item.sku]?.originalId
        );
      })
    ) {
      setApprovalProgress(
        "STOP: Product, upload, and preparation journals " +
        "must agree for all 14 products."
      );
      return;
    }

    if (
      remaining.some((item) => {
        const entry = approved[item.sku];
        return entry && (
          !["pending", "approved"].includes(entry.status) ||
          entry.productId !== products[item.sku].id
        );
      })
    ) {
      setApprovalProgress(
        "STOP: Saved approval journal contains conflicting records."
      );
      return;
    }

    if (!window.confirm(
      "Approve the 14 prepared demo photographs?\n\n" +
      "This makes their images available for Marketplace listings.\n" +
      "The product listings themselves will NOT be published.\n\n" +
      `Active branch: ${branchId}\n\nContinue?`
    )) return;

    setImporting(true);
    let completed = 0;
    let previouslyApproved = 0;

    try {
      for (const item of remaining) {
        if (getActiveBranchId() !== branchId) {
          throw new Error("Active branch changed.");
        }

        const productId = products[item.sku].id;
        const expectedOriginalId = prepared[item.sku].originalId;

        setApprovalProgress(
          `Checking ${completed + previouslyApproved + 1}/14: ${item.sku}`
        );

        // Inspect server state each time. This also safely
        // reconciles an interrupted approval request.
        const response = await getProductImages(
          productId,
          { branchId }
        );

        const images =
          Array.isArray(response) ? response :
          Array.isArray(response?.images) ? response.images :
          Array.isArray(response?.data?.images)
            ? response.data.images :
          Array.isArray(response?.productImages)
            ? response.productImages :
          Array.isArray(response?.data?.productImages)
            ? response.data.productImages : null;

        if (!images) {
          throw new Error(
            `Unexpected image response for ${item.sku}`
          );
        }

        const originals = images.filter(
          (image) =>
            String(image.imageType || image.type || "")
              .toUpperCase() === "ORIGINAL"
        );

        const cleaned = images.filter(
          (image) =>
            String(image.imageType || image.type || "")
              .toUpperCase() === "CLEANED"
        );

        if (
          originals.length !== 1 ||
          originals[0].id !== expectedOriginalId ||
          cleaned.length !== 1 ||
          !cleaned[0].id ||
          cleaned[0].sourceImageId !== expectedOriginalId
        ) {
          throw new Error(
            `Image mismatch for ${item.sku}. ` +
            "Review its Product Images page before continuing."
          );
        }

        const image = cleaned[0];

        if (image.isMarketplaceApproved === true) {
          approved[item.sku] = {
            status: "approved",
            productId,
            imageId: image.id,
            reconciledAt: new Date().toISOString(),
          };
          localStorage.setItem(
            approvalKey,
            JSON.stringify(approved)
          );
          previouslyApproved++;
          continue;
        }

        // Record the intended operation first.
        approved[item.sku] = {
          status: "pending",
          productId,
          imageId: image.id,
          startedAt: new Date().toISOString(),
        };

        localStorage.setItem(
          approvalKey,
          JSON.stringify(approved)
        );

        await approveProductImageForListing(
          productId,
          image.id,
          { branchId }
        );

        approved[item.sku] = {
          status: "approved",
          productId,
          imageId: image.id,
          completedAt: new Date().toISOString(),
        };

        localStorage.setItem(
          approvalKey,
          JSON.stringify(approved)
        );

        completed++;
      }

      setApprovalProgress(
        `SUCCESS: All 14 demo photographs approved. ` +
        `${completed} approved this run; ` +
        `${previouslyApproved} already approved. ` +
        "Product listings are not published."
      );
    } catch (error) {
      setApprovalProgress(
        `STOPPED: ${error?.message || "Approval failed"}. ` +
        `${completed} approved this run. ` +
        "Progress saved. Do not clear browser storage."
      );
    } finally {
      setImporting(false);
    }
  }


  async function publishDemoListings() {
    if (!development || !report.ready || importing) return;

    const hostname = window.location.hostname;
    const apiBase = String(API_BASE_URL || "");

    if (
      !["localhost", "127.0.0.1"].includes(hostname) ||
      !(
        apiBase === "/api" ||
        /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api\/?$/i
          .test(apiBase)
      )
    ) {
      setPublishProgress(
        "STOP: Publication requires the local development website and API."
      );
      return;
    }

    const branchId = getActiveBranchId();
    const expectedBranch = "81d1d3c3-395e-42b2-8d37-f49e5763df73";

    if (branchId !== expectedBranch) {
      setPublishProgress("STOP: Unexpected active RURAXIS branch.");
      return;
    }

    const suffix = `20261018:${branchId}`;

    const load = (key) => {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`Invalid saved journal: ${key}`);
      }
      return parsed;
    };

    let products, uploads, prepared, approved, published;

    try {
      products = load(`storvex-demo-import-${suffix}`);
      uploads = load(`storvex-demo-photos-${suffix}`);
      prepared = load(`storvex-demo-prepared-${suffix}`);
      approved = load(`storvex-demo-approved-${suffix}`);
      published = load(`storvex-demo-published-${suffix}`);
    } catch (error) {
      setPublishProgress(`STOP: ${error.message}`);
      return;
    }

    const firstSku = "SVX-DEMO-20261018-001";
    const firstId = "ba9a22f1-cd4b-4403-bb9c-9b12d5fdb96c";

    const getId = (item) =>
      item.sku === firstSku
        ? firstId
        : products[item.sku]?.id;

    const rows = report.rows;

    if (
      rows.length !== 15 ||
      rows.some((item) =>
        !getId(item) ||
        !item.developmentOnly ||
        !item.title.startsWith("Demo") ||
        !String(item.description || "")
          .includes("Not genuine merchandise") ||
        !["electronics", "hardware", "home-and-kitchen",
          "lighting", "spare-parts"].includes(item.category)
      )
    ) {
      setPublishProgress(
        "STOP: Product IDs or demonstration listing details are invalid."
      );
      return;
    }

    if (
      rows.some((item) =>
        item.sku !== firstSku &&
        (
          products[item.sku]?.status !== "created" ||
          uploads[item.sku]?.status !== "uploaded" ||
          prepared[item.sku]?.status !== "prepared" ||
          approved[item.sku]?.status !== "approved" ||
          approved[item.sku]?.productId !== getId(item)
        )
      )
    ) {
      setPublishProgress(
        "STOP: The 14 product and image approval journals must agree."
      );
      return;
    }

    const key = `storvex-demo-published-${suffix}`;

    const conflicts = rows.filter((item) => {
      const saved = published[item.sku];
      return saved &&
        (
          saved.productId !== getId(item) ||
          !["pending", "published"].includes(saved.status)
        );
    });

    if (conflicts.length) {
      setPublishProgress(
        "STOP: Saved publication journal contains conflicting records."
      );
      return;
    }

    const uncertain = rows.filter(
      (item) => published[item.sku]?.status === "pending"
    );

    if (uncertain.length) {
      setPublishProgress(
        "STOP: Publication status requires reconciliation for " +
        uncertain.map((item) => item.sku).join(", ") +
        ". Do not retry until the listing state is verified."
      );
      return;
    }

    const pending = rows.filter(
      (item) => !published[item.sku]
    );

    if (!pending.length) {
      setPublishProgress(
        "All 15 demo products are recorded as published."
      );
      return;
    }

    const confirmed = window.confirm(
      "PUBLISH DEVELOPMENT DEMO LISTINGS\n\n" +
      `Listings to publish: ${pending.length}\n` +
      `Branch: ${branchId}\n\n` +
      "Products will be visible in the LOCAL Marketplace.\n" +
      "They are fictitious demonstration merchandise.\n" +
      "The three existing products will not be modified.\n\n" +
      "Continue?"
    );

    if (!confirmed) return;

    setImporting(true);
    let completed = 0;

    try {
      for (const item of pending) {
        if (getActiveBranchId() !== branchId) {
          throw new Error("Active branch changed.");
        }

        const productId = getId(item);

        setPublishProgress(
          `Checking ${completed + 1}/${pending.length}: ${item.sku}`
        );

        // Verify the server-side product identity before publication.
        const response = await getProductById(
          productId,
          { branchId }
        );

        const product =
          response?.product ||
          response?.data?.product ||
          response?.data ||
          response;

        if (
          !product ||
          product.id !== productId ||
          product.sku !== item.sku
        ) {
          throw new Error(
            `Unable to verify product identity: ${item.sku}`
          );
        }

        if (
          String(
            product.marketplaceStatus ||
            product.listingStatus ||
            ""
          ).toUpperCase() === "PUBLISHED"
        ) {
          throw new Error(
            `${item.sku} is already published but not journaled. ` +
            "Reconcile it before continuing."
          );
        }

        const payload = {
          listingTitle: item.title,
          listingDescription: item.description,
          listingPrice: item.marketplacePrice,
          listingCategory: item.category,
        };

        if (
          item.marketplaceSalePrice !== null &&
          item.marketplaceSalePrice !== undefined
        ) {
          payload.listingSalePrice = item.marketplaceSalePrice;
        }

        published[item.sku] = {
          status: "pending",
          productId,
          startedAt: new Date().toISOString(),
        };

        localStorage.setItem(key, JSON.stringify(published));

        await publishProductListing(
          productId,
          payload,
          { branchId }
        );

        published[item.sku] = {
          status: "published",
          productId,
          completedAt: new Date().toISOString(),
        };

        localStorage.setItem(key, JSON.stringify(published));
        completed++;
      }

      setPublishProgress(
        `SUCCESS: ${completed} demo listings published this run. ` +
        "All 15 Marketplace listings are recorded as published."
      );
    } catch (error) {
      setPublishProgress(
        `STOPPED after ${completed} publications: ` +
        `${error?.message || "Unknown error"}. ` +
        "Progress is retained. Do not clear browser storage."
      );
    } finally {
      setImporting(false);
    }
  }

  if (!development) {
    return <main>Development catalog importer is unavailable.</main>;
  }

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 20px 80px",
      }}
    >
      <p style={{ fontWeight: 700 }}>STORVEX / DEVELOPMENT</p>

      <h1>Test Product Catalog</h1>

      <p>
        Preview the 15 demonstration products before importing
        them into your local inventory. No database operations
        are performed on this page.
      </p>

      <p>
        Active branch: <strong>{getActiveBranchId() || "Not selected"}</strong>
      </p>

      <div style={{
        display: "grid",
        gap: 20,
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        margin: "28px 0",
      }}>
        <label>
          <strong>1. Choose product manifest</strong>
          <p>Select storvex-demo-products.json.</p>
          <input
            type="file"
            accept=".json,application/json"
            onChange={loadManifest}
          />
        </label>

        <label>
          <strong>2. Choose image folder</strong>
          <p>Select the test-catalog/images folder.</p>
          <input
            type="file"
            accept="image/webp"
            multiple
            webkitdirectory=""
            directory=""
            onChange={(event) => {
              setPhotos(Array.from(event.target.files || []));
              setMessage("");
            }}
          />
        </label>
      </div>

      <p>
        Manifest: <strong>{manifest?.products?.length || 0} products</strong>
        {" · "}
        Images selected: <strong>{photos.length}</strong>
      </p>

      {message && <p role="alert">{message}</p>}

      {report.errors.length > 0 && (
        <div role="alert">
          <strong>Issues to resolve</strong>
          <ul>
            {report.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}


      {report.ready && (
        <section
          style={{
            border: "1px solid #aaa5",
            borderRadius: 12,
            padding: 20,
            margin: "24px 0",
          }}
        >
          <h2>Import the remaining 14 products</h2>

          <p>
            Product 001 was created separately.
            This operation creates products 002–015
            using your authenticated inventory API.
          </p>

          <p>
            No images will be uploaded and no
            Marketplace listings will be published yet.
          </p>

          <button
            type="button"
            disabled={importing || !getActiveBranchId()}
            onClick={importRemainingProducts}
            style={{
              background: "#087ac5",
              color: "#fff",
              border: 0,
              borderRadius: 9,
              padding: "13px 20px",
              fontWeight: 700,
              cursor: importing ? "wait" : "pointer",
            }}
          >
            {importing
              ? "Import in progress..."
              : "Import remaining 14 products"}
          </button>

          {bulkProgress && (
            <p role="status" aria-live="polite">
              <strong>{bulkProgress}</strong>
            </p>
          )}
        </section>
      )}


      {report.ready && (
        <section style={{
          border: "1px solid #aaa5",
          borderRadius: 12,
          padding: 20,
          margin: "20px 0",
        }}>
          <h2>Upload product photographs</h2>
          <p>
            Attach one correct photograph to each of the 14
            new inventory products. Product 001 is excluded.
          </p>
          <button
            type="button"
            disabled={importing}
            onClick={uploadRemainingPhotos}
            style={{
              background: "#087ac5",
              color: "#fff",
              border: 0,
              borderRadius: 9,
              padding: "13px 20px",
              fontWeight: 700,
            }}
          >
            {importing
              ? "Processing..."
              : "Upload the 14 product photos"}
          </button>
          {photoProgress && (
            <p role="status" aria-live="polite">
              <strong>{photoProgress}</strong>
            </p>
          )}
        </section>
      )}


      {report.ready && (
        <section style={{
          border: "1px solid #aaa5",
          borderRadius: 12,
          padding: 20,
          margin: "20px 0",
        }}>
          <h2>Prepare photographs in Image Studio</h2>

          <p>
            Prepare the 14 uploaded photographs through
            Storvex's existing Image Studio. Product 001
            is excluded. Approval and publication remain separate.
          </p>

          <button
            type="button"
            disabled={importing}
            onClick={prepareRemainingPhotos}
            style={{
              background: "#087ac5",
              color: "#fff",
              border: 0,
              borderRadius: 9,
              padding: "13px 20px",
              fontWeight: 700,
            }}
          >
            {importing
              ? "Preparing photographs..."
              : "Prepare the 14 product photos"}
          </button>

          {prepareProgress && (
            <p role="status" aria-live="polite">
              <strong>{prepareProgress}</strong>
            </p>
          )}
        </section>
      )}


      {report.ready && (
        <section style={{
          border: "1px solid #aaa5",
          borderRadius: 12,
          padding: 20,
          margin: "20px 0",
        }}>
          <h2>Approve prepared photographs</h2>
          <p>
            Approve the 14 prepared demo photographs for
            Marketplace use. This does not publish products.
          </p>
          <button
            type="button"
            disabled={importing}
            onClick={approveRemainingPhotos}
            style={{
              background: "#087ac5",
              color: "#fff",
              border: 0,
              borderRadius: 9,
              padding: "13px 20px",
              fontWeight: 700,
            }}
          >
            {importing
              ? "Approving photographs..."
              : "Approve the 14 product photos"}
          </button>
          {approvalProgress && (
            <p role="status" aria-live="polite">
              <strong>{approvalProgress}</strong>
            </p>
          )}
        </section>
      )}


      {report.ready && (
        <section style={{
          border: "1px solid #aaa5",
          borderRadius: 12,
          padding: 20,
          margin: "20px 0",
        }}>
          <h2>Publish local demo listings</h2>
          <p>
            Publish the 15 demonstration products using the
            existing owner-authorized Marketplace API.
            Includes five test sale prices.
          </p>
          <button
            type="button"
            disabled={importing}
            onClick={publishDemoListings}
            style={{
              background: "#087ac5",
              color: "#fff",
              border: 0,
              borderRadius: 9,
              padding: "13px 20px",
              fontWeight: 700,
            }}
          >
            {importing
              ? "Publishing demo listings..."
              : "Publish 15 local demo listings"}
          </button>
          {publishProgress && (
            <p role="status" aria-live="polite">
              <strong>{publishProgress}</strong>
            </p>
          )}
        </section>
      )}

      {report.ready && !createdProduct && (
        <div style={{ margin: "24px 0" }}>
          <button
            type="button"
            disabled={importing}
            onClick={importFirstProduct}
            style={{
              background: "#087ac5",
              color: "#fff",
              border: 0,
              borderRadius: 9,
              padding: "13px 20px",
              cursor: importing ? "wait" : "pointer",
              fontWeight: 700,
            }}
          >
            {importing
              ? "Creating first product..."
              : "Import first test product only"}
          </button>
          <p>
            This creates one inventory record after confirmation.
            It does not upload images or publish listings.
          </p>
        </div>
      )}

      {report.ready && (
        <p style={{ fontWeight: 700 }}>
          All 15 demonstration listings passed the import preview.
          Product creation is available only after confirmation.
        </p>
      )}

      {report.rows.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginTop: 28,
        }}>
          {report.rows.map((product) => (
            <article
              key={product.sku}
              style={{
                border: "1px solid #aaa5",
                borderRadius: 12,
                overflow: "hidden",
                padding: 12,
              }}
            >
              {product.photo && (
                <img
                  src={URL.createObjectURL(product.photo)}
                  alt={product.title}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "contain",
                  }}
                />
              )}

              <h3 style={{ fontSize: 16 }}>{product.title}</h3>

              <p>{product.category}</p>

              <strong>
                RWF {product.marketplacePrice.toLocaleString()}
              </strong>

              <p>Stock: {product.stockQty}</p>

              {product.marketplaceSalePrice !== null &&
                product.marketplaceSalePrice !== undefined && (
                  <p>
                    Test sale: RWF{" "}
                    {product.marketplaceSalePrice.toLocaleString()}
                  </p>
                )}

              <small>{product.sku}</small>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
