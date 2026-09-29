import { connectDB } from "../db.mongoose";
import { ProductActivity } from "../models/ProductActivity.model";
import { useLoaderData, useSubmit, useNavigate, useActionData } from "react-router";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Select,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Banner,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.id}`;

  const response = await admin.graphql(
    `
    #graphql
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        title
        description
        productType
        vendor
        status
        variants(first: 1) {
          edges {
            node {
              price
              sku
              inventoryQuantity
            }
          }
        }
      }
    }
  `,
    {
      variables: { id: productId },
    }
  );

  const responseJson = await response.json();
  return { product: responseJson.data?.product };
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();

  const title = formData.get("title");
  const description = formData.get("description");
  const productType = formData.get("productType");
  const vendor = formData.get("vendor");
  const status = formData.get("status");

  // ✅ Validation: title khali nahi ho sakta
  if (!title || title.trim() === "") {
    return {
      success: false,
      errors: [{ field: ["title"], message: "Title cannot be empty." }],
    };
  }

  const productId = `gid://shopify/Product/${params.id}`;

  // 1. MongoDB log mein oldValue save karne ke liye pehle purana title query karein
  const oldProductRes = await admin.graphql(
    `#graphql
    query getOldProduct($id: ID!) {
      product(id: $id) {
        title
      }
    }`,
    { variables: { id: productId } }
  );
  const oldData = await oldProductRes.json();
  const oldTitle = oldData.data?.product?.title || "";

  // 2. Shopify par GraphQL update mutation chalayein
  const response = await admin.graphql(
    `
    #graphql
    mutation updateProduct($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          title
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
    {
      variables: {
        input: {
          id: productId,
          title,
          descriptionHtml: description,
          productType,
          vendor,
          status,
        },
      },
    }
  );

  const responseJson = await response.json();
  const isSuccess = !responseJson.data?.productUpdate?.userErrors?.length;

  // 3. Update success hone par activity ko MongoDB Atlas mein store karein
  if (isSuccess) {
    try {
      await connectDB();
      await ProductActivity.create({
        shop: session.shop,
        productId: productId,
        action: "UPDATE_PRODUCT",
        oldValue: `Title: ${oldTitle}`,
        newValue: `Title: ${title}`,
      });
      console.log("Product Activity logged to MongoDB Atlas!");
    } catch (dbErr) {
      console.error("MongoDB Logging Error:", dbErr);
    }
  }

  return {
    success: isSuccess,
    errors: responseJson.data?.productUpdate?.userErrors || [],
  };
};

export default function ProductDetail() {
  const { product } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigate = useNavigate();

  const [title, setTitle] = useState(product?.title || "");
  const [description, setDescription] = useState(product?.description || "");
  const [productType, setProductType] = useState(product?.productType || "");
  const [vendor, setVendor] = useState(product?.vendor || "");
  const [status, setStatus] = useState(product?.status || "ACTIVE");

  const handleSave = () => {
    submit(
      { title, description, productType, vendor, status },
      { method: "post" }
    );
  };

  if (!product) {
    return (
      <Page backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}>
        <Text>Product not found.</Text>
      </Page>
    );
  }

  const variant = product.variants?.edges[0]?.node;

  return (
    <Page
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      title={`Edit: ${product.title}`}
    >
      <Layout>
        {actionData?.success && (
          <Layout.Section>
            <Banner tone="success">
              <p>Product updated successfully in Shopify store & logged to DB!</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.success === false && actionData?.errors?.length > 0 && (
          <Layout.Section>
            <Banner tone="critical">
              <p>{actionData.errors[0].message}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <FormLayout>
                <TextField
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                  error={
                    actionData?.success === false &&
                    actionData?.errors?.[0]?.field?.includes("title")
                      ? "Title is required"
                      : undefined
                  }
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  multiline={4}
                  autoComplete="off"
                />
                <FormLayout.Group>
                  <TextField
                    label="Product Type"
                    value={productType}
                    onChange={setProductType}
                    autoComplete="off"
                  />
                  <TextField
                    label="Vendor"
                    value={vendor}
                    onChange={setVendor}
                    autoComplete="off"
                  />
                </FormLayout.Group>
                <Select
                  label="Status"
                  options={[
                    { label: "Active", value: "ACTIVE" },
                    { label: "Draft", value: "DRAFT" },
                    { label: "Archived", value: "ARCHIVED" },
                  ]}
                  onChange={setStatus}
                  value={status}
                />
                <Button variant="primary" onClick={handleSave}>
                  Save Changes
                </Button>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Inventory & Pricing
              </Text>
              <Text variant="bodyMd" as="p">
                <strong>Price:</strong> ${variant?.price || "0.00"}
              </Text>
              <Text variant="bodyMd" as="p">
                <strong>SKU:</strong> {variant?.sku || "N/A"}
              </Text>
              <Text variant="bodyMd" as="p">
                <strong>Inventory Stock:</strong> {variant?.inventoryQuantity ?? 0}
              </Text>
              <InlineStack gap="200" blockAlign="center">
                <Text variant="bodyMd" as="span"><strong>Status:</strong></Text>
                <Badge tone={status === "ACTIVE" ? "success" : "attention"}>
                  {status}
                </Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}