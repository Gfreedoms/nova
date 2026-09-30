/* Nova — seed data (all events, organizers and text are fictional) */
(function () {
  const DAY = 86400000;
  function at(daysFromNow, hour, min) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setTime(d.getTime() + daysFromNow * DAY);
    d.setHours(hour, min || 0, 0, 0);
    return d.toISOString();
  }
  function plusHours(iso, h) { return new Date(new Date(iso).getTime() + h * 3600000).toISOString(); }

  /* 8 combined categories — older ids map onto them via CAT_ALIAS */
  const CATEGORIES = [
    { id: 'music', name: 'Music & Nightlife', short: 'Music & Nightlife', emoji: '🎵' },
    { id: 'arts', name: 'Arts & Culture', short: 'Arts & Culture', emoji: '🎭' },
    { id: 'food', name: 'Food & Drink', short: 'Food & Drink', emoji: '🍲' },
    { id: 'business', name: 'Business & Tech', short: 'Business & Tech', emoji: '💼' },
    { id: 'sports', name: 'Sports & Outdoors', short: 'Sports & Outdoors', emoji: '⚽' },
    { id: 'social', name: 'Social & Festivals', short: 'Social & Festivals', emoji: '🎉' },
    { id: 'education', name: 'Learning', short: 'Learning', emoji: '🎓' },
    { id: 'charity', name: 'Causes', short: 'Causes', emoji: '🤝' }
  ];
  const CAT_ALIAS = { nightlife: 'music', tech: 'business', hobbies: 'sports', dating: 'social', holidays: 'social' };

  const PALETTES = [
    ['#003d80', '#007bff'], ['#0b2545', '#13315c'], ['#5b21b6', '#007bff'],
    ['#0e7490', '#22d3ee'], ['#9d174d', '#f472b6'], ['#065f46', '#34d399'],
    ['#7c2d12', '#f59e0b'], ['#1e1b4b', '#6366f1'], ['#831843', '#6d28d9'],
    ['#134e4a', '#0ea5e9'], ['#1f2937', '#4b5563'], ['#0c4a6e', '#38bdf8']
  ];

  const ORGANIZERS = [
    { id: 'o1', name: 'Pearl Sound Collective', followers: 4820, bio: 'Independent promoters bringing live Afro-fusion, jazz and acoustic nights to East Africa since 2016.' },
    { id: 'o2', name: 'Kampala Tech Hub', followers: 12300, bio: 'A community of builders, founders and engineers. Monthly meetups, bootcamps and an annual summit.' },
    { id: 'o3', name: 'Taste of the Lake', followers: 2710, bio: 'Food festivals and supper clubs celebrating Ugandan cuisine and local producers.' },
    { id: 'o4', name: 'Ndere Arts Circle', followers: 3390, bio: 'Theatre, dance and gallery evenings for everyone curious about the arts.' },
    { id: 'o5', name: 'RunKLA', followers: 6150, bio: 'Weekly social runs, charity races and fitness challenges around the city.' },
    { id: 'o6', name: 'Growth Founders Network', followers: 8900, bio: 'Workshops and forums for entrepreneurs scaling businesses across the region.' },
    { id: 'o7', name: 'Nile Adventures Co.', followers: 1980, bio: 'Weekend trips, rafting days and outdoor experiences from Jinja.' },
    { id: 'o8', name: 'Hearts & Hands Foundation', followers: 1520, bio: 'Community fundraisers supporting schools and clinics in rural districts.' }
  ];

  const venues = {
    kla1: { name: 'Lugogo Cricket Oval', address: 'Lugogo Bypass', city: 'Kampala', country: 'Uganda' },
    kla2: { name: 'Kampala Serena Conference Centre', address: 'Kintu Road', city: 'Kampala', country: 'Uganda' },
    kla3: { name: 'The Rooftop, Kololo', address: 'Acacia Avenue', city: 'Kampala', country: 'Uganda' },
    kla4: { name: 'National Theatre', address: 'De Winton Road', city: 'Kampala', country: 'Uganda' },
    kla5: { name: 'Innovation Village', address: 'Ntinda Complex', city: 'Kampala', country: 'Uganda' },
    kla6: { name: 'Kololo Independence Grounds', address: 'Kololo', city: 'Kampala', country: 'Uganda' },
    ebb: { name: 'Lido Beach', address: 'Nakiwogo Road', city: 'Entebbe', country: 'Uganda' },
    jja: { name: 'Source of the Nile Gardens', address: 'Main Street', city: 'Jinja', country: 'Uganda' },
    nbo: { name: 'KICC Amphitheatre', address: 'Harambee Avenue', city: 'Nairobi', country: 'Kenya' },
    mbr: { name: 'Lake Mburo Lodge', address: 'Park Road', city: 'Mbarara', country: 'Uganda' }
  };

  function ev(o) {
    return Object.assign({
      online: false, tags: [], faq: [], agenda: [], refund: 'Refunds available up to 7 days before the event.',
      ageLimit: 'All ages', views: Math.floor(500 + Math.random() * 6000), createdAt: at(-20, 9)
    }, o);
  }

  const EVENTS = [
    ev({ id: 'e1', title: 'Sunset Sessions: Afro-Jazz on the Rooftop', category: 'music', organizerId: 'o1', start: at(3, 18), hours: 5, venue: venues.kla3, palette: 0,
      summary: 'Live Afro-jazz, city views and golden-hour cocktails with three of the region\'s most exciting bands.',
      description: 'Settle in as the sun drops over the seven hills. Sunset Sessions is an intimate open-air concert series pairing live Afro-jazz with great food and a relaxed crowd.\n\nThis edition features a sax-led quartet, a soulful vocal trio and a closing DJ set of highlife and amapiano classics. Seating is first come, first served — VIP includes reserved lounge seating and a welcome drink.',
      tiers: [{ id: 't1', name: 'General Admission', price: 50000, qty: 300, sold: 212, desc: 'Standing & open seating' }, { id: 't2', name: 'VIP Lounge', price: 150000, qty: 60, sold: 51, desc: 'Reserved seating + welcome drink' }],
      agenda: [{ time: '6:00 PM', title: 'Doors open & welcome drinks' }, { time: '7:00 PM', title: 'Opening set — The Nsambya Quartet' }, { time: '8:15 PM', title: 'Main set — Amani Voices' }, { time: '9:45 PM', title: 'Closing DJ set' }],
      tags: ['jazz', 'live music', 'rooftop', 'kampala'], ageLimit: '18+',
      faq: [{ q: 'Is there parking?', a: 'Limited parking is available at the venue; we recommend using a ride-hailing app.' }, { q: 'Can I buy tickets at the door?', a: 'Yes, if not sold out — but prices at the door are higher.' }] }),

    ev({ id: 'e2', title: 'Kampala Tech Summit 2026', category: 'tech', organizerId: 'o2', start: at(12, 8, 30), hours: 9, venue: venues.kla2, palette: 2,
      summary: 'A full day of talks, demos and networking with the people building East Africa\'s digital future.',
      description: 'Kampala Tech Summit brings together more than 1,500 engineers, founders, investors and policymakers for a day of practical, forward-looking sessions.\n\nTracks this year: Applied AI & data, fintech and payments, public-sector digital services, and developer tooling. Every ticket includes lunch, coffee and access to the startup expo floor.',
      tiers: [{ id: 't1', name: 'Student', price: 30000, qty: 200, sold: 188, desc: 'Valid student ID required at entry' }, { id: 't2', name: 'Standard', price: 120000, qty: 1000, sold: 640, desc: 'Full-day access + lunch' }, { id: 't3', name: 'All-Access + Workshop', price: 350000, qty: 150, sold: 97, desc: 'Includes a hands-on afternoon workshop' }],
      agenda: [{ time: '8:30 AM', title: 'Registration & breakfast' }, { time: '9:30 AM', title: 'Keynote: Building for the next 100 million users' }, { time: '11:00 AM', title: 'Parallel tracks begin' }, { time: '1:00 PM', title: 'Lunch & startup expo' }, { time: '2:00 PM', title: 'Workshops & panels' }, { time: '5:00 PM', title: 'Closing mixer' }],
      tags: ['tech', 'ai', 'startups', 'conference', 'fintech'],
      faq: [{ q: 'Will sessions be recorded?', a: 'Keynotes will be published online within two weeks. Workshops are not recorded.' }, { q: 'Is there Wi-Fi?', a: 'Yes, free high-speed Wi-Fi is available throughout the venue.' }] }),

    ev({ id: 'e3', title: 'Rolex & Street Food Festival', category: 'food', organizerId: 'o3', start: at(6, 11), hours: 9, venue: venues.kla6, palette: 6,
      summary: 'Fifty vendors, live cooking battles and the city\'s best street food all in one place.',
      description: 'The city\'s favourite street food gets its own festival. Sample creative takes on the classic rolex, grilled skewers, fresh juices and desserts from more than fifty vendors.\n\nDon\'t miss the afternoon cook-off, where five chefs compete live on stage for the Golden Pan. Kids\' zone and live band all day.',
      tiers: [{ id: 't1', name: 'Entry', price: 10000, qty: 3000, sold: 1870, desc: 'Entry only, food sold separately' }, { id: 't2', name: 'Tasting Pass', price: 45000, qty: 500, sold: 402, desc: 'Entry + 8 tasting tokens' }],
      tags: ['food', 'festival', 'family', 'outdoor'] }),

    ev({ id: 'e4', title: 'Contemporary Dance Showcase: Roots & Routes', category: 'arts', organizerId: 'o4', start: at(9, 19), hours: 2.5, venue: venues.kla4, palette: 8,
      summary: 'Six emerging choreographers explore migration, memory and belonging through movement.',
      description: 'Roots & Routes presents six original short works by emerging choreographers from across East Africa. Expect bold staging, live percussion and a post-show conversation with the artists.',
      tiers: [{ id: 't1', name: 'Balcony', price: 25000, qty: 120, sold: 64, desc: '' }, { id: 't2', name: 'Stalls', price: 40000, qty: 250, sold: 190, desc: 'Best view of the stage' }],
      tags: ['dance', 'theatre', 'culture'] }),

    ev({ id: 'e5', title: 'Nile Sunrise Half Marathon', category: 'sports', organizerId: 'o5', start: at(20, 6), hours: 5, venue: venues.jja, palette: 9,
      summary: 'Run 5K, 10K or 21K along the river as the sun comes up. Medals for every finisher.',
      description: 'One of the most scenic races in the region. Choose your distance, collect your race pack the day before, and run beside the Nile as the sun rises.\n\nPart of every entry supports youth athletics programmes in Busoga.',
      tiers: [{ id: 't1', name: '5K Fun Run', price: 35000, qty: 800, sold: 420, desc: 'T-shirt + medal' }, { id: 't2', name: '10K', price: 55000, qty: 600, sold: 380, desc: 'T-shirt + medal + timing chip' }, { id: 't3', name: 'Half Marathon (21K)', price: 80000, qty: 400, sold: 400, desc: 'T-shirt + medal + timing chip' }],
      tags: ['running', 'marathon', 'fitness', 'jinja', 'charity'], refund: 'No refunds. Entries may be transferred up to 5 days before race day.' }),

    ev({ id: 'e6', title: 'Founders Breakfast: Raising Your First Round', category: 'business', organizerId: 'o6', start: at(4, 7, 30), hours: 2.5, venue: venues.kla5, palette: 1,
      summary: 'An honest, practical breakfast conversation with three founders who closed seed rounds this year.',
      description: 'Pull up a chair for a candid morning session on what it really takes to raise a first round. Our panel will share their decks, the questions investors asked, and what they would do differently.\n\nLimited to 60 seats to keep the conversation personal.',
      tiers: [{ id: 't1', name: 'Breakfast Seat', price: 60000, qty: 60, sold: 44, desc: 'Includes full breakfast' }],
      tags: ['startups', 'fundraising', 'networking', 'business'] }),

    ev({ id: 'e7', title: 'Intro to Machine Learning with Python (Online)', category: 'education', organizerId: 'o2', start: at(7, 17), hours: 3, online: true, venue: null, palette: 11,
      summary: 'A beginner-friendly, hands-on live workshop. Build and evaluate your first model in three hours.',
      description: 'No prior ML experience required — just basic Python. We\'ll cover the core ideas behind supervised learning, then build, train and evaluate a model together in a shared notebook.\n\nThe session link is sent to your email after registration.',
      tiers: [{ id: 't1', name: 'Free Registration', price: 0, qty: 500, sold: 311, desc: 'Live session access' }, { id: 't2', name: 'Supporter + Certificate', price: 20000, qty: 200, sold: 58, desc: 'Recording + certificate of completion' }],
      tags: ['python', 'machine learning', 'online', 'workshop'] }),

    ev({ id: 'e8', title: 'Lakeside Beach Party', category: 'nightlife', organizerId: 'o1', start: at(10, 14), hours: 10, venue: venues.ebb, palette: 3,
      summary: 'Sand, sound systems and sunset — an all-day party on the shores of the lake.',
      description: 'Three DJs, beach games, food trucks and a sunset boat cruise add-on. Bring your crew and your best beachwear.',
      tiers: [{ id: 't1', name: 'Early Bird', price: 30000, qty: 400, sold: 400, desc: 'Sold out' }, { id: 't2', name: 'General', price: 45000, qty: 1200, sold: 715, desc: '' }, { id: 't3', name: 'General + Boat Cruise', price: 90000, qty: 100, sold: 71, desc: '1-hour sunset cruise' }],
      tags: ['party', 'beach', 'dj', 'entebbe'], ageLimit: '18+' }),

    ev({ id: 'e9', title: 'Speed Friending & Board Games Night', category: 'dating', organizerId: 'o4', start: at(5, 19), hours: 3, venue: venues.kla3, palette: 4,
      summary: 'Meet new people the low-pressure way — rotating tables, easy prompts and plenty of games.',
      description: 'New in town, or just want to widen your circle? A friendly host guides you through short rotating conversations, followed by an open board games session.',
      tiers: [{ id: 't1', name: 'Ticket', price: 25000, qty: 80, sold: 52, desc: 'Includes one drink' }],
      tags: ['social', 'games', 'meetup'] }),

    ev({ id: 'e10', title: 'White-Water Rafting Day Trip', category: 'hobbies', organizerId: 'o7', start: at(14, 7), hours: 11, venue: venues.jja, palette: 5,
      summary: 'Grade 3–5 rapids, a riverside lunch and transport from Kampala included.',
      description: 'A full day on the river with certified guides. Beginners welcome — a calm-water option is available. Includes transport, safety briefing, equipment, lunch and photos.',
      tiers: [{ id: 't1', name: 'Full Day Rafting', price: 420000, qty: 40, sold: 29, desc: 'Transport, lunch & equipment' }],
      tags: ['adventure', 'outdoors', 'jinja', 'rafting'], ageLimit: '14+' }),

    ev({ id: 'e11', title: 'Community Charity Gala: Books for Every Child', category: 'charity', organizerId: 'o8', start: at(24, 18, 30), hours: 4, venue: venues.kla2, palette: 7,
      summary: 'An elegant evening of dinner, music and an auction supporting rural school libraries.',
      description: 'Join us for a three-course dinner, live string quartet and silent auction. Every ticket stocks a classroom library with 50 new books.',
      tiers: [{ id: 't1', name: 'Single Seat', price: 250000, qty: 200, sold: 96, desc: 'Dinner + entertainment' }, { id: 't2', name: 'Table of 8', price: 1800000, qty: 20, sold: 7, desc: 'Reserved table with branding' }],
      tags: ['charity', 'gala', 'education', 'fundraiser'] }),

    ev({ id: 'e12', title: 'Nairobi Design Week: Opening Night', category: 'arts', organizerId: 'o4', start: at(17, 18), hours: 4, venue: venues.nbo, palette: 10,
      summary: 'Exhibitions, installations and conversations kicking off a week of East African design.',
      description: 'The opening party for a week-long celebration of product, graphic, fashion and architectural design from across the region.',
      tiers: [{ id: 't1', name: 'Opening Night Pass', price: 0, qty: 800, sold: 530, desc: 'Free, registration required' }],
      tags: ['design', 'exhibition', 'nairobi'] }),

    ev({ id: 'e13', title: 'Data Visualisation Masterclass', category: 'tech', organizerId: 'o2', start: at(2, 14), hours: 4, venue: venues.kla5, palette: 0,
      summary: 'Turn messy datasets into clear, honest charts. Bring your laptop and your own data.',
      description: 'A practical masterclass covering chart choice, colour, annotation and dashboards. We\'ll use open survey datasets and finish with a short critique session.',
      tiers: [{ id: 't1', name: 'Seat', price: 80000, qty: 40, sold: 33, desc: 'Laptop required' }],
      tags: ['data', 'visualisation', 'workshop', 'analytics'] }),

    ev({ id: 'e14', title: 'Independence Weekend Festival', category: 'holidays', organizerId: 'o1', start: at(28, 12), hours: 10, venue: venues.kla1, palette: 6,
      summary: 'Music, food and fireworks to celebrate the holiday weekend with family and friends.',
      description: 'A family-friendly day festival with two stages, a food court, craft market and a fireworks finale at 9:30 PM.',
      tiers: [{ id: 't1', name: 'Adult', price: 20000, qty: 5000, sold: 2100, desc: '' }, { id: 't2', name: 'Child (under 12)', price: 5000, qty: 2000, sold: 640, desc: '' }],
      tags: ['holiday', 'festival', 'fireworks', 'family'] }),

    ev({ id: 'e15', title: 'Morning Yoga in the Park', category: 'sports', organizerId: 'o5', start: at(1, 7), hours: 1.5, venue: venues.kla6, palette: 5,
      summary: 'A gentle all-levels flow to start your weekend. Mats available to borrow.',
      description: 'Led by certified instructors, this outdoor session suits complete beginners and regulars alike. Bring water and arrive ten minutes early.',
      tiers: [{ id: 't1', name: 'Drop-in', price: 0, qty: 100, sold: 61, desc: 'Free — donations welcome' }],
      tags: ['yoga', 'wellness', 'outdoors'] }),

    ev({ id: 'e16', title: 'Coffee Cupping & Farm Tour', category: 'food', organizerId: 'o3', start: at(15, 9), hours: 6, venue: venues.mbr, palette: 7,
      summary: 'Follow the bean from cherry to cup, then taste six single-origin coffees with a Q-grader.',
      description: 'Walk a working smallholder farm, learn about processing and roasting, and finish with a guided cupping session. Lunch included.',
      tiers: [{ id: 't1', name: 'Tour + Cupping', price: 95000, qty: 30, sold: 12, desc: 'Lunch included' }],
      tags: ['coffee', 'tour', 'food', 'farm'] }),

    ev({ id: 'e17', title: 'Leadership for Public Sector Innovators (Online)', category: 'business', organizerId: 'o6', start: at(8, 10), hours: 2, online: true, venue: null, palette: 1,
      summary: 'A live webinar on delivering digital services in government — lessons from real projects.',
      description: 'Practitioners share how they shipped digital services inside public institutions: procurement, user research, data and change management.',
      tiers: [{ id: 't1', name: 'Free Webinar', price: 0, qty: 1000, sold: 420, desc: '' }],
      tags: ['government', 'leadership', 'online', 'webinar'] }),

    ev({ id: 'e18', title: 'Acoustic Open Mic Night', category: 'music', organizerId: 'o1', start: at(0, 19, 30), hours: 3, venue: venues.kla3, palette: 8,
      summary: 'Singer-songwriters, poets and first-timers — sign up at the door to take the stage.',
      description: 'A warm, supportive room for original music and spoken word. Performer slots are ten minutes each.',
      tiers: [{ id: 't1', name: 'Entry', price: 15000, qty: 120, sold: 77, desc: '' }],
      tags: ['open mic', 'acoustic', 'poetry'] })
  ];

  /* Real photos from Unsplash (free to use under the Unsplash License) — stored as photo IDs */
  const PHOTOS = {
    sax: '1415201364774-f6f0bb35f28f', conference: '1540575467063-178a50c2df87', streetfood: '1555939594-58d7cb561ad1',
    dance: '1508700929628-666bc8bd84ea', running: '1452626038306-9aae5e071dd3', meeting: '1556761175-5973dc0f32e7',
    laptops: '1519389950473-47ba0277781c', beach: '1507525428034-b723cf961d3e', friends: '1529156069898-49953e39b3ac',
    rafting: '1530866495561-507c9faab2ed', gala: '1519167758481-83f550bb49b3', gallery: '1531058020387-3be344556be6',
    data: '1551288049-bebda4e38f71', fireworks: '1467810563316-b5476525c0f9', yoga: '1544367567-0f2fcb009e0b',
    coffee: '1495474472287-4d71bcdd2085', webinar: '1588196749597-9ff075ee6b5b', mic: '1511671782779-c97d3d27a1d4',
    party: '1492684223066-81342ee5ff30', concert: '1470229722913-7c0e2dbbafd3', crowd: '1514525253161-7a46d19cd819',
    festival: '1533174072545-7a4b6ad7a6c3', stage: '1505373877841-8d25f7d46678', food: '1504674900247-0877df9cc836',
    social: '1543269865-cbf427effbad', graduation: '1523580494863-6f3031224c94', volunteers: '1488521787991-ed7bbaae773c',
    safari: '1547471080-7cc2caa01a7e', landscape: '1501785888041-af3ef285b470'
  };
  const EVENT_PHOTO = { e1: 'sax', e2: 'conference', e3: 'streetfood', e4: 'dance', e5: 'running', e6: 'meeting', e7: 'laptops', e8: 'beach', e9: 'friends', e10: 'rafting', e11: 'gala', e12: 'gallery', e13: 'data', e14: 'fireworks', e15: 'yoga', e16: 'coffee', e17: 'webinar', e18: 'mic' };
  const CATEGORY_PHOTO = { music: 'concert', arts: 'dance', food: 'food', business: 'stage', sports: 'running', social: 'festival', education: 'graduation', charity: 'volunteers' };

  EVENTS.forEach(e => { e.end = plusHours(e.start, e.hours); e.photo = PHOTOS[EVENT_PHOTO[e.id]]; e.category = CAT_ALIAS[e.category] || e.category; });
  CATEGORIES.forEach(c => { c.photo = PHOTOS[CATEGORY_PHOTO[c.id]]; });

  const CITIES = [
    { name: 'Kampala', palette: 0, photo: PHOTOS.festival }, { name: 'Entebbe', palette: 3, photo: PHOTOS.beach },
    { name: 'Jinja', palette: 5, photo: PHOTOS.rafting }, { name: 'Nairobi', palette: 8, photo: PHOTOS.stage },
    { name: 'Mbarara', palette: 6, photo: PHOTOS.safari }
  ];

  window.NOVA_SEED = { CAT_ALIAS, CATEGORIES, PALETTES, ORGANIZERS, EVENTS, CITIES, PHOTOS };
})();
