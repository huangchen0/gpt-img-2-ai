import Script from 'next/script';

interface ComparisonItem {
  name: string;
  description: string;
  image?: string;
  url?: string;
  rating?: {
    value: number;
    bestRating: number;
  };
}

interface ComparisonTableSchemaProps {
  items: ComparisonItem[];
  title?: string;
}

export function ComparisonTableSchema({
  items,
  title = 'Product Comparison',
}: ComparisonTableSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: item.name,
        description: item.description,
        ...(item.image && { image: item.image }),
        ...(item.url && { url: item.url }),
        ...(item.rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: item.rating.value,
            bestRating: item.rating.bestRating,
          },
        }),
      },
    })),
  };

  return (
    <Script
      id="comparison-table-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
