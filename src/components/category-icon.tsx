import {
  Utensils, Coffee, CakeSlice, Beer, Pizza, BedDouble, Smartphone, Wrench,
  Stethoscope, HeartPulse, Pill, GraduationCap, Scissors, Car, Building2,
  Landmark, PiggyBank, Plane, BusFront, ShoppingBag, ShoppingCart, Store,
  Dumbbell, Scale, Home, Camera, Printer, Megaphone, Laptop, Church, PawPrint,
  Sprout, Shield, Palette, Fuel, Shirt, Truck, Music, Film, BookOpen, Gem,
  Sofa, HardHat, Factory, Martini, Trees, Baby, Hammer, Paintbrush, Bike,
  Anchor, Fish, Wheat, Wine, Glasses, Watch, Key, Flower2, Cross, Syringe,
  type LucideProps,
} from 'lucide-react'

/**
 * Google's category list runs to ~4,000 names and none of them carry an icon,
 * so rather than hand-tagging each one we match on the words the names are
 * built from. Order matters — the first hit wins, so the specific words sit
 * ahead of the generic ones ("dental" before "clinic", "pizza" before "food").
 */
const KEYWORDS: [RegExp, React.ComponentType<LucideProps>][] = [
  [/\b(seo|marketing|advertis\w*|branding|media agency)\b/i, Megaphone],
  [/\b(software|web|it|computer|app|internet|tech|digital)\b/i, Laptop],
  [/\b(print\w*|photocopy|xerox|signage|typesetting)\b/i, Printer],
  [/\bpizza\b/i, Pizza],
  [/\b(bakery|cake|patisserie|confection\w*|dessert|sweet)\b/i, CakeSlice],
  [/\b(cafe|coffee|tea|chai)\b/i, Coffee],
  [/\b(bar|pub|brewery|liquor|beer)\b/i, Beer],
  [/\b(wine|winery|vineyard)\b/i, Wine],
  [/\b(night ?club|disco|lounge|cocktail)\b/i, Martini],
  [/\b(restaurant|food|dhaba|caterer|catering|canteen|kitchen|takeaway|deli)\b/i, Utensils],
  [/\b(fish|seafood|aquarium)\b/i, Fish],
  [/\b(farm|agri\w*|crop|grain|seed|fertilizer|dairy)\b/i, Wheat],
  [/\b(nursery|garden|landscap\w*|florist|flower)\b/i, Flower2],
  [/\b(park|forest|zoo|wildlife|botanic)\b/i, Trees],
  [/\b(hotel|resort|lodge|motel|hostel|guest house|accommodation|apartment)\b/i, BedDouble],
  [/\b(dentist|dental|orthodont\w*)\b/i, Cross],
  [/\b(pharmac\w*|chemist|drug)\b/i, Pill],
  [/\b(hospital|clinic|doctor|physician|surgeon|medical|diagnostic\w*|patholog\w*)\b/i, Stethoscope],
  [/\b(veterinar\w*|vet|pet|animal|dog|cat)\b/i, PawPrint],
  [/\b(blood|vaccin\w*|injection)\b/i, Syringe],
  [/\b(therapy|physio\w*|wellness|rehab|nursing|hospice)\b/i, HeartPulse],
  [/\b(school|college|university|institute|academy|tutor|coaching|education|training|library)\b/i, GraduationCap],
  [/\b(book|stationer\w*|publish\w*)\b/i, BookOpen],
  [/\b(salon|barber|beauty|spa|nail|hair|makeup|waxing)\b/i, Scissors],
  [/\b(gym|fitness|yoga|pilates|martial|swimming)\b/i, Dumbbell],
  [/\b(baby|child|kindergarten|daycare|maternity|toy)\b/i, Baby],
  [/\b(car|auto|vehicle|motor|dealer|garage|tyre|tire)\b/i, Car],
  [/\b(bike|bicycle|motorcycle|scooter)\b/i, Bike],
  [/\b(bus|taxi|cab|transport|rental)\b/i, BusFront],
  [/\b(courier|logistic|freight|moving|packer|shipping|warehouse)\b/i, Truck],
  [/\b(boat|marine|port|harbour|harbor|yacht|ship)\b/i, Anchor],
  [/\b(airline|airport|flight|travel|tour|holiday|visa)\b/i, Plane],
  [/\b(petrol|fuel|gas station|cng|lpg|filling)\b/i, Fuel],
  [/\b(bank|atm|finance|loan|credit|invest|insurance|accountant|tax|audit)\b/i, PiggyBank],
  [/\b(lawyer|legal|advocate|attorney|notary|court|justice)\b/i, Scale],
  [/\b(police|fire|security|guard|defence|defense|army)\b/i, Shield],
  [/\b(government|municipal|embassy|consulate|passport|registrar|council)\b/i, Landmark],
  [/\b(real estate|property|estate agent|builder|housing)\b/i, Home],
  [/\b(construction|contractor|cement|concrete|scaffold|demolition|roofing|excavat\w*)\b/i, HardHat],
  [/\b(carpenter|welder|blacksmith|tool|hardware)\b/i, Hammer],
  [/\b(locksmith|key)\b/i, Key],
  [/\b(paint|wallpaper|interior|decorat\w*)\b/i, Paintbrush],
  [/\b(furniture|sofa|mattress|upholster\w*)\b/i, Sofa],
  [/\b(factory|manufactur\w*|industrial|foundry|mill|refinery|plant)\b/i, Factory],
  [/\b(plumb\w*|electric|repair|service|mechanic|maintenance|installer|technician)\b/i, Wrench],
  [/\b(photo|studio|videograph\w*|film|cinema|movie|theater|theatre)\b/i, Camera],
  [/\b(music|dance|band|instrument|record)\b/i, Music],
  [/\b(entertainment|amusement|arcade|gaming|casino)\b/i, Film],
  [/\b(art|gallery|museum|craft|sculpt\w*|design)\b/i, Palette],
  [/\b(temple|church|mosque|abbey|monaster\w*|shrine|synagogue|religio\w*|priest)\b/i, Church],
  [/\b(jewel|gold|silver|diamond|goldsmith|pawn)\b/i, Gem],
  [/\b(watch|clock)\b/i, Watch],
  [/\b(optic\w*|eyewear|spectacle|glasses)\b/i, Glasses],
  [/\b(laundry|dry clean|tailor|clothing|apparel|boutique|garment|fashion|shoe)\b/i, Shirt],
  [/\b(mobile|phone|telecom|electronics)\b/i, Smartphone],
  [/\b(supermarket|grocery|market|mart|wholesale)\b/i, ShoppingCart],
  [/\b(shop|store|shopping|retail|supplier|trader|exporter)\b/i, ShoppingBag],
  [/\b(office|corporate|company|consultant|agency|firm|association|organisation|organization)\b/i, Building2],
  [/\b(plantation|seedling)\b/i, Sprout],
]

