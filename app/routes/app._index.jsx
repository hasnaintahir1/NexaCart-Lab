// eslint-disable-next-line no-unused-vars
import { useLoaderData, useNavigate, useSearchParams, useSubmit } from "react-router";
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
  Pagination,
} from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";
  const searchTerm = url.searchParams.get("q") || "";

  const paginationArgs =
    direction === "prev"
      ? `last: 10, before: "${cursor}"`
      : cursor
      ? `first: 10, after: "${cursor}"`
      : `first: 10`;

  const searchFilter = searchTerm ? `, query: "title:*${searchTerm}*"` : "";

  const response = await admin.graphql(`
    #graphql
    query getProducts {
      products(${paginationArgs}${searchFilter}) {
        edges {
          cursor
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
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `);

  const responseJson = await response.json();
  return {
    products: responseJson.data?.products?.edges || [],
    pageInfo: responseJson.data?.products?.pageInfo || {},
    searchTerm,
  };
};

export default function Index() {
  const { products, pageInfo, searchTerm } = useLoaderData();
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryValue, setQueryValue] = useState(searchTerm || "");

  const handleSearchChange = useCallback((value) => setQueryValue(value), []);

  // Debounce effect: Jaise hi user type karega, 400ms baad khud hi URL update ho jayega
  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryValue !== searchTerm) {
        setSearchParams(queryValue ? { q: queryValue } : {});
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [queryValue, searchTerm, setSearchParams]);

  const goNext = () => {
    const lastCursor = products[products.length - 1]?.cursor;
    setSearchParams({ cursor: lastCursor, direction: "next", q: queryValue });
  };

  const goPrev = () => {
    const firstCursor = products[0]?.cursor;
    setSearchParams({ cursor: firstCursor, direction: "prev", q: queryValue });
  };

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
                  onClearButtonClick={() => {
                    setQueryValue("");
                    setSearchParams({});
                  }}
                  autoComplete="off"
                />
              </div>

              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={products}
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

              <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
                <Pagination
                  hasPrevious={pageInfo.hasPreviousPage}
                  onPrevious={goPrev}
                  hasNext={pageInfo.hasNextPage}
                  onNext={goNext}
                />
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}