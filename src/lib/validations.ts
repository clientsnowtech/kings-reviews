import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name too short').max(80),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

export const reviewSchema = z.object({
  businessId: z.string().min(1),
  rating: z.coerce.number().int().min(1, 'Pick a rating').max(5),
  title: z.string().min(3, 'Title too short').max(120),
  body: z.string().min(10, 'Write at least 10 characters').max(3000),
})

// shared optional fields so register + edit stay in lock-step
const optionalYear = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().int().min(1800, 'Invalid year').max(2100, 'Invalid year').optional(),
)

const businessProfile = {
  categoryId: z.coerce.number().int().positive('Pick a category'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(6, 'Invalid phone').max(20),
  whatsapp: z.string().max(20).optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  tagline: z.string().max(120, 'Keep the tagline short').optional().or(z.literal('')),
  description: z.string().max(3000).optional().or(z.literal('')),
  foundedYear: optionalYear,
  instagram: z.string().max(200).optional().or(z.literal('')),
  facebook: z.string().max(200).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(2, 'City required').max(80),
  state: z.string().min(2, 'State required').max(80),
  pincode: z.string().max(10).optional().or(z.literal('')),
  mapUrl: z.string().max(1000).optional().or(z.literal('')),
} as const

export const businessSchema = z.object({
  name: z.string().min(2, 'Name too short').max(120),
  ...businessProfile,
})

export const businessEditSchema = z.object({
  id: z.string().min(1),
  ...businessProfile,
})

export const replySchema = z.object({
  reviewId: z.string().min(1),
  body: z.string().min(2, 'Reply too short').max(2000),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
export type BusinessInput = z.infer<typeof businessSchema>
