"use strict";
const { randomUUID } = require("node:crypto");
const { createAccountSignupSessionService } = require("./accountSignupSession.service");
const { readAccountSessionCookie } = require("./businessAccess.guard");
const { resolveBusinessMembership } = require("./businessMembership.service");

function createAccountWorkspaceSessionHandler({
  prisma, signAuthToken, getClientIp, getUserAgent,
  accountSessions = createAccountSignupSessionService({ prisma }),
  membershipResolver = resolveBusinessMembership,
}) {
  if (!prisma?.storvexBusinessMembership?.findMany ||
      !prisma?.user?.findUnique || !prisma?.userSession?.create ||
      typeof signAuthToken !== "function" ||
      typeof accountSessions?.authenticate !== "function") {
    throw new TypeError("Complete workspace session dependencies required");
  }
  return async function accountWorkspaceSession(req, res) {
    res.set("Cache-Control", "no-store");
    const origin = req.get?.("origin");
    if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
      return res.status(403).json({ message: "Request origin not permitted." });
    }
    const cookie = readAccountSessionCookie(req);
    if (!cookie) return res.status(401).json({ message: "Sign in to continue." });
    try {
      const actor = await accountSessions.authenticate(cookie);
      if (!actor?.accountId || actor.emailVerified !== true) {
        return res.status(401).json({ message: "Sign in to continue." });
      }
      // Account ID comes exclusively from the validated session.
      const memberships = await prisma.storvexBusinessMembership.findMany({
        where: { accountId: actor.accountId, status: "ACTIVE", tenant: { status: "ACTIVE" } },
        select: { accountId: true, tenantId: true, retailUserId: true, role: true },
        take: 2,
      });
      if (memberships.length === 0) {
        return res.status(404).json({ code: "NO_BUSINESS_MEMBERSHIP", message: "Complete your business setup." });
      }
      if (memberships.length > 1) {
        return res.status(409).json({ code: "BUSINESS_SELECTION_REQUIRED", message: "Business selection is required for this account." });
      }
      const membership = memberships[0];
      const authorized = await membershipResolver({
        prisma, accountId: actor.accountId, tenantId: membership.tenantId,
      });
      if (authorized.accountId !== actor.accountId ||
          authorized.tenantId !== membership.tenantId ||
          authorized.role !== membership.role) {
        return res.status(403).json({ message: "Business access denied." });
      }
      const user = await prisma.user.findUnique({
        where: { id: membership.retailUserId },
        select: { id: true, tenantId: true, role: true, email: true, name: true, phone: true, isActive: true },
      });
      if (!user || !user.isActive || user.tenantId !== membership.tenantId ||
          user.role !== membership.role ||
          user.email?.trim().toLowerCase() !== actor.email?.trim().toLowerCase()) {
        return res.status(403).json({ message: "Business access denied." });
      }
      const tokenId = randomUUID();
      const session = await prisma.userSession.create({
        data: {
          userId: user.id, tenantId: user.tenantId, tokenId,
          ipAddress: getClientIp(req) || null,
          userAgent: getUserAgent(req) || null,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
          isRevoked: false,
          lastSeenAt: new Date(),
        },
      });
      if (!session?.id || session.userId !== user.id || session.tenantId !== user.tenantId) {
        throw new Error("Workspace session could not be created");
      }
      let token;
      try { token = await signAuthToken({ user, tokenId }); }
      catch (error) {
        await prisma.userSession.updateMany({ where: { id: session.id }, data: { isRevoked: true } });
        throw error;
      }
      if (typeof token !== "string" || !token) {
        await prisma.userSession.updateMany({ where: { id: session.id }, data: { isRevoked: true } });
        throw new Error("Workspace token not issued");
      }
      return res.status(200).json({ token, user: {
        id: user.id, tenantId: user.tenantId, role: user.role,
        email: user.email, name: user.name, phone: user.phone,
      }});
    } catch {
      return res.status(503).json({ message: "Workspace access is temporarily unavailable." });
    }
  };
}
module.exports = { createAccountWorkspaceSessionHandler };
