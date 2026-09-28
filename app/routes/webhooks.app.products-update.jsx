import { authenticate } from "../shopify.server";
import { connectDB } from "../db.mongoose";
import ProductActivity from "../models/ProductActivity.model";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Webhook Received: ${topic} for shop: ${shop}`);

  if (topic === "PRODUCTS_UPDATE") {
    try {
      await connectDB();

      const productId = `gid://shopify/Product/${payload.id}`;
      const updatedTitle = payload.title;

      await ProductActivity.create({
        shop: shop,
        productId: productId,
        action: "WEBHOOK_PRODUCT_UPDATE",
        oldValue: "Updated via Shopify Admin / Webhook",
        newValue: `Title: ${updatedTitle}`,
      });

      console.log("Webhook activity logged to MongoDB successfully!");
    } catch (error) {
      console.error("Webhook DB Error:", error);
    }
  }

  return new Response("Webhook Processed", { status: 200 });
};