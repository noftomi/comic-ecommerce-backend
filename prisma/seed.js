const { getPrisma } = require('../src/lib/prisma')
const bcrypt = require('bcryptjs')

async function main() {
  const prisma = getPrisma()

  // Usuarios de prueba
  const users = [
    {
      email: 'admin@comics.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'Admin Comics',
      role: 'ADMIN',
    },
    {
      email: 'vendedor@comics.com',
      password: await bcrypt.hash('vendedor123', 10),
      name: 'Juan Vendedor',
      role: 'SELLER',
      cuil: '20123456789',
      country: 'Argentina',
      phone: '1155556666',
    },
    {
      email: 'cliente@comics.com',
      password: await bcrypt.hash('cliente123', 10),
      name: 'María Cliente',
      role: 'CLIENT',
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    })
  }
  console.log(`✓ ${users.length} usuarios creados`)

  // Cómics de prueba
  const comics = [
    {
      title: 'The Amazing Spider-Man #300',
      author: 'David Michelinie',
      description: 'La batalla final contra Venom en una edición de lujo.',
      price: 24.99,
      stock: 15,
      category: 'Marvel',
      language: 'Español',
      imageUrl: 'https://placehold.co/300x450/930000/FFFFFF?text=SPIDER-MAN',
    },
    {
      title: "Avengers: Earth's Mightiest",
      author: 'Kurt Busiek',
      description: 'Los héroes más poderosos se reúnen para detener a Kang.',
      price: 35.00,
      stock: 8,
      category: 'Marvel',
      language: 'Español',
      imageUrl: 'https://placehold.co/300x450/0C1E23/FFFFFF?text=AVENGERS',
    },
    {
      title: 'X-Men: Mutant Genesis',
      author: 'Chris Claremont',
      description: 'El renacimiento de la patrulla mutante por Jim Lee.',
      price: 19.99,
      stock: 20,
      category: 'Marvel',
      language: 'Español',
      imageUrl: 'https://placehold.co/300x450/705D00/FFFFFF?text=X-MEN',
    },
    {
      title: 'Daredevil: La Saga',
      author: 'Frank Miller',
      description: 'Matt Murdock y Elektra fundan el Puño para destruir a la Mano.',
      price: 200.00,
      stock: 5,
      category: 'Marvel',
      language: 'Español',
      imageUrl: 'https://placehold.co/300x450/1E1C10/FCD400?text=DAREDEVIL',
    },
    {
      title: 'Batman: Year One',
      author: 'Frank Miller',
      description: 'El origen del Caballero Oscuro por Frank Miller.',
      price: 22.50,
      stock: 12,
      category: 'DC',
      language: 'Español',
      imageUrl: 'https://placehold.co/300x450/1A1A2E/FFFFFF?text=BATMAN',
    },
    {
      title: 'Lobo: Último Czarniano',
      author: 'Alan Grant',
      description: 'El bounty hunter más peligroso del universo DC.',
      price: 180.00,
      stock: 3,
      category: 'DC',
      language: 'Español',
      imageUrl: 'https://placehold.co/300x450/930000/FFFFFF?text=LOBO',
    },
    {
      title: 'Watchmen',
      author: 'Alan Moore',
      description: 'La obra maestra de los superhéroes distópicos.',
      price: 45.00,
      stock: 10,
      category: 'DC',
      language: 'Español',
      imageUrl: 'https://placehold.co/300x450/1C1C1C/FFFF00?text=WATCHMEN',
    },
    {
      title: 'Saga Vol. 1',
      author: 'Brian K. Vaughan',
      description: 'Una épica intergaláctica sobre amor y supervivencia.',
      price: 18.00,
      stock: 25,
      category: 'Independiente',
      language: 'Español',
      imageUrl: 'https://placehold.co/300x450/2E4A3E/FFFFFF?text=SAGA',
    },
  ]

  const existingComics = await prisma.comic.count()
  if (existingComics === 0) {
    await prisma.comic.createMany({ data: comics })
    console.log(`✓ ${comics.length} cómics creados`)
  } else {
    console.log(`✓ Cómics ya existentes (${existingComics}), se omite`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
