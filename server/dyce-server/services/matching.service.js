const { PrismaClient } = require("../generated/prisma/client.js");

const prisma = new PrismaClient();

async function findRandomMatch(userId) {
  const totalUsers = await prisma.user.count({
    where: {
      id: {
        not: userId,
      },
    },
  });

  if (totalUsers === 0) return null;

  const randomOffset = Math.floor(Math.random() * totalUsers);

  const randomUser = await prisma.user.findFirst({
    where: {
      id: {
        not: userId,
      },
    },
    skip: randomOffset,
  });

  return randomUser;
}

module.exports = {
  findRandomMatch,
};
