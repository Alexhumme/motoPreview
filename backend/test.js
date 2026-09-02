const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accesorios = await prisma.accesorio.findMany();
  console.log('Accesorios encontrados:', accesorios.length);
  console.log(accesorios);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());