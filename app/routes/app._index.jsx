import { useLoaderData, useNavigate } from "react-router";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Text,
  Badge,
  TextField,
  BlockStack,
  InlineStack,
  EmptyState,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    #graphql
    query getProducts {
      products(first: 20) {
        edges {
          node {
            id
            title
            status
            vendor
            productType
            featuredImage {
              url
              altText
            }
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
      }
    }
  `);

  const responseJson = await response.json();
  return {
    products: responseJson.data?.products?.edges || [],
  };
};

export default function Index() {
  const { products } = useLoaderData();
  const navigate = useNavigate();
  const [queryValue, setQueryValue] = useState("");

  const handleSearchChange = useCallback((value) => setQueryValue(value), []);

  const filteredProducts = products.filter(({ node }) =>
    node.title.toLowerCase().includes(queryValue.toLowerCase())
  );

  return (
    <Page title="Product Manager Dashboard">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="400">
              <div style={{ padding: "16px" }}>
                <TextField
                  label="Search Products"
                  value={queryValue}
                  onChange={handleSearchChange}
                  placeholder="Filter by title..."
                  clearButton
                  onClearButtonClick={() => setQueryValue("")}
                  autoComplete="off"
                />
              </div>

              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={filteredProducts}
                emptyState={
                  <EmptyState heading="No products found" image="">
                    <p>Try changing your search filter.</p>
                  </EmptyState>
                }
                renderItem={(item) => {
                  const product = item.node;
                  const media = (
                    <Thumbnail
                      source={
                        product.featuredImage?.url ||
                        "https://burst.shopifycdn.com/photos/black-leather-shoes.jpg"
                      }
                      alt={product.featuredImage?.altText || product.title}
                    />
                  );
                  const variant = product.variants?.edges[0]?.node;
                  const rawId = product.id.split("/").pop();

                  return (
                    <ResourceItem
                      id={product.id}
                      media={media}
                      accessibilityLabel={`View details for ${product.title}`}
                      onClick={() => navigate(`/app/products/${rawId}`)}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {product.title}
                          </Text>
                          <Text variant="bodySm" as="p" tone="subdued">
                            SKU: {variant?.sku || "N/A"} | Vendor: {product.vendor || "N/A"}
                          </Text>
                        </BlockStack>
                        <InlineStack gap="300" blockAlign="center">
                          <Text variant="bodyMd" fontWeight="semibold" as="span">
                            ${variant?.price || "0.00"}
                          </Text>
                          <Badge tone={product.status === "ACTIVE" ? "success" : "attention"}>
                            {product.status}
                          </Badge>
                          <Text variant="bodySm" as="span" tone="subdued">
                            Stock: {variant?.inventoryQuantity ?? 0}
                          </Text>
                        </InlineStack>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}