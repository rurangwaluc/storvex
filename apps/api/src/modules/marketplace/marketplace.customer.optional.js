const authenticateMarketplaceCustomer = require(
  "./marketplace.customer.authenticate",
);

module.exports =
  function optionallyAuthenticateMarketplaceCustomer(
    req,
    res,
    next,
  ) {
    const authorization = String(
      req.headers.authorization || "",
    ).trim();

    /*
      No customer token:
      Continue as a guest order.

      Any supplied token:
      Validate it fully. Invalid, expired, revoked,
      owner, staff, or platform tokens must be rejected.
    */
    if (!authorization) {
      req.marketplaceCustomer = null;
      req.marketplaceCustomerSession = null;

      return next();
    }

    return authenticateMarketplaceCustomer(
      req,
      res,
      next,
    );
  };
