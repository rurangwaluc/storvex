import {
  proxyApiRequest,
} from "../../../lib/server/apiProxy.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(
  request,
) {
  return proxyApiRequest(
    request,
  );
}

export {
  handle as GET,
  handle as HEAD,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
  handle as OPTIONS,
};
