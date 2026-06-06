function wait(ms = 700) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginStoreOwner(payload) {
  await wait();
  return {
    ok: true,
    message: "Login successful",
    token: "placeholder-platform-token",
    user: {
      name: payload.email?.split("@")[0] || "Store Owner",
      email: payload.email,
    },
  };
}

export async function registerStoreOwner(payload) {
  await wait();
  return {
    ok: true,
    message: "Registration submitted",
    nextRoute: "/verify-otp",
    email: payload.email,
  };
}

export async function verifyStoreOtp(payload) {
  await wait();
  return {
    ok: true,
    message: "OTP verified",
    nextRoute: "/confirm-signup",
    otp: payload.otp,
  };
}

export async function confirmStoreSignup() {
  await wait();
  return {
    ok: true,
    message: "Signup confirmed",
    nextRoute: "/owner-payment",
  };
}

export async function submitOwnerPayment(payload) {
  await wait();
  return {
    ok: true,
    message: "Payment recorded",
    nextRoute: "/dashboard",
    reference: payload.reference || "PAY-PLACEHOLDER-001",
  };
}