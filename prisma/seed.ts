import { PrismaClient, Role, EventType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️ Wiping database...');
  // Delete in exact order to respect foreign key constraints
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.ticketTransfer.deleteMany(),
    prisma.bookingSeat.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.waitlist.deleteMany(),
    prisma.seatHold.deleteMany(),
    prisma.showPrice.deleteMany(),
    prisma.show.deleteMany(),
    prisma.event.deleteMany(),
    prisma.seat.deleteMany(),
    prisma.venue.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  console.log('✅ Database completely wiped.');

  console.log('🌱 Seeding database with fresh fictional content...');

  // Create exactly 2 users
  const adminPassword = await bcrypt.hash('03b344xT\\Tge|{O[G}', 12);
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@curtain.com',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  const organiserPassword = await bcrypt.hash('03b344xT\\Tge|{O[G}', 12);
  const organiser = await prisma.user.create({
    data: {
      name: 'Lead Organiser',
      email: 'organiser@curtain.com',
      password: organiserPassword,
      role: Role.ORGANISER,
    },
  });
  console.log('✅ Organiser user created:', organiser.email);

  // Create venues
  const grandMeridian = await prisma.venue.create({
    data: {
      id: 'grand-meridian',
      name: 'The Grand Meridian',
      address: '100 Meridian Way, City Center',
      adminId: admin.id,
    },
  });
  console.log('✅ Venue created:', grandMeridian.name);

  const auroraHall = await prisma.venue.create({
    data: {
      id: 'aurora-hall',
      name: 'Aurora Concert Hall',
      address: '400 Symphony Blvd, Arts District',
      adminId: admin.id,
    },
  });
  console.log('✅ Venue created:', auroraHall.name);

  // Create seats for The Grand Meridian
  const cinemaSeats = [];
  const cinemaRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const cinemaSeatsPerRow = 12;

  for (const row of cinemaRows) {
    for (let num = 1; num <= cinemaSeatsPerRow; num++) {
      let category = 'Standard';
      if (['A', 'B'].includes(row)) category = 'Premium';

      cinemaSeats.push({
        venueId: grandMeridian.id,
        row,
        number: num,
        category,
      });
    }
  }

  await prisma.seat.createMany({
    data: cinemaSeats,
    skipDuplicates: true,
  });
  console.log(`✅ Created ${cinemaSeats.length} seats for ${grandMeridian.name}`);

  // Create seats for Aurora Concert Hall
  const concertSeats = [];
  const concertRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  const concertSeatsPerRow = 16;

  for (const row of concertRows) {
    for (let num = 1; num <= concertSeatsPerRow; num++) {
      let category = 'General';
      if (['A', 'B', 'C'].includes(row)) category = 'VIP';
      if (['D', 'E', 'F', 'G'].includes(row)) category = 'Premium';
      if (['H', 'I', 'J', 'K'].includes(row)) category = 'General';

      concertSeats.push({
        venueId: auroraHall.id,
        row,
        number: num,
        category,
      });
    }
  }

  await prisma.seat.createMany({
    data: concertSeats,
    skipDuplicates: true,
  });
  console.log(`✅ Created ${concertSeats.length} seats for ${auroraHall.name}`);

  // Create events
  const movie1 = await prisma.event.create({
    data: {
      id: 'chronicles-nebula',
      title: 'Chronicles of the Nebula',
      type: EventType.MOVIE,
      description: 'A visually stunning sci-fi epic exploring the outer reaches of a dying galaxy. Follow a crew of rogues as they search for the last habitable planet.',
      imageUrl: 'https://placehold.co/600x800/1e1b4b/ffffff?text=Chronicles+of%0Athe+Nebula',
      organiserId: organiser.id,
    },
  });
  console.log('✅ Event created:', movie1.title);

  const movie2 = await prisma.event.create({
    data: {
      id: 'midnight-paradigm',
      title: 'The Midnight Paradigm',
      type: EventType.MOVIE,
      description: 'A gripping mystery thriller set in a rain-soaked metropolis. A brilliant detective races against time to solve a series of cryptographic murders.',
      imageUrl: 'https://placehold.co/600x800/0f172a/ffffff?text=The+Midnight%0AParadigm',
      organiserId: organiser.id,
    },
  });
  console.log('✅ Event created:', movie2.title);

  const movie3 = await prisma.event.create({
    data: {
      id: 'unplugged-unhinged',
      title: 'Unplugged and Unhinged',
      type: EventType.MOVIE,
      description: 'A hilarious comedy about a tech-obsessed family forced to survive a week in the wilderness without internet or smartphones.',
      imageUrl: 'https://placehold.co/600x800/7c2d12/ffffff?text=Unplugged%0A%26+Unhinged',
      organiserId: organiser.id,
    },
  });
  console.log('✅ Event created:', movie3.title);

  const concert1 = await prisma.event.create({
    data: {
      id: 'symphony-ancients',
      title: 'Symphony of the Ancients',
      type: EventType.CONCERT,
      description: 'A majestic orchestral performance breathing life into forgotten classical masterpieces. Featuring a world-renowned 100-piece orchestra.',
      imageUrl: 'https://placehold.co/600x800/312e81/ffffff?text=Symphony+of%0Athe+Ancients',
      organiserId: organiser.id,
    },
  });
  console.log('✅ Event created:', concert1.title);

  const concert2 = await prisma.event.create({
    data: {
      id: 'neon-echoes',
      title: 'Neon Echoes Live',
      type: EventType.CONCERT,
      description: 'An intimate indie/alternative music experience. Soulful acoustic melodies mixed with subtle, atmospheric synthwave beats.',
      imageUrl: 'https://placehold.co/600x800/831843/ffffff?text=Neon+Echoes%0ALive',
      organiserId: organiser.id,
    },
  });
  console.log('✅ Event created:', concert2.title);

  const concert3 = await prisma.event.create({
    data: {
      id: 'velocity-world-tour',
      title: 'Velocity World Tour',
      type: EventType.CONCERT,
      description: 'A high-energy pop arena spectacle with dazzling light shows, intricate choreography, and chart-topping futuristic anthems.',
      imageUrl: 'https://placehold.co/600x800/14532d/ffffff?text=Velocity%0AWorld+Tour',
      organiserId: organiser.id,
    },
  });
  console.log('✅ Event created:', concert3.title);

  // Create shows
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const showM1a = await prisma.show.create({
    data: {
      eventId: movie1.id,
      venueId: grandMeridian.id,
      date: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0),
      holdTtlMins: 10,
    },
  });
  const showM1b = await prisma.show.create({
    data: {
      eventId: movie1.id,
      venueId: grandMeridian.id,
      date: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 19, 30),
      holdTtlMins: 10,
    },
  });
  const showM2 = await prisma.show.create({
    data: {
      eventId: movie2.id,
      venueId: grandMeridian.id,
      date: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 21, 15),
      holdTtlMins: 10,
    },
  });
  const showM3 = await prisma.show.create({
    data: {
      eventId: movie3.id,
      venueId: grandMeridian.id,
      date: new Date(in3Days.getFullYear(), in3Days.getMonth(), in3Days.getDate(), 18, 0),
      holdTtlMins: 10,
    },
  });

  const showC1 = await prisma.show.create({
    data: {
      eventId: concert1.id,
      venueId: auroraHall.id,
      date: new Date(in3Days.getFullYear(), in3Days.getMonth(), in3Days.getDate(), 20, 0),
      holdTtlMins: 10,
    },
  });
  const showC2 = await prisma.show.create({
    data: {
      eventId: concert2.id,
      venueId: auroraHall.id,
      date: new Date(in5Days.getFullYear(), in5Days.getMonth(), in5Days.getDate(), 19, 0),
      holdTtlMins: 10,
    },
  });
  const showC3 = await prisma.show.create({
    data: {
      eventId: concert3.id,
      venueId: auroraHall.id,
      date: new Date(in5Days.getFullYear(), in5Days.getMonth(), in5Days.getDate(), 21, 30),
      holdTtlMins: 10,
    },
  });
  console.log('✅ Shows created');

  // Create show prices (INR)
  const prices = [
    { showId: showM1a.id, category: 'Premium', price: 450.00 },
    { showId: showM1a.id, category: 'Standard', price: 250.00 },
    { showId: showM1b.id, category: 'Premium', price: 500.00 },
    { showId: showM1b.id, category: 'Standard', price: 300.00 },
    { showId: showM2.id, category: 'Premium', price: 450.00 },
    { showId: showM2.id, category: 'Standard', price: 280.00 },
    { showId: showM3.id, category: 'Premium', price: 400.00 },
    { showId: showM3.id, category: 'Standard', price: 220.00 },
    { showId: showC1.id, category: 'VIP', price: 2500.00 },
    { showId: showC1.id, category: 'Premium', price: 1500.00 },
    { showId: showC1.id, category: 'General', price: 800.00 },
    { showId: showC2.id, category: 'VIP', price: 1800.00 },
    { showId: showC2.id, category: 'Premium', price: 1100.00 },
    { showId: showC2.id, category: 'General', price: 600.00 },
    { showId: showC3.id, category: 'VIP', price: 3500.00 },
    { showId: showC3.id, category: 'Premium', price: 2000.00 },
    { showId: showC3.id, category: 'General', price: 1200.00 },
  ];

  await prisma.showPrice.createMany({
    data: prices,
  });
  console.log('✅ Show prices created');



  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });