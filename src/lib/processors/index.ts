import {PaymentProcessor} from "./types";
import {StripeProcessor} from "./stripe";
import {DummyProcessor} from "./dummy";
import {BadRequestError} from "../errors";

export const getProcessor = (processorName: "stripe" | "dummy", userTier: "free" | "paid"): PaymentProcessor => {
  // Free tier is strictly gated to dummy processor
  if (userTier === "free" && processorName !== "dummy") {
    throw new BadRequestError("validation:bad_params", "Free tier users can only use the dummy processor.");
  }

  switch (processorName) {
    case "stripe":
      return new StripeProcessor();
    case "dummy":
      return new DummyProcessor();
    default:
      throw new BadRequestError("validation:bad_params", "Invalid processor.");
  }
};
