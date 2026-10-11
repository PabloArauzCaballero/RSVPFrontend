export function eventJsonLd(input: { name: string; startDate: string; location: string; url: string }) {
  return { "@context": "https://schema.org", "@type": "Event", name: input.name, startDate: input.startDate, location: { "@type": "Place", name: input.location }, url: input.url };
}

export function localBusinessJsonLd(input: { name: string; url: string; category: string }) {
  return { "@context": "https://schema.org", "@type": "LocalBusiness", name: input.name, url: input.url, category: input.category };
}
