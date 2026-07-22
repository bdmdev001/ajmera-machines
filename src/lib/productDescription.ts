import type { IProduct } from '@/models/Product';

/* ============================================================================
   Professional, consistent product descriptions + the required commercial note.

   IMPORTANT: `buildProductDescription` is mirrored, byte-for-byte in behaviour,
   in `scripts/update-products-from-csv.mjs` (which cannot import TypeScript).
   If you change the wording/format here, update that script's copy too so the
   stored descriptions and the live fallback stay identical.
   ========================================================================= */

type DescProduct = Pick<IProduct, 'make' | 'model' | 'title' | 'category' | 'country' | 'myear'>;

const clean = (v?: string) => (v ?? '').trim();
const meaningful = (v?: string) => {
  const s = clean(v);
  return s && s !== 'N/A' ? s : '';
};

/**
 * A type-level sentence on what the machine is FOR — matched by machine family
 * (drilling, grinding, turning, gear, press, etc.) from the category/title. This
 * is general industry knowledge about the machine TYPE, never invented per-unit
 * data, and deliberately carries no numeric specifications.
 */
function machineApplication(category: string, title: string): string {
  const h = `${category} ${title}`.toLowerCase();
  const rules: [RegExp, string][] = [
    [/tester|testing/, 'Machines of this type are used to inspect and check gears for running accuracy and quality, supporting quality control in gear and transmission manufacturing.'],
    [/sharp|tool\s*&?\s*cutter/, 'Machines of this type are used to sharpen and recondition cutting tools such as hobs and cutters, helping workshops keep their tooling accurate and productive.'],
    [/thread/, 'Machines of this type are used to produce accurate external or internal threads, supporting the manufacture of fasteners, lead screws and other threaded components.'],
    [/gun/, 'Deep-hole drilling machines of this type are used to produce long, straight and accurate bores, such as those needed in shafts, moulds and hydraulic components.'],
    [/gear|hob|skiv|bevel|shob/, 'Machines of this type are used to cut and finish gear teeth to consistent quality, supporting gearbox, transmission and power-transmission component manufacturing.'],
    [/\bvtl\b|vertical turning|vertical lathe|vertical boring/, 'Vertical turning machines of this type are used to turn, face and bore large-diameter, heavy rotational parts that are difficult to hold on a horizontal lathe, suiting heavy engineering and casting work.'],
    [/lathe|turning/, 'Lathes of this type are used to turn, face and machine cylindrical components such as shafts, bushes and rollers, a mainstay of general machining and repair work.'],
    [/facing|centering|centring/, 'Machines of this type are used to face and centre-drill the ends of shafts and bar stock in preparation for turning, a common first step in shaft and axle production.'],
    [/hone|honing/, 'Honing machines of this type are used to produce a precise, fine finish inside bores and cylinders, typical of hydraulic, engine and precision component work.'],
    [/bore|boring/, 'Machines of this type are used to enlarge and finish holes to accurate diameters and positions in medium to large components, common in tool rooms and heavy fabrication.'],
    [/drill/, 'Machines of this type are used to drill, ream and tap holes accurately across a range of components, suiting fabrication and general engineering workshops.'],
    [/broach/, 'Broaching machines of this type are used to cut internal or external profiles such as keyways, splines and slots in a single, repeatable pass.'],
    [/centreless|centerless/, 'Centreless grinders of this type are used to grind the outside diameter of cylindrical parts at high throughput, suiting volume production of pins, rollers and shafts.'],
    [/internal grind|grinder internal/, 'Internal grinders of this type are used to grind bores and internal diameters to a fine finish and accurate size.'],
    [/cylindrical/, 'Cylindrical grinders of this type are used to grind the outside diameter of round components to precise size and surface finish, common in precision and tool-room work.'],
    [/surface/, 'Surface grinders of this type are used to grind flat surfaces to a fine finish and close tolerance, widely used in tool rooms and precision machining.'],
    [/grind/, 'Grinding machines of this type are used to finish components to a precise size and surface quality, a key step in precision manufacturing.'],
    [/mill/, 'Milling machines of this type are used to machine flat faces, slots, pockets and contours on a wide variety of components, a versatile mainstay of tool rooms and general engineering.'],
    [/saw/, 'Sawing machines of this type are used to cut bar, billet and section stock to length accurately, a common first operation in machining and fabrication.'],
    [/brake|bending/, 'Press brakes of this type are used to bend and form sheet and plate into accurate angles and profiles, essential to sheet-metal fabrication.'],
    [/shear/, 'Shearing machines of this type are used to cut sheet and plate cleanly to size, a fundamental operation in sheet-metal work.'],
    [/notch/, 'Notching machines of this type are used to cut corners and notches in sheet metal, aiding fabrication and panel work.'],
    [/press|punch/, 'Presses of this type are used to stamp, punch and form sheet-metal components, supporting volume production in press shops.'],
    [/shap/, 'Shaping machines of this type are used to machine flat surfaces, slots and keyways on smaller components, a useful capability in tool rooms and maintenance work.'],
    [/tap/, 'Tapping machines of this type are used to cut internal threads quickly and consistently, supporting fastening and assembly operations.'],
    [/level/, 'Levelling machines of this type are used to flatten sheet and strip stock, improving material quality ahead of cutting and forming.'],
    [/pantograph|engrav/, 'Pantograph machines of this type are used to engrave and copy profiles and lettering, useful for die, mould and marking work.'],
  ];
  for (const [re, sentence] of rules) if (re.test(h)) return sentence;
  return 'Machines of this type support a range of machining and production tasks across engineering and manufacturing workshops.';
}

/**
 * Build a unique, professional, buyer-focused description from the product's own
 * verified data — what the machine is, where it comes from, and what it is used
 * for. It deliberately does NOT repeat technical specifications (those live in the
 * separate Specifications section) and invents nothing beyond general, type-level
 * application context. Formatting is consistent across the catalogue.
 */
export function buildProductDescription(p: DescProduct): string {
  const make = meaningful(p.make);
  const title = clean(p.title);
  const model = meaningful(p.model);
  const country = meaningful(p.country);
  const year = clean(p.myear);
  const category = meaningful(p.category) || 'industrial machine';

  // Avoid "AMADA Promecam AMADA Make …" — don't prepend the brand when the title
  // already carries it (full make present, or sharing the same leading word).
  const firstTok = (s: string) => (s.toLowerCase().match(/[a-z0-9]+/) || [''])[0];
  const titleHasBrand = !!(title && make && (title.toLowerCase().includes(make.toLowerCase()) || firstTok(title) === firstTok(make)));
  const name = titleHasBrand ? title : ([make, title].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || `used ${category}`);
  // "Tapping Machine" -> don't append "machine" twice.
  const catPhrase = /machines?$/i.test(category) ? category : `${category} machine`;

  let s1 = `The ${name} is a pre-owned ${catPhrase}`;
  const origin: string[] = [];
  if (country) origin.push(`of ${country} origin`);
  if (year) origin.push(`manufactured in ${year}`);
  if (origin.length) s1 += ` ${origin.join(' and ')}`;
  s1 += `, available from Ajmera Enterprise in Navi Mumbai, India.`;

  const s2 = machineApplication(category, title);

  const s3 = `${model ? `Offered as model ${model}, it has` : 'It has'} been inspected and tested under power before listing, providing a cost-effective, ready-to-use option for buyers of reliable pre-owned machinery — contact us for current pricing, photographs and availability.`;

  return `${s1} ${s2} ${s3}`.replace(/\s+/g, ' ').trim();
}
