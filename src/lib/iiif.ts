// Minimal IIIF Presentation API client supporting both v2 and v3 manifests.

export interface IiifPage {
  label: string;
  thumbUrl: string;
  viewUrl: string;
  fullUrl: string;
}

export interface IiifManifest {
  label: string;
  attribution: string;
  pages: IiifPage[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function firstLabelValue(label: any): string {
  if (label == null) return "";
  if (typeof label === "string") return label;
  if (Array.isArray(label)) return firstLabelValue(label[0]);
  if (typeof label === "object") {
    const vals = Object.values(label)[0];
    return firstLabelValue(vals);
  }
  return String(label);
}

function serviceUrls(serviceId: string) {
  const base = serviceId.replace(/\/$/, "");
  return {
    thumbUrl: `${base}/full/!300,300/0/default.jpg`,
    viewUrl: `${base}/full/!1400,1400/0/default.jpg`,
    fullUrl: `${base}/full/full/0/default.jpg`,
  };
}

function parseV3(m: any): IiifManifest {
  const pages: IiifPage[] = [];
  for (const canvas of m.items ?? []) {
    if (canvas.type !== "Canvas") continue;
    const body = canvas.items?.[0]?.items?.[0]?.body;
    const b = Array.isArray(body) ? body[0] : body;
    const service = b?.service?.[0];
    const serviceId = service?.["@id"] ?? service?.id;
    if (!serviceId) continue;
    pages.push({
      label: firstLabelValue(canvas.label) || `Page ${pages.length + 1}`,
      ...serviceUrls(serviceId),
    });
  }
  return {
    label: firstLabelValue(m.label),
    attribution: firstLabelValue(m.requiredStatement?.value) || "",
    pages,
  };
}

function parseV2(m: any): IiifManifest {
  const pages: IiifPage[] = [];
  const canvases = m.sequences?.[0]?.canvases ?? [];
  for (const canvas of canvases) {
    const service = canvas.images?.[0]?.resource?.service;
    const serviceId = service?.["@id"] ?? service?.id;
    if (!serviceId) continue;
    pages.push({
      label: firstLabelValue(canvas.label) || `Page ${pages.length + 1}`,
      ...serviceUrls(serviceId),
    });
  }
  return {
    label: firstLabelValue(m.label),
    attribution: firstLabelValue(m.attribution) || "",
    pages,
  };
}

export async function fetchManifest(url: string): Promise<IiifManifest> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching manifest`);
  const m = await res.json();
  const ctx = JSON.stringify(m["@context"] ?? "");
  const manifest =
    ctx.includes("presentation/3") || m.type === "Manifest" ? parseV3(m) : parseV2(m);
  if (manifest.pages.length === 0) {
    throw new Error("Manifest parsed but no image canvases were found.");
  }
  return manifest;
}
