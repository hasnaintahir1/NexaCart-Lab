Markdown
# Shopify Product Manager App with MongoDB Integration

## Overview
This application is a full-stack Shopify App built using Remix, Shopify Polaris, and MongoDB Atlas. It enables merchants to efficiently manage, search, and update their store products while maintaining an audit trail of all product modifications in a MongoDB database.

---

## Key Features
* **Product Manager Dashboard:** View and browse all store products with pagination and real-time title search filtering.
* **Product Details & Editing:** Update product attributes such as title, description, vendor, product type, and status directly via Shopify's Admin GraphQL API.
* **Database Logging:** Automatically record product update activities, tracking old and new values, in MongoDB Atlas.
* **Webhook Integration:** Listen to Shopify store events via webhooks to handle asynchronous updates.

---

## Tech Stack
* **Framework & UI:** Remix, React, Shopify Polaris
* **Database & ORM:** MongoDB Atlas, Mongoose
* **API:** Shopify GraphQL Admin API

---

## Database Schema
The Mongoose schema (`ProductActivity.model.js`) used for logging activities is defined as follows:

```javascript
import mongoose from "mongoose";

const productActivitySchema = new mongoose.Schema({
  shop: { type: String, required: true },
  productId: { type: String, required: true },
  action: { type: String, required: true },
  oldValue: { type: String },
  newValue: { type: String },
  timestamp: { type: Date, default: Date.now },
});

export const ProductActivity = mongoose.models.ProductActivity || mongoose.model("ProductActivity", productActivitySchema);
Shopify App Configuration
The app configuration and webhook subscriptions are managed through the shopify.app.toml file:

Ini, TOML
api_version = "2024-07"

[webhooks]
api_version = "2024-07"

[[webhooks.subscriptions]]
uri = "/webhooks/app/products-update"
topics = [ "products/update" ]
Setup and Installation Instructions
Follow these steps to run the project locally:

Clone the Repository:

Bash
git clone <your-repository-url>
cd <project-folder-name>
Install Dependencies:

Bash
npm install
Configure Environment Variables:
Create a .env file in the root directory based on the .env.example file and populate your credentials securely:

Code snippet
MONGO_URI=your_mongodb_atlas_connection_string

Run the Application:

Bash
shopify app dev
To reset and re-register webhooks with a fresh tunnel URL, use:

Bash
shopify app dev -- --reset
Webhook Testing Instructions
Install the application on your Shopify development store.

Modify a product either from the app dashboard or the native Shopify Admin panel.

Ensure the webhook payload is received at the /webhooks/app/products-update endpoint.

Verify that the activity log is successfully inserted into the respective collection in MongoDB Compass or Atlas.

**Architecture & Technical Decisions**
The application follows a modern server-rendered architecture using Remix, which integrates natively with Shopify's App Bridge and Polaris design system. GraphQL is utilized for interacting with Shopify's Admin API to ensure optimal data fetching and precise mutation execution. MongoDB Atlas is chosen for its scalability and ease of integration with Node.js via Mongoose for handling activity audit logs.

**Conclusion & Learning Experience**
Through the development of this project, I gained hands-on experience building production-ready Shopify applications. Working on this assignment allowed me to deeply understand Shopify Polaris for designing native-feeling merchant interfaces, master GraphQL queries and mutations for interacting with Shopify backend services, and implement webhook architecture to synchronize external databases like MongoDB with real-time store events.