import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = "default_user_id";

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: "test@example.com",
      name: "Test User",
    },
  });

  console.log({ user });

  // Add some applications
  await prisma.application.createMany({
    data: [
      {
        userId,
        company: "Vercel",
        role: "Senior Frontend Engineer",
        location: "Remote",
        status: "Interviewing",
        applicationDate: new Date("2023-10-12"),
      },
      {
        userId,
        company: "Stripe",
        role: "Product Manager",
        location: "San Francisco, CA",
        status: "Applied",
        applicationDate: new Date("2023-10-10"),
      },
      {
        userId,
        company: "Linear",
        role: "Full Stack Developer",
        location: "Remote",
        status: "Offer",
        applicationDate: new Date("2023-10-08"),
      },
    ],
    skipDuplicates: true,
  });

  // Add some contacts
  await prisma.contact.createMany({
    data: [
      {
        userId,
        name: "Jane Smith",
        company: "Vercel",
        position: "Engineering Manager",
        relationshipStatus: "replied",
        lastContactedAt: new Date("2023-10-14"),
      },
      {
        userId,
        name: "John Doe",
        company: "Stripe",
        position: "Recruiter",
        relationshipStatus: "contacted",
        lastContactedAt: new Date("2023-10-11"),
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeding complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
