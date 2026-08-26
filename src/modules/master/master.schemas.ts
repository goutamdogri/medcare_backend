import { z } from 'zod';

export const masterSkuSchema = z.object({
  id: z.number().int(),
  skuId: z.string(),
  brandName: z.string(),
  atcCode: z.string(),
  manufacturer: z.string(),
  regulatoryClass: z.string(),
  hsnCode: z.string().nullable(),
  nlemListed: z.boolean(),
  criticality: z.string(),
  criticalityRationale: z.string().nullable(),
  criticalityReviewedOn: z.string().nullable(),
  criticalityReviewedBy: z.string().nullable(),
  unitCostInr: z.number().int(),
  shelfLifeDays: z.number().int(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export const masterLocationSchema = z.object({
  id: z.number().int(),
  locationId: z.string(),
  name: z.string(),
  type: z.string(),
  capacityUnits: z.number().int(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  pincode: z.string().nullable(),
  gstin: z.string().nullable(),
  commissionedOn: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export const masterLaneSchema = z.object({
  id: z.number().int(),
  fromLocation: z.string(),
  toLocation: z.string(),
  mode: z.string(),
  leadTimeDays: z.number().int(),
  carrier: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
});

export type MasterSku = z.infer<typeof masterSkuSchema>;
export type MasterLocation = z.infer<typeof masterLocationSchema>;
export type MasterLane = z.infer<typeof masterLaneSchema>;
