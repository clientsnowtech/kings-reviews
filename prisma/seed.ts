import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string)
const db = new PrismaClient({ adapter })

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// deterministic PRNG so re-seeding is stable
let seed = 987654321
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
const pick = <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
const range = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))

// two-level taxonomy: parent Category → Sub-categories.
// businesses are stored against a sub-category (leaf).
const TAXONOMY: { name: string; icon: string; children: { name: string; icon: string }[] }[] = [
  {
    name: 'Food & Dining',
    icon: 'utensils',
    children: [
      { name: 'Restaurants', icon: 'utensils' },
      { name: 'Cafés & Bakeries', icon: 'coffee' },
      { name: 'Fast Food', icon: 'sandwich' },
      { name: 'Cloud Kitchen', icon: 'chef-hat' },
      { name: 'Sweets & Namkeen', icon: 'candy' },
      { name: 'Bars & Pubs', icon: 'beer' },
      { name: 'Catering Services', icon: 'utensils-crossed' },
    ],
  },
  {
    name: 'Hotels & Travel',
    icon: 'plane',
    children: [
      { name: 'Hotels & Stays', icon: 'bed-double' },
      { name: 'Resorts', icon: 'palmtree' },
      { name: 'Guest Houses', icon: 'house' },
      { name: 'Hostels & PGs', icon: 'backpack' },
      { name: 'Homestays', icon: 'home' },
      { name: 'Travel & Tourism', icon: 'plane' },
      { name: 'Tour Operators', icon: 'map' },
      { name: 'Travel Agents', icon: 'ticket' },
    ],
  },
  {
    name: 'Electronics & Appliances',
    icon: 'smartphone',
    children: [
      { name: 'Electronics', icon: 'smartphone' },
      { name: 'Mobile Phones', icon: 'smartphone' },
      { name: 'Computers & Laptops', icon: 'laptop' },
      { name: 'Mobile Repair', icon: 'wrench' },
      { name: 'Home Appliances', icon: 'refrigerator' },
      { name: 'AC Sales & Service', icon: 'air-vent' },
      { name: 'CCTV & Security', icon: 'cctv' },
    ],
  },
  {
    name: 'Home & Repairs',
    icon: 'wrench',
    children: [
      { name: 'Home Services', icon: 'wrench' },
      { name: 'Plumbing', icon: 'droplet' },
      { name: 'Electricians', icon: 'zap' },
      { name: 'Carpenters', icon: 'hammer' },
      { name: 'Painters', icon: 'paintbrush' },
      { name: 'Pest Control', icon: 'bug' },
      { name: 'Home Cleaning', icon: 'sparkles' },
      { name: 'Interior Design', icon: 'sofa' },
      { name: 'Packers & Movers', icon: 'truck' },
    ],
  },
  {
    name: 'Health & Wellness',
    icon: 'stethoscope',
    children: [
      { name: 'Health & Clinics', icon: 'stethoscope' },
      { name: 'Hospitals', icon: 'building' },
      { name: 'Dentists', icon: 'smile' },
      { name: 'Diagnostic Labs', icon: 'microscope' },
      { name: 'Pharmacies', icon: 'pill' },
      { name: 'Eye Care', icon: 'eye' },
      { name: 'Physiotherapy', icon: 'activity' },
      { name: 'Ayurveda', icon: 'leaf' },
      { name: 'Gyms & Fitness', icon: 'dumbbell' },
      { name: 'Yoga Centres', icon: 'heart' },
    ],
  },
  {
    name: 'Beauty & Personal Care',
    icon: 'scissors',
    children: [
      { name: 'Beauty & Salon', icon: 'scissors' },
      { name: 'Spa', icon: 'flower' },
      { name: 'Barber Shops', icon: 'scissors' },
      { name: 'Nail Studios', icon: 'hand' },
      { name: 'Makeup Artists', icon: 'brush' },
      { name: 'Tattoo Studios', icon: 'pen-tool' },
    ],
  },
  {
    name: 'Education & Training',
    icon: 'graduation-cap',
    children: [
      { name: 'Education', icon: 'graduation-cap' },
      { name: 'Coaching Classes', icon: 'book-open' },
      { name: 'Schools', icon: 'school' },
      { name: 'Colleges', icon: 'building' },
      { name: 'Play Schools', icon: 'baby' },
      { name: 'Computer Training', icon: 'monitor' },
      { name: 'Language Classes', icon: 'languages' },
      { name: 'Music & Dance', icon: 'music' },
      { name: 'Driving Schools', icon: 'steering-wheel' },
    ],
  },
  {
    name: 'Automotive & Transport',
    icon: 'car',
    children: [
      { name: 'Automotive', icon: 'car' },
      { name: 'Car Dealers', icon: 'car-front' },
      { name: 'Car Rentals', icon: 'car-front' },
      { name: 'Bike Service', icon: 'bike' },
      { name: 'Car Wash', icon: 'droplets' },
      { name: 'Spare Parts', icon: 'cog' },
      { name: 'Taxi Services', icon: 'car-taxi-front' },
    ],
  },
  {
    name: 'Property & Finance',
    icon: 'building-2',
    children: [
      { name: 'Real Estate', icon: 'building-2' },
      { name: 'Finance & Insurance', icon: 'landmark' },
      { name: 'Property Agents', icon: 'key' },
      { name: 'Banks & ATMs', icon: 'landmark' },
      { name: 'Loan Services', icon: 'banknote' },
      { name: 'Chartered Accountants', icon: 'calculator' },
      { name: 'Investment Advisors', icon: 'trending-up' },
    ],
  },
  {
    name: 'Legal & Professional',
    icon: 'scale',
    children: [
      { name: 'Lawyers', icon: 'scale' },
      { name: 'Notary Services', icon: 'stamp' },
      { name: 'Business Consultants', icon: 'briefcase' },
      { name: 'Recruitment Agencies', icon: 'users' },
      { name: 'Accounting Services', icon: 'calculator' },
    ],
  },
  {
    name: 'Retail & Shopping',
    icon: 'shopping-bag',
    children: [
      { name: 'Shopping & Retail', icon: 'shopping-bag' },
      { name: 'Fashion & Apparel', icon: 'shirt' },
      { name: 'Footwear', icon: 'footprints' },
      { name: 'Jewellery', icon: 'gem' },
      { name: 'Furniture', icon: 'sofa' },
      { name: 'Grocery Stores', icon: 'shopping-cart' },
      { name: 'Books & Stationery', icon: 'book' },
      { name: 'Gifts & Toys', icon: 'gift' },
      { name: 'Opticals', icon: 'glasses' },
      { name: 'Hardware Stores', icon: 'wrench' },
    ],
  },
  {
    name: 'Events & Entertainment',
    icon: 'party-popper',
    children: [
      { name: 'Event Management', icon: 'party-popper' },
      { name: 'Wedding Planners', icon: 'heart' },
      { name: 'Photographers', icon: 'camera' },
      { name: 'Banquet Halls', icon: 'building' },
      { name: 'DJ & Music', icon: 'music' },
      { name: 'Decorators', icon: 'sparkles' },
      { name: 'Gaming Zones', icon: 'gamepad-2' },
    ],
  },
  {
    name: 'Professional Services',
    icon: 'briefcase',
    children: [
      { name: 'Digital Marketing', icon: 'megaphone' },
      { name: 'Web Design', icon: 'code' },
      { name: 'Printing & Signage', icon: 'printer' },
      { name: 'Advertising', icon: 'megaphone' },
      { name: 'Courier Services', icon: 'package' },
      { name: 'Security Services', icon: 'shield' },
    ],
  },
  {
    name: 'Agriculture & Industrial',
    icon: 'sprout',
    children: [
      { name: 'Agriculture Supplies', icon: 'sprout' },
      { name: 'Nurseries & Plants', icon: 'flower-2' },
      { name: 'Manufacturing', icon: 'factory' },
      { name: 'Machinery', icon: 'cog' },
      { name: 'Wholesale & Distribution', icon: 'boxes' },
    ],
  },
  {
    name: 'Pets & Animals',
    icon: 'paw-print',
    children: [
      { name: 'Pet Shops', icon: 'paw-print' },
      { name: 'Veterinary', icon: 'stethoscope' },
      { name: 'Pet Grooming', icon: 'scissors' },
      { name: 'Pet Boarding', icon: 'home' },
    ],
  },
]