/** Explicit icons an admin can set on a category, by lucide name. */
const NAMED: Record<string, React.ComponentType<LucideProps>> = {
  utensils: Utensils, 'bed-double': BedDouble, smartphone: Smartphone, wrench: Wrench,
  stethoscope: Stethoscope, 'graduation-cap': GraduationCap, scissors: Scissors, car: Car,
  'building-2': Building2, landmark: Landmark, plane: Plane, 'shopping-bag': ShoppingBag,
  store: Store, coffee: Coffee, megaphone: Megaphone, laptop: Laptop, dumbbell: Dumbbell,
  scale: Scale, home: Home, camera: Camera, printer: Printer, church: Church, gem: Gem,
  truck: Truck, factory: Factory, 'paw-print': PawPrint, shield: Shield, palette: Palette,
}

export function iconFor(icon?: string | null, category?: string | null) {
  if (icon && NAMED[icon]) return NAMED[icon]
  if (category) {
    for (const [pattern, Icon] of KEYWORDS) if (pattern.test(category)) return Icon
  }
  return Store
}

export function CategoryIcon({
  name,
  category,
  ...props
}: Omit<LucideProps, 'name'> & { name?: string | null; category?: string | null }) {
  const Icon = iconFor(name, category)
  return <Icon {...props} />
}