const CITIES: { city: string; state: string; pin: string }[] = [
  { city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
  { city: 'Delhi', state: 'Delhi', pin: '110001' },
  { city: 'Bengaluru', state: 'Karnataka', pin: '560001' },
  { city: 'Hyderabad', state: 'Telangana', pin: '500001' },
  { city: 'Ahmedabad', state: 'Gujarat', pin: '380001' },
  { city: 'Chennai', state: 'Tamil Nadu', pin: '600001' },
  { city: 'Kolkata', state: 'West Bengal', pin: '700001' },
  { city: 'Pune', state: 'Maharashtra', pin: '411001' },
  { city: 'Jaipur', state: 'Rajasthan', pin: '302001' },
  { city: 'Surat', state: 'Gujarat', pin: '395001' },
  { city: 'Lucknow', state: 'Uttar Pradesh', pin: '226001' },
  { city: 'Indore', state: 'Madhya Pradesh', pin: '452001' },
  { city: 'Chandigarh', state: 'Punjab', pin: '160001' },
  { city: 'Kochi', state: 'Kerala', pin: '682001' },
  { city: 'Goa', state: 'Goa', pin: '403001' },
]

// name building blocks per category: [prefixes], [suffixes]
const NAMES: Record<string, { pre: string[]; suf: string[]; desc: string[] }> = {
  Restaurants: {
    pre: ['Spice', 'Coastal', 'Royal', 'Green Leaf', 'Tandoori', 'Urban', 'Bombay', 'Punjabi', 'Saffron', 'Curry'],
    suf: ['Villa', 'Kitchen', 'House', 'Bistro', 'Darbar', 'Table', 'Grill', 'Dhaba'],
    desc: ['Authentic Indian and Mughlai cuisine with warm ambience.', 'Fresh seasonal dishes and quick friendly service.', 'Multi-cuisine dining loved by families and food lovers.'],
  },
  'Hotels & Stays': {
    pre: ['Grand', 'Sunrise', 'Royal', 'Palm', 'Lake', 'Heritage', 'Comfort', 'Blue', 'Golden', 'City'],
    suf: ['Palace', 'Residency', 'Inn', 'Suites', 'Retreat', 'Hotel', 'Stays', 'Grand'],
    desc: ['Comfortable rooms, rooftop dining and city views.', 'Boutique stay with modern amenities and warm hospitality.', 'Value-for-money business hotel near the city centre.'],
  },
  Electronics: {
    pre: ['Tech', 'Gadget', 'Digital', 'Smart', 'Power', 'Nova', 'Prime', 'Volt', 'Circuit', 'Byte'],
    suf: ['Zone', 'Hub', 'World', 'Store', 'Point', 'Mart', 'Bazaar', 'Electronics'],
    desc: ['Mobiles, laptops and accessories with genuine warranty.', 'Latest gadgets at competitive prices with after-sales support.', 'Trusted electronics retailer with quick service.'],
  },
  'Home Services': {
    pre: ['QuickFix', 'PureFlow', 'HandyPro', 'BrightHome', 'Sparkle', 'Reliable', 'FixIt', 'HomeCare', 'Rapid', 'Trusty'],
    suf: ['Plumbers', 'Services', 'Solutions', 'Cleaners', 'Repairs', 'Experts', 'Care', 'Works'],
    desc: ['24x7 home repair and maintenance across the city.', 'Skilled technicians for plumbing, electrical and more.', 'Reliable doorstep home services with fair pricing.'],
  },
  'Health & Clinics': {
    pre: ['CityCare', 'Smile', 'LifeLine', 'Wellness', 'Apollo', 'HealWell', 'Prime', 'Care', 'Family', 'Sunrise'],
    suf: ['Clinic', 'Dental Care', 'Hospital', 'Diagnostics', 'Care', 'Health', 'Medicare', 'Polyclinic'],
    desc: ['Multi-speciality clinic with experienced physicians.', 'Modern facility with painless treatments and caring staff.', 'Trusted healthcare with same-day appointments.'],
  },
  Education: {
    pre: ['BrightMinds', 'FutureScholars', 'Genius', 'Achievers', 'Vidya', 'Elite', 'NextGen', 'Scholars', 'Pinnacle', 'Success'],
    suf: ['Academy', 'Institute', 'Classes', 'Coaching', 'Tutorials', 'Learning', 'School', 'Gurukul'],
    desc: ['Coaching for competitive exams and school tuition.', 'Result-oriented teaching with expert faculty.', 'Personalised learning for every student.'],
  },
  'Beauty & Salon': {
    pre: ['Glow', 'Urban Trends', 'Blush', 'Elegance', 'Style', 'Mirror', 'Radiance', 'Charm', 'Bloom', 'Luxe'],
    suf: ['Beauty Studio', 'Salon', 'Spa', 'Makeovers', 'Unisex Salon', 'Studio', 'Beauty Bar', 'Lounge'],
    desc: ['Unisex salon offering hair, skin and bridal packages.', 'Premium hair and skincare with expert stylists.', 'Relaxing spa and beauty treatments.'],
  },
  Automotive: {
    pre: ['DriveWell', 'SpeedZone', 'AutoCare', 'ProMotors', 'TurboFix', 'Gear', 'Highway', 'Prime', 'Shine', 'Torque'],
    suf: ['Motors', 'Car Care', 'Service Centre', 'Garage', 'Auto Works', 'Detailing', 'Wheels', 'Automobiles'],
    desc: ['Car service, repairs and genuine spare parts.', 'Detailing, wash and quick service centre.', 'Trusted multi-brand car workshop.'],
  },
  'Real Estate': {
    pre: ['HomeNest', 'Skyline', 'Prime', 'Urban', 'Dream', 'Landmark', 'Elite', 'GreenField', 'Metro', 'Crown'],
    suf: ['Realtors', 'Properties', 'Estates', 'Developers', 'Housing', 'Realty', 'Homes', 'Builders'],
    desc: ['Buy, sell and rent verified properties.', 'End-to-end property advisory and site visits.', 'Trusted real estate with RERA-registered projects.'],
  },
  'Finance & Insurance': {
    pre: ['SecureLife', 'MoneyWise', 'TrustFund', 'SafeGuard', 'Prime', 'Capital', 'AssureX', 'Wealth', 'Shield', 'Nova'],
    suf: ['Insurance Advisors', 'Financial Services', 'Wealth', 'Advisors', 'Capital', 'Finserv', 'Investments', 'Insurance'],
    desc: ['Health, term and vehicle insurance advisory.', 'Loans, investments and tax planning support.', 'Personalised financial planning for families.'],
  },
  'Travel & Tourism': {
    pre: ['Himalayan Trails', 'Wanderlust', 'Blue Horizon', 'Voyage', 'GlobeTrek', 'Sunny', 'Discover', 'Escape', 'Journey', 'Coastal'],
    suf: ['Travel', 'Tours', 'Holidays', 'Getaways', 'Expeditions', 'Trips', 'Voyages', 'Travels'],
    desc: ['Curated treks and holiday packages.', 'Customised domestic and international tours.', 'Hassle-free bookings with 24x7 support.'],
  },
  'Shopping & Retail': {
    pre: ['DailyMart', 'ShopEase', 'MegaMart', 'FreshPick', 'Value', 'Trendy', 'BigBasket', 'Style', 'Everyday', 'Prime'],
    suf: ['Supermarket', 'Store', 'Bazaar', 'Mart', 'Retail', 'Emporium', 'Outlet', 'Shopping'],
    desc: ['Groceries and household essentials at great prices.', 'Wide range of products with everyday low prices.', 'One-stop shop for the whole family.'],
  },
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  const owner = await db.user.upsert({
    where: { email: 'owner@kingsreviews.com' },
    update: {},
    create: { name: 'Demo Owner', email: 'owner@kingsreviews.com', password: passwordHash, role: 'BUSINESS', emailVerified: new Date() },
  })

  await db.user.upsert({
    where: { email: 'admin@kingsreviews.com' },
    update: { role: 'ADMIN' },
    create: { name: 'Admin', email: 'admin@kingsreviews.com', password: passwordHash, role: 'ADMIN', emailVerified: new Date() },
  })

  // categories — flat now; the demo taxonomy's groupings survive only as names
  const catMap = new Map<string, number>()
  for (let i = 0; i < TAXONOMY.length; i++) {
    const parent = TAXONOMY[i]
    await db.category.upsert({
      where: { slug: slugify(parent.name) },
      update: { icon: parent.icon, sort: i },
      create: { name: parent.name, slug: slugify(parent.name), icon: parent.icon, sort: i },
    })
    for (let j = 0; j < parent.children.length; j++) {
      const child = parent.children[j]
      const childRow = await db.category.upsert({
        where: { slug: slugify(child.name) },
        update: { icon: child.icon, sort: j },
        create: { name: child.name, slug: slugify(child.name), icon: child.icon, sort: j },
      })
      catMap.set(child.name, childRow.id)
    }
  }

  // leaf categories that have name generators (used to spread demo businesses)
  const LEAF_NAMES = Object.keys(NAMES)

  // generate 100 unique businesses spread across categories
  const TARGET = 100
  const usedSlugs = new Set<string>()
  const businesses: { name: string; cat: string; loc: typeof CITIES[number]; desc: string }[] = []
  let guard = 0
  while (businesses.length < TARGET && guard < 5000) {
    guard++
    const cat = LEAF_NAMES[businesses.length % LEAF_NAMES.length]
    const n = NAMES[cat]
    const loc = pick(CITIES)
    let name = `${pick(n.pre)} ${pick(n.suf)}`
    let slug = slugify(name)
    if (usedSlugs.has(slug)) {
      name = `${name} ${loc.city}`
      slug = slugify(name)
    }
    if (usedSlugs.has(slug)) continue
    usedSlugs.add(slug)
    businesses.push({ name, cat, loc, desc: pick(n.desc) })
  }

  for (const b of businesses) {
    const slug = slugify(b.name)
    const logo = `https://picsum.photos/seed/${slug}/240/240`
    const cover = `https://picsum.photos/seed/${slug}-cover/1200/400`
    await db.business.upsert({
      where: { slug },
      update: { logo, cover, categoryId: catMap.get(b.cat)! },
      create: {
        ownerId: owner.id,
        categoryId: catMap.get(b.cat)!,
        slug,
        name: b.name,
        email: `contact@${slug}.in`,
        phone: `+91 9${range(100000000, 899999999)}`,
        website: `https://${slug}.in`,
        description: b.desc,
        logo,
        cover,
        address: `${range(1, 200)}, Main Market Road`,
        city: b.loc.city,
        state: b.loc.state,
        pincode: b.loc.pin,
        status: 'LIVE',
        verifiedAt: new Date(),
      },
    })
  }

  // demo reviewers — larger pool so businesses get varied reviews
  const FIRST = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Kabir', 'Ishita', 'Vivaan', 'Sara', 'Arjun', 'Meera', 'Aditya', 'Priya', 'Karan', 'Nisha', 'Rahul', 'Pooja', 'Siddharth', 'Neha', 'Aryan', 'Tanvi', 'Dev', 'Riya', 'Manav', 'Sneha', 'Yash', 'Kavya', 'Nikhil', 'Aisha', 'Varun', 'Simran']
  const LAST = ['Sharma', 'Patel', 'Mehta', 'Iyer', 'Singh', 'Rao', 'Nair', 'Khan', 'Verma', 'Gupta', 'Reddy', 'Joshi', 'Desai', 'Kapoor', 'Malhotra']
  const reviewerIds: string[] = []
  const seenEmail = new Set<string>()
  for (let i = 0; i < 40; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`
    let email = `${slugify(name)}@example.in`
    if (seenEmail.has(email)) email = `${slugify(name)}-${i}@example.in`
    seenEmail.add(email)
    const u = await db.user.upsert({
      where: { email },
      update: {},
      create: { name, email, password: passwordHash, role: 'USER', emailVerified: new Date() },
    })
    reviewerIds.push(u.id)
  }

  const TITLES = ['Excellent service', 'Highly recommended', 'Good experience', 'Value for money', 'Could be better', 'Loved it', 'Fantastic!', 'Will come again', 'Truly professional', 'Average experience']
  const BODIES = [
    'Really impressed with the quality and staff behaviour. Will visit again.',
    'Smooth experience from start to finish. Fair pricing and quick service.',
    'Decent overall, though there is some room for improvement in wait times.',
    'Professional and courteous team. Delivered exactly what was promised.',
    'Great value and friendly people. One of the better options in the city.',
    'Booking was easy and the experience exceeded my expectations.',
    'Good service but a little pricey compared to others nearby.',
    'Staff went out of their way to help. Highly satisfied with the outcome.',
  ]

  const allBiz = await db.business.findMany({ select: { id: true } })
  for (const biz of allBiz) {
    // 5-15 reviews each, unique reviewers (shuffle a slice)
    const count = range(5, 15)
    const pool = [...reviewerIds]
    // Fisher-Yates with deterministic rnd
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const chosen = pool.slice(0, Math.min(count, pool.length))
    for (const uid of chosen) {
      // weighted toward 4-5 stars
      const roll = rnd()
      const rating = roll < 0.55 ? 5 : roll < 0.8 ? 4 : roll < 0.92 ? 3 : roll < 0.97 ? 2 : 1
      await db.review.upsert({
        where: { businessId_userId: { businessId: biz.id, userId: uid } },
        update: {},
        create: {
          businessId: biz.id,
          userId: uid,
          rating,
          title: pick(TITLES),
          body: pick(BODIES),
          helpfulCount: range(0, 24),
        },
      })
    }

    const rows = await db.review.groupBy({
      by: ['rating'],
      where: { businessId: biz.id, status: 'LIVE' },
      _count: { rating: true },
    })
    const hist = [0, 0, 0, 0, 0]
    let total = 0, sum = 0
    for (const r of rows) { hist[r.rating - 1] = r._count.rating; total += r._count.rating; sum += r.rating * r._count.rating }
    await db.business.update({
      where: { id: biz.id },
      data: {
        ratingCount: total,
        ratingAvg: total ? Number((sum / total).toFixed(2)) : 0,
        rating1: hist[0], rating2: hist[1], rating3: hist[2], rating4: hist[3], rating5: hist[4],
      },
    })
  }

  for (const [name, id] of catMap) {
    const count = await db.business.count({ where: { categoryId: id, status: 'LIVE' } })
    await db.category.update({ where: { id }, data: { listingCount: count } })
    void name
  }

  const catTotal = await db.category.count()
  const bizTotal = await db.business.count()
  const reviewTotal = await db.review.count()
  console.log(`Seeded ${catTotal} categories, ${bizTotal} businesses, ${reviewTotal} reviews.`)
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
